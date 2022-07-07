# TgInviter
1) установить node.js (https://nodejs.org/en/download/)
2) git clone https://github.com/Gekter/TgInviter.git
3) cd TgInviter
4) npm install
5) Получение apiId и apiHash:
   - Авторизоваться в Telegram по ссылке: https://my.telegram.org.
   - Перейти по ссылке ‘API development tools’ и заполнить форму.
   - Будут получены адреса и параметры api_id и api_hash, необходимые для авторизации пользователя.
6) Получение botToken:
   - Перейти в бота: @BotFather.
   - Нажать кнопку: START
   - Написать боту: /newbot.
   - Бот спросит вас как назвать нового бота. Придумайте и напишите .
   - Далее нужно ввести ник бота, что бы он заканчивался нa слово bot.
   - Далее @BotFather отправляет вам botToken
7) Переименовываем configEXAMPLE.json в config.json
8) Записываем apiId и apiHash полученные на 5 этапе, также записываем botToken полученный на 6 этапе
9) Добавляем свой никнейм телеграма в admins ("admins":["username"])
10) запускаем файл getStringSession.js, получаем stringSession и добавляем его в конфиг
11) Находим нашего бота в телеграме и пользуемся
