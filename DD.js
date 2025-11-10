const TelegramBot = require('node-telegram-bot-api');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');

// --- إعدادات البوت ---
const TOKEN = '7813302624:AAFPSHI1NbKip6_is6WAW5YQnGHXBkEUp6E';
const ADMIN_ID = 6371768226; // رقمك
const PASSWORD = '5140';      // كلمة السر
const ALLOWED_USERS = [6371768226]; // أضف أي ID تريد السماح له

const bot = new TelegramBot(TOKEN, { polling: true });

let currentPID = null;
let authorizedUsers = new Set();

// --- زر Admin لإضافة مستخدم جديد ---
const ADMIN_BUTTONS = [
    [{ text: '➕ إضافة مستخدم جديد', callback_data: 'add_user' }]
];

// --- /start ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, `👋 مرحباً بك في البوت الخاص 🎯
هذا بوت حصري فقط للأشخاص المصرح لهم.
🔐 الرجاء كتابة كلمة السر للمتابعة:`);
});

// --- التحقق من كلمة السر ---
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (!ALLOWED_USERS.includes(chatId)) {
        bot.sendMessage(chatId, '🚫 هذا البوت خاص، لا يمكنك استخدامه.');
        return;
    }

    if (!authorizedUsers.has(chatId)) {
        if (msg.text === PASSWORD) {
            authorizedUsers.add(chatId);

            bot.sendMessage(chatId, `✅ تم قبولك! مرحباً بك 🥳`, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🚀 تشغيل العملية', callback_data: 'run_command' }],
                        [{ text: '🛑 إيقاف العملية', callback_data: 'stop_command' }],
                        ...chatId === ADMIN_ID ? ADMIN_BUTTONS : [] // يظهر فقط للـ Admin
                    ]
                }
            });

        } else {
            bot.sendMessage(chatId, '❌ كلمة السر خاطئة، حاول مجدداً.');
        }
        return;
    }
});

// --- التعامل مع الأزرار ---
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (!authorizedUsers.has(chatId)) {
        bot.sendMessage(chatId, '🚫 أنت غير مصرح لك.');
        bot.answerCallbackQuery(callbackQuery.id);
        return;
    }

    // --- تشغيل العملية ---
    if (data === 'run_command') {
        bot.sendMessage(chatId, '🌐 الرجاء كتابة الموقع:');
        bot.once('message', (msg1) => {
            const site = msg1.text;

            bot.sendMessage(chatId, '🔢 الرجاء كتابة العدد N1:');
            bot.once('message', (msg2) => {
                const N1 = msg2.text;

                bot.sendMessage(chatId, '🔢 الرجاء كتابة العدد N2:');
                bot.once('message', (msg3) => {
                    const N2 = msg3.text;

                    // أمر التشغيل مع المتغيرات
                    let commandTemplate = 'node /home/username/spurt/name.js (site) (N1) (N2)'; // عدل المسار
                    let command = commandTemplate
                        .replace('(site)', site)
                        .replace('(N1)', N1)
                        .replace('(N2)', N2);

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

    // --- إيقاف العملية ---
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

    // --- إضافة مستخدم جديد (زر Admin) ---
    if (data === 'add_user') {
        if (chatId !== ADMIN_ID) {
            bot.sendMessage(chatId, '🚫 هذا الزر خاص بالمدير فقط.');
            bot.answerCallbackQuery(callbackQuery.id);
            return;
        }

        bot.sendMessage(chatId, '📝 أرسل الآن ID تيليجرام للشخص الجديد:');
        bot.once('message', (msg) => {
            const newId = parseInt(msg.text);
            if (!ALLOWED_USERS.includes(newId)) {
                ALLOWED_USERS.push(newId);
                bot.sendMessage(chatId, `✅ تم إضافة ${newId} لقائمة المصرح لهم.`);
            } else {
                bot.sendMessage(chatId, `⚠️ هذا ID موجود بالفعل.`);
            }
        });
    }

    bot.answerCallbackQuery(callbackQuery.id);
});