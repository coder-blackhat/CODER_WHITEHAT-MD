import express from 'express'
import { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, Browsers } from 'baileys-pro'
import fs from 'fs'
import pino from 'pino'
import QRCode from 'qrcode'

const app = express()
const port = process.env.PORT || 3000
app.use(express.json())
app.use(express.static('public'))

let globalSock = null

// Start bot on server boot
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
    const { version } = await fetchLatestBaileysVersion()
    
    globalSock = makeWASocket({
        version,
        logger: pino({ level: 'fatal' }),
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS('Safari'),
        syncFullHistory: false
    })
    
    globalSock.ev.on('creds.update', saveCreds)
    globalSock.ev.on('connection.update', (update) => {
        console.log(` Bot Connection: ${update.connection}`)
    })
}

startBot()

// QR pairing endpoint for new users
app.post('/pair', async (req, res) => {
    const sessionId = Date.now().toString()
    const pairingPath = `./pairing/${sessionId}`
    fs.mkdirSync('./pairing', { recursive: true })

    try {
        const { state, saveCreds } = await useMultiFileAuthState(pairingPath)
        const { version } = await fetchLatestBaileysVersion()

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS('Safari')
        })

        sock.ev.on('creds.update', saveCreds)
        let responded = false

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr } = update

            if (qr && !responded) {
                responded = true
                const qrImage = await QRCode.toDataURL(qr)
                res.json({ success: true, qr: qrImage })
            }

            if (connection === 'open') {
                console.log(' New device linked!')
                sock.end()
                if (fs.existsSync(pairingPath)) fs.rmSync(pairingPath, { recursive: true, force: true })
            }
        })

        setTimeout(() => {
            if (!responded) {
                responded = true
                res.json({ success: false, error: 'QR timeout' })
                sock.end()
            }
        }, 30000)

    } catch (e) {
        res.json({ success: false, error: e.message })
    }
})

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`)
})
