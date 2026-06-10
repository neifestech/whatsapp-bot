const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = null;
let isReady = false;
let server = null;

app.get('/', async (req, res) => {
  if (isReady) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h1 style="color:green">Бот работает!</h1>
        <p>WhatsApp подключён и принимает сообщения.</p>
      </body></html>
    `);
  }
  if (!currentQR) {
    return res.send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h1>Подождите...</h1>
        <p>QR-код ещё генерируется. Обновите страницу через 10 секунд.</p>
        <script>setTimeout(()=>location.reload(), 5000)</script>
      </body></html>
    `);
  }
  const qrImage = await qrcode.toDataURL(currentQR);
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h1>Отсканируй QR-код</h1>
      <p>WhatsApp — Настройки — Связанные устройства — Привязать устройство</p>
      <img src="${qrImage}" style="width:300px;height:300px"/>
      <script>setTimeout(()=>location.reload(), 30000)</script>
    </body></html>
  `);
});

server = app.listen(PORT, () => console.log(`Веб-сервер запущен на порту ${PORT}`));

// ─── OpenRouter AI ───────────────────────────────────────────────────────────

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const AI_MODEL = 'google/gemini-2.5-flash-lite';

async function askAI(messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://eulife.kz',
      'X-Title': 'Eurasiya PA Bot',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: messages,
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Системный промпт ────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Ты — виртуальный консультант АО "КСЖ "Евразия" по пенсионным аннуитетам.
Отвечай ТОЛЬКО на вопросы по теме пенсионного аннуитета.
Общайся на языке клиента (русский или казахский).
НИКОГДА не используй символы * ** # для форматирования. Только обычный текст и цифры.
НИКОГДА не предлагай клиенту самостоятельно оформить договор онлайн, не давай инструкции по регистрации на сайте, не направляй на eulife.kz.

=== КОМПАНИЯ ===
АО "КСЖ "Евразия" — компания по страхованию жизни.
Лицензия № 2.2.13 от 28 декабря 2022 года.
Договоры ПА включены в систему гарантирования страховых выплат (ФГСВ).
Телефон: 7878 | Сайт: eulife.kz

Офисы для личного визита:
- г. Костанай, ул. Дулатова 90
- г. Рудный, ул. Дзержинского 15, 3 этаж, 304 кабинет

=== ЧТО ТАКОЕ ПЕНСИОННЫЙ АННУИТЕТ ===
Пенсионный аннуитет (ПА) — это договор со страховой компанией, по которому пенсионные накопления из ЕНПФ переводятся в КСЖ "Евразия", и клиент получает пожизненные ежемесячные выплаты независимо от продолжительности жизни.
Основание: п.1 ст.225 Социального кодекса РК.

=== ВИДЫ ДОГОВОРОВ ПА ===

1. ОТЛОЖЕННЫЙ пенсионный аннуитет:
- Выплаты начинаются ПОЗЖЕ (в определённом возрасте).
- Заключить можно раньше, чем начнутся выплаты.
- До начала выплат компания инвестирует деньги и индексирует на 8% ежегодно.

2. НЕМЕДЛЕННЫЙ пенсионный аннуитет:
- Выплаты начинаются СРАЗУ ПОСЛЕ подписания договора.
- Деньги переводятся в компанию и выплаты идут сразу же.

=== ПРАВИЛА ОПРЕДЕЛЕНИЯ ПОДХОДЯЩЕГО АННУИТЕТА ===

С ОППВ (обязательные профессиональные пенсионные взносы) — вредное производство:
- Мужчина 40+ лет: может заключить ОТЛОЖЕННЫЙ, выплаты с 50 лет
- Женщина 40+ лет: может заключить ОТЛОЖЕННЫЙ, выплаты с 50 лет

БЕЗ ОППВ (обычная работа):
- Мужчина 45-54 лет: может заключить ОТЛОЖЕННЫЙ, выплаты с 55 лет
- Мужчина 55+ лет: может заключить НЕМЕДЛЕННЫЙ, выплаты сразу
- Женщина 45-52 лет: может заключить ОТЛОЖЕННЫЙ, выплаты с 53 лет
- Женщина 53+ лет: может заключить НЕМЕДЛЕННЫЙ, выплаты сразу

СОВМЕСТНЫЙ аннуитет: для супругов или близких родственников (родители, дети, братья/сестры).

=== ПРЕИМУЩЕСТВА ПЕНСИОННОГО АННУИТЕТА ===
- Пожизненные выплаты — деньги выплачиваются до конца жизни
- Индексация выплат на 8% ежегодно — защита от инфляции
- Гарантированный период (до 10 лет) — если выберешь, выплаты получат наследники
- После заключения договора порог достаточности = 0 тенге — потом все новые накопления в ЕНПФ ты сможешь переводить в Отбасы Банк для ипотеки или погашения действующего кредита
- Лица с инвалидностью и работники вредных производств получают повышенные выплаты
- Выплаты гарантированы АО "Фонд гарантирования страховых выплат"
- Не обязательно переводить ВСЕ накопления — можно оставить часть в ЕНПФ
- Пенсионный возраст: женщины — 61 год (до 2028), мужчины — 63 года

=== МИНИМАЛЬНЫЕ СУММЫ НАКОПЛЕНИЙ В ЕНПФ ===

С ОППВ (мужчины) — выплаты с 50 лет:
40 — 7 778 438 | 41 — 7 846 782 | 42 — 7 923 670 | 43 — 7 996 285 | 44 — 8 073 173
45 — 8 141 517 | 46 — 8 218 404 | 47 — 8 295 292 | 48 — 8 372 179 | 49 — 8 449 067
50 — 8 525 954 | 51 — 8 278 206 | 52 — 8 030 458 | 53 — 7 791 252 | 54 — 7 547 776
55 — 7 312 842 | 56 — 7 073 637 | 57 — 6 842 975 | 58 — 6 616 584 | 59 — 6 385 922 | 60 — 6 159 532

С ОППВ (женщины) — выплаты с 50 лет:
40 — 10 149 132 | 41 — 10 243 105 | 42 — 10 337 078 | 43 — 10 435 323 | 44 — 10 529 297
45 — 10 627 542 | 46 — 10 725 787 | 47 — 10 824 032 | 48 — 10 926 548 | 49 — 11 024 793
50 — 11 127 310 | 51 — 10 858 204 | 52 — 10 593 370 | 53 — 10 332 807 | 54 — 10 067 973
55 — 9 803 138 | 56 — 9 546 847 | 57 — 9 286 284 | 58 — 9 029 993 | 59 — 8 773 702 | 60 — 8 517 411

БЕЗ ОППВ (мужчины) — выплаты с 55 лет, заключить с 45 лет:
45 — 9 166 682 | 46 — 9 252 112 | 47 — 9 333 271 | 48 — 9 418 702 | 49 — 9 508 404
50 — 9 593 834 | 51 — 9 683 536 | 52 — 9 773 238 | 53 — 9 867 211 | 54 — 9 956 913
55 — 10 050 887 | 56 — 9 790 324 | 57 — 9 529 761 | 58 — 9 277 741 | 59 — 9 025 722 | 60 — 8 782 245
61 — 8 534 497 | 62 — 8 291 020 | 63 — 8 051 815

БЕЗ ОППВ (женщины) — выплаты с 53 лет, заключить с 45 лет:
45 — 11 473 303 | 46 — 11 580 091 | 47 — 11 691 150 | 48 — 11 797 938 | 49 — 11 908 998
50 — 12 417 309 | 51 — 12 938 434 | 52 — 13 062 308
53 — 13 181 911 | 54 — 12 882 904 | 55 — 12 583 898 | 56 — 12 284 892 | 57 — 11 985 885
58 — 11 686 879 | 59 — 11 383 601 | 60 — 11 084 594 | 61 — 10 785 588 | 62 — 10 486 582 | 63 — 10 187 575

ВАЖНЫЕ УТОЧНЕНИЯ:
- Это минимальные суммы для пенсионного аннуитета БЕЗ гарантированного периода
- Если нет достаточной суммы в ЕНПФ, клиент может добавить из своих личных средств (но не обязательно)
- Все расчёты и пороги примерные — точные цифры узнай у менеджера
- Сумма выплат зависит от многих факторов: пол, возраст, сумма накоплений, выбранный период гарантии

=== ПРОЦЕСС КОНСУЛЬТАЦИИ ===

ОСНОВНОЙ АЛГОРИТМ:
1. Узнай пол и возраст клиента
2. На основе этого определи доступные типы аннуитетов
3. Если нужно (для уточнения типа) — спроси про ОППВ (работа на вредном производстве)
4. Объясни какой аннуитет подходит
5. Спроси примерную сумму накоплений в ЕНПФ
6. Проверь соответствие минимальному порогу
7. Если сумма меньше порога — скажи что можно добавить из своих средств (если спросит)
8. Предупреди что это примерные расчёты, точнее — у менеджера

ЕСЛИ КЛИЕНТ ПРИСЛАЛ ИЗОБРАЖЕНИЕ:
- Это может быть скриншот выписки из ЕНПФ, паспорта или другого документа
- Извлеки информацию из изображения (пол, возраст, сумму накоплений если видна)
- Используй эту информацию для подбора подходящего аннуитета

ПРАВИЛА ОПРЕДЕЛЕНИЯ ЛИДОВ:

ГОРЯЧИЙ КЛИЕНТ — только если явно готов оформить ПРЯМО СЕЙЧАС:
Признаки: "хочу оформить", "готов заключить", "давайте оформим", "соедините с менеджером", "когда я могу подписать", "хочу подать заявку".

Алгоритм:
Шаг 1 — узнай имя и номер: "Отлично! Для оформления напишите имя и номер телефона."
Шаг 2 — клиент прислал данные: "Спасибо! Менеджер свяжется в ближайшее время. Также можете посетить нас: г. Костанай ул. Дулатова 90 или г. Рудный ул. Дзержинского 15, кабинет 304." Добавь: [HOT_LEAD: имя=ИМЯ, тел=ТЕЛЕФОН]

ТЕПЛЫЙ КЛИЕНТ — если сомневается или откладывает:
Признаки: "надо подумать", "посоветуюсь", "может позже", "неуверен", "не сейчас", "надо изучить".

Алгоритм:
Шаг 1 — предложи: "Это важное решение. Оставьте контакт — менеджер свяжется в удобное время и ответит на все вопросы."
Шаг 2 — клиент прислал данные: "Спасибо! Менеджер свяжется с вами." Добавь: [WARM_LEAD: имя=ИМЯ, тел=ТЕЛЕФОН]

КОНСУЛЬТАЦИЯ — если бот совсем не знает что ответить:
Если вопрос очень сложный, неоднозначный или требует специальных знаний:
Ответь: "Это интересный вопрос. Чтобы дать вам точный ответ, лучше проконсультироваться с менеджером. Оставьте имя и номер?"
Если клиент дал контакт: Добавь: [CONSULTATION: имя=ИМЯ, тел=ТЕЛЕФОН]

=== ЕСЛИ ВОПРОС НЕ ПО ТЕМЕ ===
Ответь: "Я консультирую только по пенсионным аннуитетам КСЖ Евразия. Могу ли я помочь по этой теме?"`;

