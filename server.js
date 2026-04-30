global.crypto = require('crypto')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const express = require('express')
const AdmZip = require('adm-zip')

const app = express()
const port = process.env.PORT || 8080

async function connectToWhatsApp() {
    try {
        // Unzip using adm-zip instead of shell command
        if (fs.existsSync('auth_info.zip') &&!fs.existsSync('auth_info')) {
            const zip = new AdmZip('auth_info.zip')
            zip.extractAllTo('.', true)
            console.log('✅ Unzipped Termux session')
        }

        const { version } = await fetchLatestBaileysVersion()
        const { state, saveCreds } = await useMultiFileAuthState('auth_info')

        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            browser: ['CODER_WHITEHAT-MD', 'Chrome', '110.0.0'],
            version
        })

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                console.log('Connection closed:', statusCode)
                if (statusCode!== DisconnectReason.loggedOut) {
                    console.log('Reconnecting...')
                    setTimeout(connectToWhatsApp, 3000)
                }
            } else if (connection === 'open') {
                console.log('✅ Bot connected to WhatsApp!')
            }
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0]
            if (!msg.key.fromMe && msg.message) {
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text
                if (text === '.ping') {
                    await sock.sendMessage(msg.key.remoteJid, { text: 'Pong! Bot online 24/7 ✅' })
                }
            }
        })

    } catch (err) {
        console.error('Connection failed:', err)
        setTimeout(connectToWhatsApp, 5000)
    }
}

connectToWhatsApp()

app.get('/', (req, res) => {
    const connected = fs.existsSync('auth_info/creds.json')
    res.send(connected? '✅ Bot is connected!' : '❌ Bot not connected')
})

app.listen(port, () => console.log(`Server running on port ${port}`)) 
