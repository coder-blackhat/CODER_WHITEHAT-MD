global.crypto = require('crypto')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const express = require('express')
const AdmZip = require('adm-zip')
const axios = require('axios')
const moment = require('moment-timezone')
const { exec } = require('child_process')
const Jimp = require('jimp')

const app = express()
const port = process.env.PORT || 8080

// Bot Config
global.botname = 'CODER_WHITEHAT'
global.ownername = 'CODER_WHITEHAT'
global.ownernumber = '263778395676'
global.prefix = '.'
global.mode = 'public'
global.version = '3.0.0'
global.host = 'Railway'
global.platform = process.platform
global.startTime = Date.now()

// Database - simple JSON
let db = { users: {}, groups: {}, settings: {} }
if (fs.existsSync('./database.json')) db = JSON.parse(fs.readFileSync('./database.json'))
const saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2))

async function connectToWhatsApp() {
    try {
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
            version,
            printQRInTerminal: false
        })

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                if (statusCode!== DisconnectReason.loggedOut) {
                    console.log('Reconnecting...')
                    setTimeout(connectToWhatsApp, 3000)
                }
            } else if (connection === 'open') {
                console.log('✅ Bot connected to WhatsApp!')
            }
        })

        sock.ev.on('creds.update', saveCreds)

        // Command Handler
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg.message || msg.key.fromMe) return
                const from = msg.key.remoteJid
                const isGroup = from.endsWith('@g.us')
                const sender = isGroup? msg.key.participant : from
                const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || ''

                if (!body.startsWith(global.prefix)) return
                const args = body.slice(global.prefix.length).trim().split(/ +/)
                const command = args.shift().toLowerCase()
                const q = args.join(' ')

                // Check mode
                const isOwner = sender.includes(global.ownernumber)
                if (global.mode === 'private' &&!isOwner) return

                // Runtime function
                const runtime = () => {
                    const uptime = Date.now() - global.startTime
                    return `${Math.floor(uptime / 3600000)}h ${Math.floor(uptime % 3600000 / 60000)}m ${Math.floor(uptime % 60000 / 1000)}s`
                }

                // MENU COMMAND
                if (command === 'menu' || command === 'help' || command === 'list') {
                    const menu = `╭━━━〔 *${global.botname}* 〕━━━⬣
┃ 📱 Version: ${global.version}
┃ 👑 Owner: ${global.ownername}
┃ ⏰ Runtime: ${runtime()}
┃ 🔧 Mode: ${global.mode.toUpperCase()}
┃ 📝 Prefix: ${global.prefix}
┃ 🖥️ Host: ${global.host}
┃ 💻 Platform: ${global.platform}
╰━━━━━━━━━━━━━━━⬣

╭━━〔 *ᴄᴏᴍᴍᴀɴᴅs* 〕━━⬣
┃
┃ ⫷ 𝐌𝐄𝐃𝐈𝐀 ⫸
┃ +${global.prefix}sticker
┃ +${global.prefix}toimage
┃ +${global.prefix}tomp3
┃ +${global.prefix}toaudio
┃
┃ ⫷ 𝐎𝐖𝐍𝐄𝐑 ⫸
┃ +${global.prefix}owner
┃ +${global.prefix}ping
┃ +${global.prefix}runtime
┃ +${global.prefix}public
┃ +${global.prefix}private
┃
┃ ⫷ 𝐆𝐑𝐎𝐔𝐏 ⫸
┃ +${global.prefix}kick @user
┃ +${global.prefix}add <num>
┃ +${global.prefix}promote @user
┃ +${global.prefix}demote @user
┃ +${global.prefix}tagall
┃ +${global.prefix}hidetag
┃ +${global.prefix}group open/close
┃
┃ ⫷ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ⫸
┃ +${global.prefix}play <song>
┃ +${global.prefix}ytmp3 <link>
┃ +${global.prefix}ytmp4 <link>
┃ +${global.prefix}tiktok <link>
┃
┃ ⫷ 𝐀𝐈 ⫸
┃ +${global.prefix}ai <question>
┃ +${global.prefix}gpt <question>
┃ +${global.prefix}imagine <prompt>
┃
╰━━━━━━━━━━━━━━━⬣
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ CODER_WHITEHAT`
                    return sock.sendMessage(from, { text: menu }, { quoted: msg })
                }

                // OWNER COMMANDS
                if (command === 'ping') {
                    const start = Date.now()
                    const sent = await sock.sendMessage(from, { text: 'Pinging...' }, { quoted: msg })
                    const end = Date.now()
                    return sock.sendMessage(from, { text: `Pong! Speed: ${end - start}ms`, edit: sent.key }, { quoted: msg })
                }

                if (command === 'runtime' || command === 'uptime') {
                    return sock.sendMessage(from, { text: `⏰ Runtime: ${runtime()}` }, { quoted: msg })
                }

                if (command === 'owner') {
                    return sock.sendMessage(from, { text: `👑 Owner: wa.me/${global.ownernumber}` }, { quoted: msg })
                }

                if (command === 'public' && isOwner) {
                    global.mode = 'public'
                    return sock.sendMessage(from, { text: '✅ Mode set to PUBLIC' }, { quoted: msg })
                }

                if (command === 'private' && isOwner) {
                    global.mode = 'private'
                    return sock.sendMessage(from, { text: '✅ Mode set to PRIVATE' }, { quoted: msg })
                }

                // MEDIA COMMANDS
                if (command === 'sticker' || command === 's') {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
                    const target = quoted? quoted : msg.message
                    const type = Object.keys(target)[0]
                    if (!type.includes('image') &&!type.includes('video')) return sock.sendMessage(from, { text: 'Reply to image/video!' }, { quoted: msg })

                    const stream = await downloadContentFromMessage(target[type], type.includes('image')? 'image' : 'video')
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

                    return sock.sendMessage(from, { sticker: buffer }, { quoted: msg })
                }

                if (command === 'toimage' || command === 'toimg') {
                    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
                    if (!quoted?.stickerMessage) return sock.sendMessage(from, { text: 'Reply to a sticker!' }, { quoted: msg })

                    const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker')
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

                    return sock.sendMessage(from, { image: buffer }, { quoted: msg })
                }

                // GROUP COMMANDS
                if (command === 'kick' && isGroup) {
                    const groupMeta = await sock.groupMetadata(from)
                    const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin
                    const botAdmin = groupMeta.participants.find(p => p.id === sock.user.id)?.admin
                    if (!isAdmin) return sock.sendMessage(from, { text: 'Admin only!' }, { quoted: msg })
                    if (!botAdmin) return sock.sendMessage(from, { text: 'Bot needs admin!' }, { quoted: msg })

                    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                    if (!mentioned?.length) return sock.sendMessage(from, { text: 'Tag user to kick!' }, { quoted: msg })

                    await sock.groupParticipantsUpdate(from, mentioned, 'remove')
                    return sock.sendMessage(from, { text: '✅ Kicked' }, { quoted: msg })
                }

                if (command === 'tagall' && isGroup) {
                    const groupMeta = await sock.groupMetadata(from)
                    const members = groupMeta.participants.map(p => p.id)
                    const text = q || 'Tag All'
                    return sock.sendMessage(from, { text, mentions: members }, { quoted: msg })
                }

                if (command === 'hidetag' && isGroup) {
                    const groupMeta = await sock.groupMetadata(from)
                    const members = groupMeta.participants.map(p => p.id)
                    return sock.sendMessage(from, { text: q || '', mentions: members }, { quoted: msg })
                }

                if (command === 'group' && isGroup && isOwner) {
                    if (args[0] === 'open') {
                        await sock.groupSettingUpdate(from, 'not_announcement')
                        return sock.sendMessage(from, { text: '✅ Group opened' }, { quoted: msg })
                    }
                    if (args[0] === 'close') {
                        await sock.groupSettingUpdate(from, 'announcement')
                        return sock.sendMessage(from, { text: '✅ Group closed' }, { quoted: msg })
                    }
                }

                // DOWNLOAD COMMANDS - requires external APIs
                if (command === 'play') {
                    if (!q) return sock.sendMessage(from, { text: 'Song name?' }, { quoted: msg })
                    sock.sendMessage(from, { text: 'Searching...' }, { quoted: msg })
                    // You need to add ytdl-core + yt-search logic here
                    return sock.sendMessage(from, { text: `Download feature needs yt-dlp API. Add it yourself.` }, { quoted: msg })
                }

                // AI COMMANDS
                if (command === 'ai' || command === 'gpt' || command === 'ask') {
                    if (!q) return sock.sendMessage(from, { text: 'Ask something!' }, { quoted: msg })
                    try {
                        const res = await axios.get(`https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(q)}`)
                        return sock.sendMessage(from, { text: res.data.response }, { quoted: msg })
                    } catch {
                        return sock.sendMessage(from, { text: 'AI API error' }, { quoted: msg })
                    }
                }

            } catch (e) {
                console.error(e)
            }
        })

    } catch (err) {
        console.error('Connection failed:', err)
        setTimeout(connectToWhatsApp, 5000)
    }
}

connectToWhatsApp()

app.get('/', (req, res) => res.send('✅ Bot is connected!'))
app.listen(port, () => console.log(`Server running on port ${port}`)) 
