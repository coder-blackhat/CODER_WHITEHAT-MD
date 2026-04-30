const express = require('express')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode')
const pino = require('pino')
const app = express()

let qrCode = ''
let isConnected = false

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info')
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ['CODER_WHITEHAT-MD', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        
        if (qr) {
            console.log('QR Generated - scan now')
            qrCode = await qrcode.toDataURL(qr)
            isConnected = false
        }
        
        if (connection === 'close') {
            isConnected = false
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) {
                console.log('Reconnecting...')
                setTimeout(() => connectToWhatsApp(), 3000)
            }
        } else if (connection === 'open') {
            console.log('Bot connected to WhatsApp!')
            isConnected = true
            qrCode = ''
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.get('/', (req, res) => {
    if (qrCode && !isConnected) {
        res.send(`
            <html>
                <body style="background:#111;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h2 style="color:#fff;font-family:sans-serif;">Scan with WhatsApp</h2>
                        <img src="${qrCode}" style="border:10px solid #fff;width:300px;">
                    </div>
                </body>
            </html>
        `)
    } else if (isConnected) {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Bot is connected!</h1>')
    } else {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Starting bot...</h1>')
    }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectToWhatsApp()
})            console.log('Bot connected to WhatsApp!')
            isConnected = true
            qrCode = ''
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.get('/', (req, res) => {
    if (qrCode && !isConnected) {
        res.send(`
            <html>
                <body style="background:#111;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h2 style="color:#fff;font-family:sans-serif;">Scan with WhatsApp</h2>
                        <img src="${qrCode}" style="border:10px solid #fff;width:300px;">
                        <p style="color:#888;font-family:sans-serif;">CODER_WHITEHAT-MD</p>
                    </div>
                </body>
            </html>
        `)
    } else if (isConnected) {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Bot is connected to WhatsApp!</h1>')
    } else {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Starting bot... Refresh in 10s</h1>')
    }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectToWhatsApp()
})            console.log('Bot connected to WhatsApp!')
            isConnected = true
            qrCode = ''
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.get('/', (req, res) => {
    if (qrCode && !isConnected) {
        res.send(`
            <html>
                <body style="background:#111;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h2 style="color:#fff;font-family:sans-serif;">Scan with WhatsApp</h2>
                        <img src="${qrCode}" style="border:10px solid #fff;width:300px;">
                    </div>
                </body>
            </html>
        `)
    } else if (isConnected) {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Bot is connected to WhatsApp!</h1>')
    } else {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Starting bot... Refresh in 10s</h1>')
    }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectToWhatsApp()
})            console.log('Bot connected to WhatsApp!')
            isConnected = true
            qrCode = ''
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

app.get('/', (req, res) => {
    if (qrCode && !isConnected) {
        res.send(`
            <html>
                <body style="background:#111;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h2 style="color:#fff;font-family:sans-serif;">Scan with WhatsApp</h2>
                        <img src="${qrCode}" style="border:10px solid #fff;width:300px;">
                        <p style="color:#888;font-family:sans-serif;">CODER_WHITEHAT-MD</p>
                    </div>
                </body>
            </html>
        `)
    } else if (isConnected) {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Bot is connected to WhatsApp!</h1>')
    } else {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Starting bot... Refresh in 10 seconds</h1>')
    }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectToWhatsApp()
})
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
      console.log("Connection update:", connection || "qr received");
      
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
        if (shouldReconnect) setTimeout(connectBot, 5000);
      } else if (connection === "open") {
        botStatus = "open";
        qrCodeData = "";
        console.log("Bot Connection: open");
      }
    });

    sock.ev.on("creds.update", saveCreds);
    
  } catch (err) {
    console.error("Bot startup error:", err.message);
    botStatus = "error";
  }
}
