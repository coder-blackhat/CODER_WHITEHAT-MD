import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import config from './config.js'
import qrcode from 'qrcode-terminal'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logger = pino({ level: 'silent' })
const commands = new Map()
const commandsDir = path.join(__dirname, 'commands')

async function loadCommands() {
    if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir)
    const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js'))
    for (const file of files) {
        try {
            const cmd = await import(`file://${path.join(commandsDir, file)}?update=${Date.now()}`)
            const command = cmd.default
            commands.set(command.name, command)
            if (command.aliases) command.aliases.forEach(alias => commands.set(alias, command))
            console.log(`Loaded: ${command.name}`)
        } catch (e) {
            console.log(`Failed to load ${file}:`, e.message)
        }
    }
    console.log(`Total ${commands.size} commands loaded`)
}

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger,
        printQRInTerminal: false,
        auth: state,
        browser: Browsers.macOS('Desktop'), // Key fix: Use Browsers helper
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: false,
        fireInitQueries: false
    })

    await loadCommands()
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('\nScan this QR code:\n')
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const statusCode = (lastDisconnect?.error)?.output?.statusCode
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut
            console.log('Connection closed with code:', statusCode, 'Reconnecting:', shouldReconnect)
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('Logged out. Delete auth folder and restart.')
                fs.rmSync('auth', { recursive: true, force: true })
            }
            
            if (shouldReconnect) {
                console.log('Reconnecting in 3s...')
                setTimeout(startBot, 3000)
            }
        }

        if (connection === 'open') {
            console.log('✅ Bot connected!')
            await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                text: `*Bot Online* ✅\nPrefix: ${config.prefix}\nCommands: ${commands.size}`
            }).catch(() => {})
        }
    })

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message || m.key.fromMe) return
        const from = m.key.remoteJid
        const sender = m.key.participant || m.key.remoteJid
        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ''
        if (!body.startsWith(config.prefix)) return
        if (config.autoTyping) await sock.sendPresenceUpdate('composing', from)
        const args = body.slice(config.prefix.length).trim().split(/ +/)
        const cmdName = args.shift().toLowerCase()
        const command = commands.get(cmdName)
        if (!command) return
        const isGroup = from.endsWith('@g.us')
        let groupMetadata = {}, participants = [], isAdmin = false, isBotAdmin = false
        if (isGroup) {
            try {
                groupMetadata = await sock.groupMetadata(from)
                participants = groupMetadata.participants
                isAdmin = participants.find(p => p.id === sender)?.admin? true : false
                isBotAdmin = participants.find(p => p.id === sock.user.id)?.admin? true : false
            } catch (e) {}
        }
        const isOwner = sender === config.ownerNumber + '@s.whatsapp.net'
        try {
            await command.run({ sock, m, args, from, sender, isGroup, isAdmin, isBotAdmin, isOwner, participants, groupMetadata })
        } catch (e) {
            console.error(`Error in ${cmdName}:`, e.message)
        } finally {
            if (config.autoTyping) await sock.sendPresenceUpdate('paused', from)
        }
    })
}

startBot()
