const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const qrcode = require('qrcode');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Хранит текущий QR-код для отображения в браузере
let currentQR = null;
let isReady = false;

// Страница для сканирования QR
app.get('/', async (req, res) => {
  if (isReady) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h1 style="color:green">✅ Бот работает!</h1>
        <p>WhatsApp подключён и принимает сообщения.</p>
      </body></html>
    `);
  }
  if (!currentQR) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h1>⏳ Подождите...</h1>
        <p>QR-код ещё генерируется. Обновите страницу через 10 секунд.</p>
        <script>setTimeout(()=>location.reload(), 5000)</script>
      </body></html>
    `);
  }
  const qrImage = await qrcode.toDataURL(currentQR);
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h1>📱 Отсканируй QR-код</h1>
      <p>WhatsApp → Настройки → Связанные устройства → Привязать устройство</p>
      <img src="${qrImage}" style="width:300px;height:300px"/>
      <p style="color:gray">Страница обновится автоматически после сканирования</p>
      <script>setTimeout(()=>location.reload(), 30000)</script>
    </body></html>
  `);
});

app.listen(PORT, () => console.log(`🌐 Веб-сервер запущен на порту ${PORT}`));

// ─── Gemini ────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const chatHistories = new Map();
const MAX_HISTORY = 20;

const SYSTEM_PROMPT = `Ты — виртуальный консультант по пенсионным аннуитетам.
Отвечай только на вопросы по теме пенсионных аннуитетов в Казахстане.
Если вопрос не по теме — вежливо перенаправь.
Общайся на языке клиента (русский или казахский).
Не используй Markdown-разметку.`;

// ─── WhatsApp ──────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  },
});

client.on('qr', (qr) => {
  currentQR = qr;
  isReady = false;
  console.log('📱 QR-код обновлён — открой сайт бота и отсканируй');
});

client.on('ready', () => {
  isReady = true;
  currentQR = null;
  console.log('✅ Бот готов к работе!');
});

client.on('auth_failure', () => console.error('❌ Ошибка авторизации'));
client.on('disconnected', () => {
  isReady = false;
  console.log('⚠️ Бот отключён');
});

client.on('message', async (message) => {
  if (message.fromMe || message.isStatus) return;
  if (message.from.endsWith('@g.us')) return;

  const userId = message.from;
  const userText = message.body.trim();

  if (!userText) return;

  if (userText.toLowerCase() === '/reset') {
    chatHistories.delete(userId);
    await message.reply('🔄 История очищена!');
    return;
  }

  const chat = await message.getChat();
  await chat.sendStateTyping();

  try {
    if (!chatHistories.has(userId)) chatHistories.set(userId, []);
    const history = chatHistories.get(userId);

    history.push({ role: 'user', parts: [{ text: userText }] });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    const geminiChat = model.startChat({
      history: history.slice(0, -1),
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await geminiChat.sendMessage(userText);
    const responseText = result.response.text();

    history.push({ role: 'model', parts: [{ text: responseText }] });

    await message.reply(responseText);
    console.log(`✉️ ${userId}: ${userText.substring(0, 50)}`);
  } catch (error) {
    console.error('Ошибка:', error.message);
    await message.reply('Произошла ошибка, попробуйте ещё раз.');
  }
});

client.initialize();
