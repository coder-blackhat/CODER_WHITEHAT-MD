async function connectBot() {
  try {
    console.log("Starting Baileys...");
    const { state, saveCreds } = await useMultiFileAuthState("/tmp/session");
    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "info" }),
      browser: Browsers.macOS("Desktop"),
      printQRInTerminal: false
    });

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log("Connection update:", connection);
      
      if (qr) {
        qrCodeData = await qrcode.toDataURL(qr);
        botStatus = "qr";
        console.log("QR Generated - scan now");
      }
      if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)? lastDisconnect.error.output.statusCode!== DisconnectReason.loggedOut : true;
        console.log("Connection closed, reconnect:", shouldReconnect);
        botStatus = "disconnected";
        qrCodeData = "";
        if (shouldReconnect) setTimeout(connectBot, 3000);
      } else if (connection === "open") {
        botStatus = "open";
        qrCodeData = "";
        console.log("Bot Connection: open");
      }
    });

    sock.ev.on("creds.update", saveCreds);
  } catch (err) {
    console.error("Bot startup error:", err);
    botStatus = "error";
  }
  }
const crypto = require('crypto');
global.crypto = crypto;
const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 8080;

let qrCodeData = "";
let botStatus = "starting";

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CODER_WHITEHAT-MD</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{background:#0d1117;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
        .card{background:#161b22;padding:30px;border-radius:12px;text-align:center;max-width:350px;border:1px solid #30363d}
        h1{color:#25D366;margin:0 0 20px}
        img{width:280px;height:280px;border:4px solid #25D366;border-radius:8px;margin:15px 0}
        .status{padding:8px;border-radius:6px;font-weight:600;margin:15px 0}
        .online{background:#238636}.offline{background:#da3633}.waiting{background:#9e6a03}
        button{background:#25D366;color:#000;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer}
      </style>
    </head>
    <body>
      <div class="card">
        <h1>CODER_WHITEHAT-MD</h1>
        <div class="status ${botStatus === 'open'? 'online' : botStatus === 'qr'? 'waiting' : 'offline'}">
          ${botStatus === 'open'? '✅ CONNECTED' : botStatus === 'qr'? '📱 SCAN QR' : '⚠️ STARTING'}
        </div>
        ${qrCodeData? `<img src="${qrCodeData}"><p>WhatsApp > Linked Devices</p>` : '<p>Generating... <a href="/">Refresh</a></p>'}
        <button onclick="location.reload()">Refresh</button>
      </div>
    </body>
    </html>
  `);
});

app.get("/ping", (req, res) => res.json({ status: botStatus }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectBot();
});

async function connectBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "error" }),
    browser: Browsers.macOS("Desktop")
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrCodeData = await qrcode.toDataURL(qr);
      botStatus = "qr";
      console.log("QR Generated");
    }
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)? lastDisconnect.error.output.statusCode!== DisconnectReason.loggedOut : true;
      botStatus = "disconnected";
      if (shouldReconnect) setTimeout(connectBot, 3000);
    } else if (connection === "open") {
      botStatus = "open";
      qrCodeData = "";
      console.log("Bot Connection: open");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}