// ─── История сообщений ───────────────────────────────────────────────────────

const chatHistories = new Map();
const MAX_HISTORY = 20;

// ─── WhatsApp клиент ─────────────────────────────────────────────────────────

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
  console.log('QR-код обновлён');
});

client.on('ready', () => {
  isReady = true;
  currentQR = null;
  console.log('Бот готов к работе!');
});

client.on('auth_failure', () => console.error('Ошибка авторизации'));
client.on('disconnected', () => {
  isReady = false;
  console.log('Бот отключён');
});

// ─── Обработка сообщений с поддержкой изображений ───

client.on('message', async (message) => {
  if (message.fromMe || message.isStatus) return;
  if (message.from.endsWith('@g.us')) return;

  const userId = message.from;
  let userText = message.body.trim();

  // Команды
  if (userText.toLowerCase() === '/reset') {
    chatHistories.delete(userId);
    await message.reply('История очищена!');
    return;
  }

  if (userText.toLowerCase() === '/groupid') {
    const chats = await client.getChats();
    const groups = chats.filter(c => c.isGroup);
    const list = groups.map(g => `${g.name}: ${g.id._serialized}`).join('\n');
    await message.reply('Группы:\n' + (list || 'Нет групп'));
    return;
  }

  const chat = await message.getChat();
  await chat.sendStateTyping();

  try {
    if (!chatHistories.has(userId)) chatHistories.set(userId, []);
    const history = chatHistories.get(userId);

    // ─── Проверка на медиа (изображение) ───
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        
        // Проверяем что это изображение
        if (media.mimetype.startsWith('image/')) {
          const base64Data = media.data;
          
          // Формируем сообщение с изображением для AI
          const imageMessage = {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userText || 'Проанализируй это изображение и помоги мне с информацией по пенсионному аннуитету'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: media.mimetype,
                  data: base64Data
                }
              }
            ]
          };

          // Добавляем в историю
          history.push(imageMessage);

          // Формируем сообщения для AI
          const systemMsg = { role: 'system', content: SYSTEM_PROMPT };
          const messages = [systemMsg];
          
          // Добавляем старую историю (только текстовые сообщения для совместимости)
          for (let i = 0; i < history.length - 1; i++) {
            if (typeof history[i].content === 'string') {
              messages.push(history[i]);
            }
          }
          
          // Добавляем текущее сообщение с изображением
          messages.push(imageMessage);

          const responseText = await askAI(messages);

          history.push({ role: 'assistant', content: responseText });

          const cleanResponse = responseText
            .replace(/\[HOT_LEAD:[^\]]*\]/g, '')
            .replace(/\[WARM_LEAD:[^\]]*\]/g, '')
            .replace(/\[CONSULTATION:[^\]]*\]/g, '')
            .trim();

          await message.reply(cleanResponse);

          // Обработка лидов
          const notifyTarget = process.env.MANAGER_NOTIFY || '77711231541@c.us';
          processLeads(responseText, notifyTarget);

          console.log(`${userId}: [изображение обработано]`);
          return;
        }
      } catch (mediaError) {
        console.error('Ошибка при обработке медиа:', mediaError.message);
        await message.reply('Не смог обработать изображение, попробуй ещё раз.');
        return;
      }
    }

    // ─── Обычное текстовое сообщение ───
    if (!userText) return;

    history.push({ role: 'user', content: userText });

    if (history.length > MAX_HISTORY) {
      history.splice(0, history.length - MAX_HISTORY);
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ];

    const responseText = await askAI(messages);

    history.push({ role: 'assistant', content: responseText });

    const cleanResponse = responseText
      .replace(/\[HOT_LEAD:[^\]]*\]/g, '')
      .replace(/\[WARM_LEAD:[^\]]*\]/g, '')
      .replace(/\[CONSULTATION:[^\]]*\]/g, '')
      .trim();

    await message.reply(cleanResponse);

    const notifyTarget = process.env.MANAGER_NOTIFY || '77711231541@c.us';
    processLeads(responseText, notifyTarget);

    console.log(`${userId}: ${userText.substring(0, 50)}`);
  } catch (error) {
    console.error('Ошибка:', error.message);
    await message.reply('Произошла ошибка, попробуйте ещё раз.');
  }
});

