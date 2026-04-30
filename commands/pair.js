import config from '../config.js'
import { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, Browsers, DisconnectReason } from '@whiskeysockets/baileys'
import fs from 'fs'
import pino from 'pino'

export default {
    name: "pair",
    aliases: ["link", "getcode"],
    run: async ({ sock, m, args, from, isOwner }) => {
        if (!isOwner) return await sock.sendMessage(from, { text: "Owner only. Ask bot owner to pair for you." })

        const number = args[0]?.replace(/[^0-9]/g, '')
        if (!number) {
            return await sock.sendMessage(from, {
                text: `*Pairing Code Generator*\n\nUsage: ${config.prefix}pair 263774123456\n\nEnter number with country code, no + or spaces.\n\nExample: ${config.prefix}pair 263774123456`
            })
        }

        if (number.length < 11) {
            return await sock.sendMessage(from, { text: "Invalid number. Include country code. Example: 263774123456" })
        }

        const pairingPath = `./pairing/${number}`
        if (fs.existsSync(pairingPath)) fs.rmSync(pairingPath, { recursive: true, force: true })
        fs.mkdirSync('./pairing', { recursive: true })

        await sock.sendMessage(from, { text: `Generating pairing code for +${number}...\nWait 10 seconds.` })

        try {
            const { state, saveCreds } = await useMultiFileAuthState(pairingPath)
            const { version } = await fetchLatestBaileysVersion()

            const pairSock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }),
                printQRInTerminal: false,
                auth: state,
                browser: Browsers.macOS('Desktop'),
                syncFullHistory: false,
                markOnlineOnConnect: false
            })

            pairSock.ev.on('creds.update', saveCreds)

            if (!pairSock.authState.creds.registered) {
                const code = await pairSock.requestPairingCode(number)
                await sock.sendMessage(from, {
                    text: `*PAIRING CODE FOR +${number}*\n\n*Code:* ${code}\n\n*Steps:*\n1. Open WhatsApp on +${number}\n2. Settings > Linked Devices\n3. Link a Device > Link with phone number\n4. Enter: *${code}*\n\n*Expires in 20 seconds*`
                })

                setTimeout(() => {
                    pairSock.end()
                    fs.rmSync(pairingPath, { recursive: true, force: true })
                }, 25000)
            } else {
                await sock.sendMessage(from, { text: "This number is already paired." })
                pairSock.end()
            }

        } catch (e) {
            console.error('Pair error:', e)
            await sock.sendMessage(from, { text: `Failed to generate code: ${e.message}\n\nTry again or check if number is valid.` })
            if (fs.existsSync(pairingPath)) fs.rmSync(pairingPath, { recursive: true, force: true })
        }
    }
}
