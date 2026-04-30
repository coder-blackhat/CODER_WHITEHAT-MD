const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const qrcode = require("qrcode");
const pino = require("pino");

const app = express();
const PORT = process.env.PORT || 8080; // Critical for Railway

let qrCodeData = "";
let botStatus = "starting";

app.get("/", async (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>CODER_WHITEHAT-MD Pairing</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { background:#0d1117; color:#c9d1d9; font-family:sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; }
      .card { background:#161b22; padding:30px; border-radius:12px; text-align:center; max-width:350px; border:1px solid #30363d; }
      h1 { color:#25D366; margin:0 0 20px; }
      img { width:280px; height:280px; border:4px solid #25D366; border-radius:8px; margin:15px 0; }
      .status { padding:8px; border-radius:6px; font-weight:600; margin:15px 0; }
      .online { background:#238636; }
      .offline { background:#da3633; }
      .waiting { background:#9e6a03; }
      button { background:#25D366; color:#000; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>CODER_WHITEHAT-MD</h1>
      <div class="status ${botStatus === 'open' ? 'online' : botStatus === 'qr' ? 'waiting' : 'offline'}">
        ${botStatus === 'open' ? '✅ CONNECTED' : botStatus === 'qr' ? '📱 SCAN QR CODE' : '⚠️ STARTING...'}
      </div>
      ${qrCodeData ? `<img src="${qrCodeData}" alt="QR Code"><p>WhatsApp > Linked Devices > Link a Device</p>` : 
        botStatus === 'open' ? '<p>Bot is online 24/7</p>' : '<p>Generating QR... <a href="/">Refresh</a></p>'}
      <button onclick="window.location.reload()">Refresh</button>
    </div>
  </body>
  </html>`;
  res.send(html);
});

// For UptimeRobot 24/7 ping
app.get("/ping", (req