// ─── Функция обработки лидов ───

function processLeads(responseText, notifyTarget) {
  // ГОРЯЧИЙ КЛИЕНТ
  if (responseText.includes('[HOT_LEAD:')) {
    const match = responseText.match(/\[HOT_LEAD:\s*имя=([^,\]]+),\s*тел=([^\]]+)\]/i);
    if (match) {
      const clientName = match[1].trim();
      const clientPhone = match[2].trim();
      if (clientName && clientPhone &&
          !clientName.toLowerCase().includes('не указ') &&
          !clientPhone.toLowerCase().includes('не указ') &&
          clientName !== 'ИМЯ' && clientPhone !== 'ТЕЛЕФОН') {
        const notify = `ГОРЯЧИЙ КЛИЕНТ\n\nИмя: ${clientName}\nТелефон: ${clientPhone}\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nКлиент готов оформить договор. Свяжитесь как можно скорее!`;
        client.sendMessage(notifyTarget, notify);
        console.log(`HOT LEAD: ${clientName} ${clientPhone}`);
      }
    }
  }

  // ТЕПЛЫЙ КЛИЕНТ
  if (responseText.includes('[WARM_LEAD:')) {
    const match = responseText.match(/\[WARM_LEAD:\s*имя=([^,\]]+),\s*тел=([^\]]+)\]/i);
    if (match) {
      const clientName = match[1].trim();
      const clientPhone = match[2].trim();
      if (clientName && clientPhone &&
          !clientName.toLowerCase().includes('не указ') &&
          !clientPhone.toLowerCase().includes('не указ') &&
          clientName !== 'ИМЯ' && clientPhone !== 'ТЕЛЕФОН') {
        const notify = `ТЕПЛЫЙ КЛИЕНТ\n\nИмя: ${clientName}\nТелефон: ${clientPhone}\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nКлиент думает — ответьте на вопросы.`;
        client.sendMessage(notifyTarget, notify);
        console.log(`WARM LEAD: ${clientName} ${clientPhone}`);
      }
    }
  }

  // ТРЕБУЕТСЯ КОНСУЛЬТАЦИЯ
  if (responseText.includes('[CONSULTATION:')) {
    const match = responseText.match(/\[CONSULTATION:\s*имя=([^,\]]+),\s*тел=([^\]]+)\]/i);
    if (match) {
      const clientName = match[1].trim();
      const clientPhone = match[2].trim();
      if (clientName && clientPhone &&
          !clientName.toLowerCase().includes('не указ') &&
          !clientPhone.toLowerCase().includes('не указ') &&
          clientName !== 'ИМЯ' && clientPhone !== 'ТЕЛЕФОН') {
        const notify = `ТРЕБУЕТСЯ ПОДРОБНАЯ КОНСУЛЬТАЦИЯ\n\nИмя: ${clientName}\nТелефон: ${clientPhone}\nВремя: ${new Date().toLocaleString('ru-RU')}\n\nКлиент задал сложный вопрос — требуется подробная консультация.`;
        client.sendMessage(notifyTarget, notify);
        console.log(`CONSULTATION: ${clientName} ${clientPhone}`);
      }
    }
  }
}

// ─── Graceful Shutdown ───

process.on('SIGTERM', async () => {
  console.log('SIGTERM получен. Корректное завершение...');
  
  server.close(() => {
    console.log('Вебсервер закрыт');
    process.exit(0);
  });

  setTimeout(() => {
    console.log('Принудительное завершение');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', async () => {
  console.log('Завершение работы...');
  server.close();
  process.exit(0);
});

client.initialize();
