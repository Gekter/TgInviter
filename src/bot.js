import TelegramBotApi from 'node-telegram-bot-api'
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readXlsxFile from 'read-excel-file/node'
import fs from 'fs';
const confname = './config.json'
let config = JSON.parse(fs.readFileSync(confname))

let temp = {}

class Bot {
  constructor(config) {
    this.config = config
    this.bot = new TelegramBotApi(config.botToken, {polling: true})
    this.messages = {}
    this.eventEmitter = new TelegramBotApi.EventEmitter()
    this.client = new TelegramClient(new StringSession(config.stringSession), config.apiId, config.apiHash, {
      connectionRetries: 5,
    });
    
    
    this.listtenersInit()
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
  
  settings(id) {
    this.bot.sendMessage(id, 'Выберите что хотите изменить', {
      'reply_markup': {
        'keyboard': [
          ['apiId', 'apiHash', 'Канал'],
          ['Ограничение по приглашениям', 'Добавить админа', 'Сообщение для рассылки'],
          ['Текущая конфигурация'],
          ['Назад']
        ]
      }
    })
  }

  changeConfig(key, value) {

  }

  setHandler() {


    eventEmitter.on('')
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

    this.bot.onText(/Настройки/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return

      this.settings(msg.from.id)
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

    this.bot.onText(/Назад/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return

      this.showMainMenu(msg.from.id)
    })

    this.bot.onText(/Текущая конфигурация/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return
      let cfg = Object.entries(this.config)
      let text = []
      cfg.forEach((each) => {
        each[0] = '<b><i>' + each[0] + '</i></b>:'
        text.push(each.join(' '))
      })
      
      this.bot.sendMessage(msg.from.id, text.join('\n\n'), {parse_mode: 'HTML'})
    })

    

    this.bot.onText(/apiId/, msg => {
      if (!this.checkAccess(msg.from.id, msg.from.username)) return
      
      this.bot.sendMessage(msg.from.id, 'sdf')
      // fs.writeFile(confname, JSON.stringify(config), (err) => { if (err) {console.log(err)}});
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

    this.bot.on('message', msg => {
      this.messages[msg.from.id] = msg.text
    })
  }



}


const start = () => {
  function checkAccess(id, username) {
    if (!config.admins.includes(username)) {
      bot.sendMessage(id, `Нет доступа\nдля получения доступа попросите админа дать доступ своему - ${username}`)
      return false
    }
    return true
  }

  function settings(id) {
    bot.sendMessage(id, 'Выберите что хотите изменить', {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{text: 'apiId', callback_data: 'apiId'}],
          [{text: 'apiHash', callback_data: 'apiHash'}],
          [{text: 'Канал', callback_data: 'channel'}],
          [{text: 'Ограничение по приглашениям', callback_data: 'invCap'}],
          [{text: 'Добавить админа', callback_data: 'addAdmin'}],
        ]
      })
    })
  }

  bot.on('message', msg => {
    temp[msg.from.id] = {"message": msg.text, "confirm": false}
  })

  bot.onText(/\/start/, msg => {
    if (!checkAccess(msg.from.id, msg.from.username)) return
    
    if (config.stringSession == '') {
      return bot.sendMessage(msg.from.id, `Пожалуйста запустите getStringSession.js и заполните в config.js stringSession`)
    }
    return bot.sendMessage(msg.from.id, `Привет!`)
  })
  
  bot.setMyCommands([
    {command: '/start', description: 'Начальное приветствие'},
    {command: '/invite', description: 'Разослать приглашения'},
    {command: '/settings', description: 'Настройки'},
  ])
  
  bot.on('document', msg => {
    if (!checkAccess(msg.from.id, msg.from.username)) return

    if (msg.document.mime_type != 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return bot.sendMessage(msg.from.id, 'Данный файл не является excel')
    }
    const path = './'
    let phoneNumbers = []

    bot.downloadFile(msg.document.file_id, path).then((fileName) => {
      readXlsxFile(path + fileName).then((rows) => {

        for(let row of rows) {
          let phoneNumber = row[0].toString()
          if (phoneNumber[0] == '+') phoneNumber = '+' + phoneNumber
          if (phoneNumber[1] != '8') phoneNumber = '+7' + phoneNumber.substring(1, row[0].length)
          phoneNumbers.push(phoneNumber)
        }
        
        fs.writeFile(path + config.phoneNumbersFileName, JSON.stringify(phoneNumbers), (err) => {
          if (err) {
            throw err
          }
        });

        fs.unlink(path + fileName, (err) => {
          if (err) {
            throw err
          }
        })

        return bot.sendMessage(msg.from.id, 'Файл успешно загружен')
      }).catch(() => {
        return bot.sendMessage(msg.from.id, 'Не удалось загрузить файл')
      })
    })
  })

  bot.onText(/\/invite/, msg => {
    if (!checkAccess(msg.from.id, msg.from.username)) return
    
    let phoneNumbers
    try {
      phoneNumbers = JSON.parse(fs.readFileSync('./' + config.phoneNumbersFileName))
    } catch {
      return bot.sendMessage(msg.from.id, 'Сначала загрузите excel с номерами телефонов')
    }

    (async () => {
      const client = new TelegramClient(new StringSession(config.stringSession), config.apiId, config.apiHash, {
        connectionRetries: 5,
      });
      
      await client.connect();
      
      if (phoneNumbers.length > config.inviteCap) {
        phoneNumbers = phoneNumbers.slice(config.invitedCount, config.inviteCap)
        config.invitedCount += config.inviteCap
        fs.writeFile(confname, JSON.stringify(config), (err) => {
          if (err) {
            console.log(err)
          }
        });
      }

      await client.invoke(
        new Api.channels.InviteToChannel({
          channel: config.channel,
          users: phoneNumbers,
        })
      );
      
      await bot.sendMessage(msg.from.id, `Отправлено ${phoneNumbers.length} приглашений`)
    })();
  })

  bot.onText(/\/settings/, msg => {
    settings(msg.from.id)
  })

  bot.onText(/\/settings/, msg => {
    settings(msg.from.id)
  })

  
  bot.on('callback_query', msg => {
    let message = "Введите "
    const confirm = {
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{text: 'Да', callback_data: 'yes'}, {text: 'Нет', callback_data: 'no'}]
        ]
      })
    }

    switch (msg.data) {
      case 'apiId':
        bot.sendMessage(msg.from.id, message + 'apiId').then(() => {
          bot.on('message', msg => {
            let text = +msg.text
            bot.sendMessage(msg.from.id, `Заменить apiId: ${config.apiId} на ${text}`, confirm).then(() => {
              bot.on('callback_query', msg => {
                if (msg.data == 'yes') {
                  config.apiId = text
                  fs.writeFile(confname, JSON.stringify(config), (err) => {
                    if (err) {
                      throw err
                    }
                  });
                  bot.sendMessage(msg.from.id, 'Изменения сохранены').then(() => {
                    settings(msg.from.id)
                  })
                } else {
                  settings(msg.from.id)
                }
              })
            })
          })
        })
        break
      case 'apiHash':
        bot.sendMessage(msg.from.id, message + 'apiHash').then(() => {
          bot.on('message', msg => {
            let text = msg.text
            bot.sendMessage(msg.from.id, `Заменить apiHash: ${config.apiHash} на ${text}`, confirm).then(() => {
              bot.on('callback_query', msg => {
                if (msg.data == 'yes') {
                  config.apiHash = text
                  fs.writeFile(confname, JSON.stringify(config), (err) => {
                    if (err) {
                      throw err
                    }
                  });
                  bot.sendMessage(msg.from.id, 'Изменения сохранены').then(() => {
                    settings(msg.from.id)
                  })
                } else {
                  settings(msg.from.id)
                }
              })
              
            })
          })
        })
        break
      case 'channel':
        bot.sendMessage(msg.from.id, message + 'ссылку на канал формата - (t.me/channelName)').then(() => {
          bot.on('message', msg => {
            let text = msg.text.slice(5, msg.text.length)
            bot.sendMessage(msg.from.id, `Заменить канал: ${config.channel} на ${text}`, confirm).then(() => {
              bot.on('callback_query', msg => {
                if (msg.data == 'yes') {
                  config.channel = text
                  fs.writeFile(confname, JSON.stringify(config), (err) => {
                    if (err) {
                      throw err
                    }
                  });
                  bot.sendMessage(msg.from.id, 'Изменения сохранены').then(() => {
                    settings(msg.from.id)
                  })
                } else {
                  settings(msg.from.id)
                }
              })
            })
          })
        })
        break
      case 'invCap':
        bot.sendMessage(msg.from.id, message + 'ограничение по приглашениям').then(() => {
          bot.on('message', msg => {
            let text = +msg.text
            bot.sendMessage(msg.from.id, `Заменить ограничение по приглашениям: ${config.inviteCap} на ${text}`, confirm).then(() => {
              bot.on('callback_query', msg => {
                if (msg.data == 'yes') {
                  config.inviteCap = text
                  fs.writeFile(confname, JSON.stringify(config), (err) => {
                    if (err) {
                      throw err
                    }
                  });
                  bot.sendMessage(msg.from.id, 'Изменения сохранены').then(() => {
                    settings(msg.from.id)
                  })
                } else {
                  settings(msg.from.id)
                }
              })
            })
          })
        })
        break
      case 'addAdmin':
        bot.sendMessage(msg.from.id, message + '@username').then(() => {
          bot.on('message', msg => {
            let text = msg.text
            if (text[0] == '@') text = text.slice(1, text.length)
            bot.sendMessage(msg.from.id, `Добавить в админы ${text}?`, confirm).then(() => {
              bot.on('callback_query', msg => {
                if (msg.data == 'yes') {
                  config.admins.push(text)
                  fs.writeFile(confname, JSON.stringify(config), (err) => {
                    if (err) {
                      throw err
                    }
                  });
                  bot.sendMessage(msg.from.id, 'Изменения сохранены').then(() => {
                    settings(msg.from.id)
                  })
                } else {
                  settings(msg.from.id)
                }
              })
            })
          })
        })
        break  
    }
  })
}


const boter = new Bot(config);
