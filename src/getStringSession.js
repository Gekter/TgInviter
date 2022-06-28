import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import  input  from "input";
import fs from 'fs';
let config = JSON.parse(fs.readFileSync('./config.json'))

async function login() {
  console.log("Loading interactive example...");
  const client = new TelegramClient(new StringSession(config.stringSession), config.apiId, config.apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  config.stringSession = client.session.save()
  fs.writeFile('./config.json', JSON.stringify(config), (err) => {
    if (err) {
      console.log(err)
    } else {
      console.log("stringSession are successfully saved");
    }
  });
  client.disconnect()
}
login()
