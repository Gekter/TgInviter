import TelegramBotApi from 'node-telegram-bot-api'
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import readXlsxFile from 'read-excel-file/node'
import fs from 'fs';
const confname = './config.json'
let config = JSON.parse(fs.readFileSync(confname))


const bot = new TelegramBotApi(config.botToken, {polling: true})

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


start()
