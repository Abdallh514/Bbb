const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');

const TOKEN = '7813302624:AAFPSHI1NbKip6_is6WAW5YQnGHXBkEUp6E';
const ADMIN_ID = 6371768226;
const PASSWORD = '5140';

const bot = new TelegramBot(TOKEN, { polling: true });
let currentPID = null;
let authorizedUsers = new Set();

// /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `👋 مرحباً بك في البوت الخاص 🎯\nهذا بوت حصري لـعبد الودود فقط.\n\n🔐 الرجاء كتابة كلمة السر للمتابعة:`);
});

// التحقق من كلمة السر
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (chatId != ADMIN_ID) {
        bot.sendMessage(chatId, '🚫 هذا البوت خاص، لا يمكنك استخدامه.');
        return;
    }

    if (!authorizedUsers.has(chatId)) {
        if (msg.text === PASSWORD) {
            authorizedUsers.add(chatId);

            bot.sendMessage(chatId, `✅ تم قبولك! مرحباً بك عبد الودود 🥳`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🚀 تشغيل العملية', callback_data: 'run_command' }],
                        [{ text: '🛑 إيقاف العملية', callback_data: 'stop_command' }]
                    ]
                }
            });

        } else {
            bot.sendMessage(chatId, '❌ كلمة السر خاطئة، حاول مجدداً.');
        }
        return;
    }
});

// التعامل مع الأزرار
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!authorizedUsers.has(chatId)) {
        bot.sendMessage(chatId, '🚫 أنت غير مصرح لك.');
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    if (data === 'run_command') {
        // نطلب الموقع وعدد N1 و N2
        bot.sendMessage(chatId, '🌐 الرجاء كتابة الموقع:');
        bot.once('message', (msg1) => {
            const site = msg1.text;

            bot.sendMessage(chatId, '🔢 الرجاء كتابة العدد N1:');
            bot.once('message', (msg2) => {
                const N1 = msg2.text;

                bot.sendMessage(chatId, '🔢 الرجاء كتابة العدد N2:');
                bot.once('message', (msg3) => {
                    const N2 = msg3.text;

                    // الأمر مع المتغيرات
                    let commandTemplate = 'node /home/username/spurt/name.js (site) (N1) (N2)'; // ضع المسار الصحيح
                    let command = commandTemplate
                        .replace('(site)', site)
                        .replace('(N1)', N1)
                        .replace('(N2)', N2);

                    // تشغيل الأمر باستخدام spawn
                    const args = command.split(' ').slice(1); // كل شيء بعد node
                    const child = spawn('node', args, { shell: true });

                    currentPID = child.pid;

                    bot.sendMessage(chatId, `🚀 جاري تشغيل العملية...\nPID: ${currentPID}`);

                    child.stdout.on('data', (data) => {
                        bot.sendMessage(chatId, `✅ Output:\n${data.toString()}`);
                    });

                    child.stderr.on('data', (data) => {
                        bot.sendMessage(chatId, `⚠️ Stderr:\n${data.toString()}`);
                    });

                    child.on('close', (code) => {
                        bot.sendMessage(chatId, `🛑 انتهت العملية برمز خروج: ${code}`);
                        currentPID = null;
                    });
                });
            });
        });
    }

    if (data === 'stop_command') {
        if (currentPID) {
            treeKill(currentPID, 'SIGKILL', (err) => {
                if (err) bot.sendMessage(chatId, `❌ لم أتمكن من إيقاف العملية: ${err.message}`);
                else bot.sendMessage(chatId, `🛑 تم إيقاف العملية PID: ${currentPID}`);
                currentPID = null;
            });
        } else {
            bot.sendMessage(chatId, '⚠️ لا توجد عملية شغالة حالياً.');
        }
    }

    bot.answerCallbackQuery(callbackQuery.id);
});