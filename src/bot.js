import TelegramBotApi from 'node-telegram-bot-api'
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readXlsxFile from 'read-excel-file/node'
import fs from 'fs';
const confname = './config.json'
let config = JSON.parse(fs.readFileSync(confname))



class Bot {
  constructor(config) {
    this.config = config
    this.bot = new TelegramBotApi(config.botToken, {polling: true})
    this.messages = {}
    this.client = new TelegramClient(new StringSession(config.stringSession), config.apiId, config.apiHash, {
      connectionRetries: 5,
    });

    
    
    this.listtenersInit()
  }

  async waitMessage(id) {
    const oldmes = this.messages[id]
    
    function wait() {
      console.log(this.messages[id])
      if (oldmes == this.messages[id]) {
        setTimeout(wait, 50)
      } else {
        return this.messages[id]
      }
    }
    let d = wait.call(this)
    console.log(d)
  }

  checkAccess(id, username) {
    if (!config.admins.includes(username)) {
      this.bot.sendMessage(id, `Нет доступа\nдля получения доступа попросите админа дать доступ своему - ${username}`)
      return false
    }
    return true
  }

  showMainMenu(id) {
    this.bot.sendMessage(id, 'Главное меню', {
      'reply_markup': {
        'keyboard': [
          ['Разослать сообщение'],
          ['Разослать приглашения'],
          ['Настройки']
        ]
      }
    })
  }
  




  async deleteContacts(ids) {
    await this.client.connect();

    this.client.invoke(
      new Api.contacts.DeleteContacts({
        id: ids,
      })
    );
  }

  async invite(clientid, ids) {

    
    await this.client.connect();
    
    if (ids.length > this.config.inviteCap) {
      ids = ids.slice(this.config.invitedCount, this.config.inviteCap)
      this.config.invitedCount += this.config.inviteCap
      
    } else {
      this.config.invitedCount += ids.length
    }
    fs.writeFile(confname, JSON.stringify(this.config), (err) => {
      if (err) {
        console.log(err)
      }
    });

    await this.client.invoke(
      new Api.channels.InviteToChannel({
        channel: this.config.channel,
        users: ids,
      })
    );

    this.deleteContacts(ids)
    
    await this.bot.sendMessage(clientid, `Отправлено ${ids.length} приглашений`)
  }

  async send(clientid, ids) {
    await this.client.connect();
    if (ids.length > this.config.inviteCap) {
      ids = ids.slice(this.config.invitedCount, this.config.inviteCap)
      this.config.invitedCount += this.config.inviteCap
      
    }  else {
      this.config.invitedCount += ids.length
    }

    fs.writeFile(confname, JSON.stringify(this.config), (err) => {
      if (err) {
        console.log(err)
      }
    });

    ids.forEach(async (id) => {
      await this.client.invoke(
        new Api.messages.SendMessage({
          peer: id,
          message: this.config.message,
          randomId: BigInt(Math.floor(Math.random() * 100000000)),
          noWebpage: true,
        })
      );
    })
    
    this.deleteContacts(ids)
    await this.bot.sendMessage(clientid, `Отправлено ${ids.length} приглашений`)
  }

  async getIds(phoneNumbers) {
    
    let contacts = []
    phoneNumbers.forEach((phone) => {
      contacts.push(
        new Api.InputPhoneContact({
          clientId: +phone,
          phone: phone,
          firstName: phone,
          lastName: "",
        })
      )
    })
    
    await this.client.connect();
   

    const res = await this.client.invoke(
      new Api.contacts.ImportContacts({
        contacts: contacts,
      })
    );


    let ids = []
    res.users.forEach((item) => {
      ids.push(Number(item.id.value))
    })

    return ids
    
  }

  listtenersInit() {
    this.bot.onText(/\/start/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return
      
      if (config.stringSession == '') {
        return this.bot.sendMessage(msg.from.id, `Пожалуйста запустите getStringSession.js и заполните в config.js stringSession`)
      }
      this.showMainMenu(msg.from.id)
    })

    

    this.bot.onText(/Разослать приглашения/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return

      try {
        let ids = JSON.parse(fs.readFileSync('./' + config.idsFileName))
        this.invite(msg.from.id, ids)
      } catch {
        return this.bot.sendMessage(clientid, 'Сначала загрузите excel с номерами телефонов')
      }
      
    })

    this.bot.onText(/Разослать сообщение/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return

      try {
        let ids = JSON.parse(fs.readFileSync('./ids.json'))
        this.send(msg.from.id, ids)
      } catch {
        this.bot.sendMessage(msg.from.id, 'Сначала загрузите excel с номерами телефонов')
      }
    })

    


    this.bot.on('document', async msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return
  
      if (msg.document.mime_type != 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return bot.sendMessage(msg.from.id, 'Данный файл не является excel')
      }
      const path = './'
      let phoneNumbers = []
  
      let filename = await this.bot.downloadFile(msg.document.file_id, path)
      try {
        let rows = await readXlsxFile(path + filename)
        for(let row of rows) {
          let phoneNumber = row[0].toString()
          if (phoneNumber[0] == '+') phoneNumber = '+' + phoneNumber
          if (phoneNumber[1] != '8') phoneNumber = '+7' + phoneNumber.substring(1, row[0].length)
          phoneNumbers.push(phoneNumber)
        }

        let ids = await this.getIds(phoneNumbers)
        
        await Promise.all([
          fs.writeFile(path + this.config.idsFileName, JSON.stringify(ids), (err) => { if (err) { throw err } }),
          fs.unlink(path + filename, (err) => { if (err) { throw err } })
        ])

        return this.bot.sendMessage(msg.from.id, 'Файл успешно загружен')
      } catch (err) {
        console.log(err)
        return this.bot.sendMessage(msg.from.id, 'Не удалось загрузить файл')
      }
      
    })

    
  }



}




const boter = new Bot(config);
