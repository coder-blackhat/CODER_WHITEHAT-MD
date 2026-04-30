global.crypto = require('crypto')
const express = require('express')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode')
const pino = require('pino')
const fs = require('fs')
const app = express()

let qrCode = ''
let isConnected = false

async function connectToWhatsApp() {
    try {
        if (fs.existsSync('auth_info')) {
            console.log('Clearing old session...')
            fs.rmSync('auth_info', { recursive: true, force: true })
        }

        const { version } = await fetchLatestBaileysVersion()
        console.log(`Using WA version: ${version}`)
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info')
        
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: ['CODER_WHITEHAT-MD', 'Chrome', '110.0.0'],
            version
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
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const errorMsg = lastDisconnect?.error?.message
                console.log('Connection closed. Status:', statusCode, 'Error:', errorMsg)
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 405) {
                    console.log('Deleting auth and restarting...')
                    fs.rmSync('auth_info', { recursive: true, force: true })
                }
                
                console.log('Reconnecting in 3s...')
                setTimeout(() => connectToWhatsApp(), 3000)
            } else if (connection === 'open') {
                console.log('Bot connected to WhatsApp!')
                isConnected = true
                qrCode = ''
            }
        })

        sock.ev.on('creds.update', saveCreds)
        
    } catch (err) {
        console.log('FATAL ERROR:', err.message)
        console.log('Retrying in 5s...')
        fs.rmSync('auth_info', { recursive: true, force: true })
        setTimeout(() => connectToWhatsApp(), 5000)
    }
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
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">✅ Bot is connected!</h1>')
    } else {
        res.send('<h1 style="font-family:sans-serif;text-align:center;margin-top:50px;">Starting bot... Refresh in 10s</h1>')
    }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    connectToWhatsApp()
}) 
