global.crypto = require('crypto')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const express = require('express')
const AdmZip = require('adm-zip')
const axios = require('axios')
const moment = require('moment-timezone')
const FormData = require('form-data')

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
global.xwolf = 'https://apis.xwolf.space'

// Database
let db = { users: {}, groups: {}, settings: { chatbot: false, autoread: false, autobio: false } }
if (fs.existsSync('./database.json')) db = JSON.parse(fs.readFileSync('./database.json'))
const saveDB = () => fs.writeFileSync('./database.json', JSON.stringify(db, null, 2))

const runtime = () => {
    const uptime = Date.now() - global.startTime
    return `${Math.floor(uptime / 3600000)}h ${Math.floor(uptime % 3600000 / 60000)}m ${Math.floor(uptime % 60000 / 1000)}s`
}

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
                console.log('Connection closed:', statusCode)
                if (statusCode!== DisconnectReason.loggedOut) {
                    console.log('Reconnecting...')
                    setTimeout(connectToWhatsApp, 3000)
                }
            } else if (connection === 'open') {
                console.log('✅ Bot connected to WhatsApp!')
                if (db.settings.autobio) {
                    setInterval(() => {
                        sock.updateProfileStatus(`🤖 ${global.botname} | Runtime: ${runtime()} | Mode: ${global.mode}`)
                    }, 60000)
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0]
                if (!msg.message || msg.key.fromMe) return
                const from = msg.key.remoteJid
                const isGroup = from.endsWith('@g.us')
                const sender = isGroup? msg.key.participant : from
                const pushname = msg.pushName || 'User'
                const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || ''
                const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage

                if (db.settings.autoread) await sock.readMessages([msg.key])

                if (!db.users[sender]) db.users[sender] = { balance: 100, warns: 0, banned: false, lastDaily: 0, lastWork: 0 }
                if (isGroup &&!db.groups[from]) db.groups[from] = { antilink: false, antibot: false, welcome: false, goodbye: false, badwords: [] }

                if (!body.startsWith(global.prefix)) {
                    if (isGroup && db.groups[from]?.antilink && body.includes('chat.whatsapp.com/')) {
                        const groupMeta = await sock.groupMetadata(from)
                        const isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin
                        if (!isAdmin) {
                            await sock.sendMessage(from, { text: `⚠️ @${sender.split('@')[0]} Links not allowed!`, mentions: [sender] })
                            await sock.groupParticipantsUpdate(from, [sender], 'remove')
                        }
                    }
                    return
                }

                const args = body.slice(global.prefix.length).trim().split(/ +/)
                const command = args.shift().toLowerCase()
                const q = args.join(' ')
                const isOwner = sender.includes(global.ownernumber)

                if (global.mode === 'private' &&!isOwner) return
                if (db.users[sender].banned) return sock.sendMessage(from, { text: 'You are banned!' }, { quoted: msg })

                let groupMeta, isAdmin, botAdmin
                if (isGroup) {
                    groupMeta = await sock.groupMetadata(from)
                    isAdmin = groupMeta.participants.find(p => p.id === sender)?.admin
                    botAdmin = groupMeta.participants.find(p => p.id === sock.user.id)?.admin
                }

                const reply = (text) => sock.sendMessage(from, { text }, { quoted: msg })
                const react = (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } })

                switch (command) {
                    case 'pair':
                        if (isGroup) return reply('❌ Use this in private chat!')
                        if (!q) return reply(`*Usage:* ${global.prefix}pair 263771234567\n\nSend your number with country code to get a pairing code.`)
                        try {
                            react('⏳')
                            const { state: pairState } = await useMultiFileAuthState(`./pair_${q}`)
                            const pairSock = makeWASocket({ auth: pairState, printQRInTerminal: false })
                            if (!pairSock.authState.creds.registered) {
                                const code = await pairSock.requestPairingCode(q)
                                reply(`*PAIRING CODE FOR ${q}*\n\nCode: *${code}*\n\n1. WhatsApp > Linked Devices\n2. Link with phone number\n3. Enter this code\n\n_Expires in 60s_`)
                                setTimeout(() => pairSock.end(), 60000)
                            } else reply('✅ Number already registered!')
                            react('✅')
                        } catch (e) { reply('❌ Error. Check number format.') }
                        break

                    case 'menu': case 'help': case 'list':
                        const menu = `╭━━━〔 *${global.botname}* 〕━━━⬣
┃ 📱 Version: ${global.version}
┃ 👑 Owner: ${global.ownername}
┃ ⏰ Runtime: ${runtime()}
┃ 🔧 Mode: ${global.mode.toUpperCase()}
┃ 📝 Prefix: ${global.prefix}
┃ 🖥️ Host: ${global.host}
┃ 💻 Platform: ${global.platform}
╰━━━━━━━━━━━━━━━⬣

╭━━〔 *ᴄᴏᴍᴀɴᴅs* 〕━━⬣
┃
┃ ⫷ 𝐌𝐄𝐃𝐈𝐀 ⫸
┃ +${global.prefix}sticker +${global.prefix}stickervid +${global.prefix}toimage
┃ +${global.prefix}tovideo +${global.prefix}toaudio +${global.prefix}togif
┃ +${global.prefix}removebg +${global.prefix}take <pack>
┃
┃ ⫷ 𝐎𝐖𝐍𝐄𝐑 ⫸
┃ +${global.prefix}owner +${global.prefix}ping +${global.prefix}runtime
┃ +${global.prefix}public +${global.prefix}private +${global.prefix}autoread
┃ +${global.prefix}block +${global.prefix}unblock +${global.prefix}broadcast
┃ +${global.prefix}join <link>
┃
┃ ⫷ 𝐆𝐑𝐎𝐔𝐏 ⫸
┃ +${global.prefix}kick +${global.prefix}add +${global.prefix}promote +${global.prefix}demote
┃ +${global.prefix}tagall +${global.prefix}hidetag +${global.prefix}group open/close
┃ +${global.prefix}link +${global.prefix}revoke +${global.prefix}setgcname
┃ +${global.prefix}setgcdesc +${global.prefix}setgcpp
┃
┃ ⫷ 𝐏𝐑𝐎𝐓𝐄𝐂𝐓𝐈𝐎𝐍 ⫸
┃ +${global.prefix}antilink on/off +${global.prefix}antibot on/off
┃ +${global.prefix}warn +${global.prefix}unwarn +${global.prefix}listwarn
┃
┃ ⫷ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ⫸
┃ +${global.prefix}play +${global.prefix}ytmp3 +${global.prefix}ytmp4
┃ +${global.prefix}tiktok +${global.prefix}ig +${global.prefix}fb
┃ +${global.prefix}lyrics +${global.prefix}spotify
┃
┃ ⫷ 𝐀𝐈 𝐈𝐌𝐀𝐆𝐄 ⫸
┃ +${global.prefix}imagine <prompt> +${global.prefix}lorem <w> <h>
┃ +${global.prefix}bingimg
┃
┃ ⫷ 𝐀𝐈 𝐓𝐎𝐎𝐋𝐒 ⫸
┃ +${global.prefix}summarize +${global.prefix}codeai +${global.prefix}scanner
┃ +${global.prefix}humanizer +${global.prefix}removebg +${global.prefix}shazam
┃
┃ ⫷ 𝐀𝐈 𝐂𝐇𝐀𝐓 ⫸
┃ +${global.prefix}gpt +${global.prefix}claude +${global.prefix}gemini
┃ +${global.prefix}deepseek +${global.prefix}groq +${global.prefix}openchat
┃ +${global.prefix}wormgpt
┃
┃ ⫷ 𝐀𝐔𝐃𝐈𝐎 𝐄𝐅𝐅𝐄𝐂𝐓𝐒 ⫸
┃ +${global.prefix}bass +${global.prefix}bassboost +${global.prefix}deep
┃ +${global.prefix}robot +${global.prefix}telephone +${global.prefix}underwater
┃ +${global.prefix}megaphone +${global.prefix}nightcore
┃
┃ ⫷ 𝐄𝐂𝐎𝐍𝐎𝐌𝐘 ⫸
┃ +${global.prefix}bal +${global.prefix}daily +${global.prefix}work
┃ +${global.prefix}give +${global.prefix}gamble +${global.prefix}shop
┃
┃ ⫷ 𝐒𝐄𝐀𝐑𝐂𝐇 ⫸
┃ +${global.prefix}google +${global.prefix}wiki +${global.prefix}npm
┃ +${global.prefix}weather +${global.prefix}movie +${global.prefix}github
┃
┃ ⫷ 𝐔𝐓𝐈𝐋𝐈𝐓𝐘 ⫸
┃ +${global.prefix}ssweb +${global.prefix}calc +${global.prefix}translate
┃ +${global.prefix}tts +${global.prefix}pair
┃
╰━━━━━━━━━━━━━━━⬣
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ CODER_WHITEHAT`
                        reply(menu)
                        break

                    case 'ping':
                        const start = Date.now()
                        const sent = await reply('Pinging...')
                        await sock.sendMessage(from, { text: `*Pong!* ${Date.now() - start}ms`, edit: sent.key })
                        break
                    case 'runtime': case 'uptime': reply(`⏰ *Runtime:* ${runtime()}`); break
                    case 'owner': reply(`👑 *Owner:* wa.me/${global.ownernumber}`); break
                    case 'public': if (!isOwner) return reply('Owner only!'); global.mode = 'public'; reply('✅ Mode: PUBLIC'); break
                    case 'private': if (!isOwner) return reply('Owner only!'); global.mode = 'private'; reply('✅ Mode: PRIVATE'); break
                    case 'autoread':
                        if (!isOwner) return reply('Owner only!')
                        db.settings.autoread =!db.settings.autoread
                        saveDB()
                        reply(`✅ Autoread: ${db.settings.autoread? 'ON' : 'OFF'}`)
                        break
                    case 'block': if (!isOwner) return reply('Owner only!'); if (!q) return reply('Number?'); await sock.updateBlockStatus(q.replace(/[^0-9]/g, '') + '@s.whatsapp.net', 'block'); reply('✅ Blocked'); break
                    case 'unblock': if (!isOwner) return reply('Owner only!'); if (!q) return reply('Number?'); await sock.updateBlockStatus(q.replace(/[^0-9]/g, '') + '@s.whatsapp.net', 'unblock'); reply('✅ Unblocked'); break
                    case 'broadcast':
                        if (!isOwner) return reply('Owner only!'); if (!q) return reply('Text?')
                        const chats = Object.keys(db.users)
                        reply(`Broadcasting to ${chats.length} chats...`)
                        for (let id of chats) { await sock.sendMessage(id, { text: `*BROADCAST*\n\n${q}` }); await new Promise(r => setTimeout(r, 1000)) }
                        break
                    case 'join':
                        if (!isOwner) return reply('Owner only!'); if (!q.includes('chat.whatsapp.com')) return reply('Invalid link!')
                        try { await sock.groupAcceptInvite(q.split('chat.whatsapp.com/')[1]); reply('✅ Joined') } catch { reply('❌ Failed') }
                        break

                    case 'sticker': case 's': case 'stickervid':
                        if (!quoted) return reply('Reply to image/video!')
                        const type = getContentType(quoted)
                        if (!type.includes('image') &&!type.includes('video')) return reply('Reply to media!')
                        react('⏳')
                        const stream = await downloadContentFromMessage(quoted[type], type.includes('image')? 'image' : 'video')
                        let buffer = Buffer.from([])
                        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
                        await sock.sendMessage(from, { sticker: buffer }, { quoted: msg })
                        react('✅')
                        break
                    case 'toimage': case 'toimg':
                        if (!quoted?.stickerMessage) return reply('Reply to sticker!')
                        react('⏳')
                        const stm = await downloadContentFromMessage(quoted.stickerMessage, 'sticker')
                        let sbuffer = Buffer.from([])
                        for await (const chunk of stm) sbuffer = Buffer.concat([sbuffer, chunk])
                        await sock.sendMessage(from, { image: sbuffer }, { quoted: msg })
                        react('✅')
                        break
                    case 'tovideo': case 'tomp4':
                        if (!quoted?.stickerMessage) return reply('Reply to animated sticker!')
                        react('⏳')
                        try {
                            const stm2 = await downloadContentFromMessage(quoted.stickerMessage, 'sticker')
                            let buf = Buffer.from([])
                            for await (const chunk of stm2) buf = Buffer.concat([buf, chunk])
                            const form = new FormData()
                            form.append('sticker', buf, 'sticker.webp')
                            const res = await axios.post(`${global.xwolf}/api/converter/sticker-to-video`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { video: Buffer.from(res.data) }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Conversion failed') }
                        break
                    case 'toaudio': case 'tomp3':
                        if (!quoted?.videoMessage) return reply('Reply to video!')
                        react('⏳')
                        try {
                            const stream = await downloadContentFromMessage(quoted.videoMessage, 'video')
                            let buf = Buffer.from([])
                            for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                            await sock.sendMessage(from, { audio: buf, mimetype: 'audio/mpeg' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'togif':
                        if (!quoted?.videoMessage &&!quoted?.stickerMessage) return reply('Reply to video/sticker!')
                        react('⏳')
                        try {
                            const type = quoted.videoMessage? 'video' : 'sticker'
                            const stream = await downloadContentFromMessage(quoted[type + 'Message'], type)
                            let buf = Buffer.from([])
                            for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                            const form = new FormData()
                            form.append('video', buf, 'video.mp4')
                            const res = await axios.post(`${global.xwolf}/api/converter/video-to-gif`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { video: Buffer.from(res.data), gifPlayback: true }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'removebg': case 'nobg':
                        if (!quoted?.imageMessage) return reply('Reply to an image!')
                        react('⏳')
                        try {
                            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
                            let buf = Buffer.from([])
                            for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                            const form = new FormData()
                            form.append('image', buf, 'image.jpg')
                            const res = await axios.post(`${global.xwolf}/api/ai/removebg`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { image: Buffer.from(res.data), caption: 'Background Removed' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Remove BG failed') }
                        break

                    case 'kick':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!')
                        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                        if (!mentioned?.length) return reply('Tag user!')
                        await sock.groupParticipantsUpdate(from, mentioned, 'remove')
                        reply('✅ Kicked')
                        break
                    case 'add':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!'); if (!q) return reply('Number?')
                        await sock.groupParticipantsUpdate(from, [q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'], 'add')
                        reply('✅ Added')
                        break
                    case 'promote': case 'demote':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!')
                        const mention = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                        if (!mention?.length) return reply('Tag user!')
                        await sock.groupParticipantsUpdate(from, mention, command)
                        reply(`✅ ${command}d`)
                        break
                    case 'tagall':
                        if (!isGroup) return reply('Group only!')
                        const members = groupMeta.participants.map(p => p.id)
                        await sock.sendMessage(from, { text: q || 'Tag All', mentions: members }, { quoted: msg })
                        break
                    case 'hidetag':
                        if (!isGroup) return reply('Group only!')
                        const mem = groupMeta.participants.map(p => p.id)
                        await sock.sendMessage(from, { text: q || '', mentions: mem })
                        break
                    case 'group':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!')
                        if (args[0] === 'open') { await sock.groupSettingUpdate(from, 'not_announcement'); reply('✅ Group opened') }
                        else if (args[0] === 'close') { await sock.groupSettingUpdate(from, 'announcement'); reply('✅ Group closed') }
                        break
                    case 'link': case 'getlink':
                        if (!isGroup ||!botAdmin) return reply('Bot needs admin!')
                        const code = await sock.groupInviteCode(from)
                        reply(`https://chat.whatsapp.com/${code}`)
                        break
                    case 'revoke':
                        if (!isGroup ||!botAdmin) return reply('Bot needs admin!')
                        await sock.groupRevokeInvite(from)
                        reply('✅ Link revoked')
                        break
                    case 'setgcname':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!'); if (!q) return reply('New name?')
                        await sock.groupUpdateSubject(from, q)
                        reply('✅ Name updated')
                        break
                    case 'setgcdesc':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!'); if (!q) return reply('New desc?')
                        await sock.groupUpdateDescription(from, q)
                        reply('✅ Description updated')
                        break
                    case 'setgcpp':
                        if (!isGroup ||!isAdmin ||!botAdmin) return reply('Admin only!'); if (!quoted?.imageMessage) return reply('Reply to image!')
                        react('⏳')
                        const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
                        let buf = Buffer.from([])
                        for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                        await sock.updateProfilePicture(from, buf)
                        react('✅')
                        reply('✅ Group DP updated')
                        break

                    case 'antilink':
                        if (!isGroup ||!isAdmin) return reply('Admin only!')
                        if (args[0] === 'on') { db.groups[from].antilink = true; saveDB(); reply('✅ Antilink ON') }
                        else if (args[0] === 'off') { db.groups[from].antilink = false; saveDB(); reply('✅ Antilink OFF') }
                        break
                    case 'antibot':
                        if (!isGroup ||!isAdmin) return reply('Admin only!')
                        if (args[0] === 'on') { db.groups[from].antibot = true; saveDB(); reply('✅ Antibot ON') }
                        else if (args[0] === 'off') { db.groups[from].antibot = false; saveDB(); reply('✅ Antibot OFF') }
                        break
                    case 'warn':
                        if (!isGroup ||!isAdmin) return reply('Admin only!')
                        const warnUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                        if (!warnUser) return reply('Tag user!')
                        db.users[warnUser].warns++
                        saveDB()
                        reply(`⚠️ Warned! Total: ${db.users[warnUser].warns}/3`)
                        if (db.users[warnUser].warns >= 3) {
                            await sock.groupParticipantsUpdate(from, [warnUser], 'remove')
                            db.users[warnUser].warns = 0
                            saveDB()
                        }
                        break
                    case 'unwarn':
                        if (!isGroup ||!isAdmin) return reply('Admin only!')
                        const unwarnUser = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                        if (!unwarnUser) return reply('Tag user!')
                        db.users[unwarnUser].warns = 0
                        saveDB()
                        reply('✅ Warnings cleared')
                        break
                    case 'listwarn':
                        if (!isGroup) return reply('Group only!')
                        let list = '*WARN LIST*\n\n'
                        for (let user in db.users) {
                            if (db.users[user].warns > 0) list += `@${user.split('@')[0]}: ${db.users[user].warns}/3\n`
                        }
                        reply(list || 'No warnings')
                        break

                    case 'play': case 'song':
                        if (!q) return reply('Song name?')
                        react('🎵')
                        try {
                            const search = await axios.get(`${global.xwolf}/api/download/youtube/search?q=${encodeURIComponent(q)}`)
                            const video = search.data.result[0]
                            const dl = await axios.get(`${global.xwolf}/api/download/youtube/mp3?url=${video.url}`)
                            await sock.sendMessage(from, { audio: { url: dl.data.result.download }, mimetype: 'audio/mpeg', contextInfo: { externalAdReply: { title: video.title, thumbnailUrl: video.thumbnail }}}, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Download failed') }
                        break
                    case 'ytmp3': case 'yta':
                        if (!q) return reply('YouTube URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`${global.xwolf}/download/yta?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { audio: { url: res.data.result.download }, mimetype: 'audio/mpeg' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'ytmp4': case 'ytv':
                        if (!q) return reply('YouTube URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`${global.xwolf}/download/ytmp4?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.result.download }, caption: res.data.result.title }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'tiktok': case 'tt':
                        if (!q) return reply('TikTok URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/download/tiktok?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.result.video }, caption: res.data.result.title }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'ig': case 'instagram':
                        if (!q) return reply('Instagram URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/download/instagram?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.result[0].url }, caption: 'Instagram DL' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'fb': case 'facebook':
                        if (!q) return reply('Facebook URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/download/facebook?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.result.hd }, caption: 'Facebook DL' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'lyrics':
                        if (!q) return reply('Song name?')
                        try {
                            const res = await axios.get(`${global.xwolf}/download/lyrics?q=${encodeURIComponent(q)}`)
                            reply(`*${res.data.result.title}*\n\n${res.data.result.lyrics}`)
                        } catch { reply('❌ Lyrics not found') }
                        break

                    case 'imagine': case 'gen': case 'generate':
                        if (!q) return reply('Give me a prompt!')
                        react('🎨')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/image/pixabay?q=${encodeURIComponent(q)}&page=1`, { responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `*Prompt:* ${q}` }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Image generation failed') }
                        break
                    case 'lorem': case 'randompic':
                        react('🖼️')
                        try {
                            const width = args[0] || 800, height = args[1] || 600
                            const res = await axios.get(`${global.xwolf}/api/ai/image/lorem-picsum?width=${width}&height=${height}`, { responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { image: Buffer.from(res.data), caption: `${width}x${height} Random Image` }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'bingimg':
                        react('🖼️')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/image/bing`, { responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { image: Buffer.from(res.data), caption: 'Bing AI Image' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break

                    case 'summarize':
                        if (!q) return reply('Text to summarize?')
                        react('📝')
                        try {
                            const res = await axios.post(`${global.xwolf}/api/ai/summarize`, { text: q })
                            reply(`*Summary:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Summarize failed') }
                        break
                    case 'codeai': case 'code':
                        if (!q) return reply('Describe code to generate!')
                        react('💻')
                        try {
                            const res = await axios.post(`${global.xwolf}/api/ai/code`, { prompt: q })
                            reply(`\`\`\`\n${res.data.result}\n\`\`\``)
                            react('✅')
                        } catch { reply('❌ Code generation failed') }
                        break
                    case 'scanner': case 'ocr':
                        if (!quoted?.imageMessage) return reply('Reply to an image!')
                        react('🔍')
                        try {
                            const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
                            let buf = Buffer.from([])
                            for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                            const form = new FormData()
                            form.append('image', buf, 'scan.jpg')
                            const res = await axios.post(`${global.xwolf}/api/ai/scanner`, form, { headers: form.getHeaders() })
                            reply(`*Text Found:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Scan failed') }
                        break
                    case 'humanizer': case 'humanize':
                        if (!q) return reply('Text to humanize?')
                        react('✍️')
                        try {
                            const res = await axios.post(`${global.xwolf}/api/ai/humanizer`, { text: q })
                            reply(`*Humanized:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'shazam':
                        if (!quoted?.audioMessage) return reply('Reply to audio!')
                        react('🎵')
                        try {
                            const stream = await downloadContentFromMessage(quoted.audioMessage, 'audio')
                            let audioBuf = Buffer.from([])
                            for await (const chunk of stream) audioBuf = Buffer.concat([audioBuf, chunk])
                            const form = new FormData()
                            form.append('audio', audioBuf, 'audio.mp3')
                            const res = await axios.post(`${global.xwolf}/api/shazam/recognize`, form, { headers: form.getHeaders() })
                            reply(`🎵 *Found:* ${res.data.result.title}\n👤 *Artist:* ${res.data.result.artist}`)
                            react('✅')
                        } catch { reply('❌ Not recognized') }
                        break

                    case 'openchat':
                        if (!q) return reply('Ask something!')
                        react('💬')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/openchat?q=${encodeURIComponent(q)}`)
                            reply(res.data.result)
                            react('✅')
                        } catch { reply('❌ OpenChat error') }
                        break
                    case 'wormgpt':
                        if (!q) return reply('Ask something!')
                        react('🐛')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/wormgpt?q=${encodeURIComponent(q)}`)
                            reply(`*WormGPT:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ WormGPT error') }
                        break
                    case 'gpt':
                        if (!q) return reply('Ask something!')
                        react('🤖')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/gpt?q=${encodeURIComponent(q)}`)
                            reply(res.data.result)
                            react('✅')
                        } catch { reply('❌ GPT error') }
                        break
                    case 'claude':
                        if (!q) return reply('Ask something!')
                        react('🧠')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/claude?q=${encodeURIComponent(q)}`)
                            reply(`*Claude:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Claude error') }
                        break
                    case 'deepseek':
                        if (!q) return reply('Ask something!')
                        react('🔎')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/deepseek?q=${encodeURIComponent(q)}`)
                            reply(`*DeepSeek:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ DeepSeek error') }
                        break
                    case 'groq':
                        if (!q) return reply('Ask something!')
                        react('⚡')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/groq?q=${encodeURIComponent(q)}`)
                            reply(`*Groq:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Groq error') }
                        break
                    case 'gemini':
                        if (!q) return reply('Ask something!')
                        react('💎')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/gemini?q=${encodeURIComponent(q)}`)
                            reply(`*Gemini:*\n\n${res.data.result}`)
                            react('✅')
                        } catch { reply('❌ Gemini error') }
                        break
                    case 'ai': case 'ask':
                        if (!q) return reply('Ask something!')
                        react('🤖')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/ai/gpt?q=${encodeURIComponent(q)}`)
                            reply(res.data.result)
                            react('✅')
                        } catch { reply('❌ AI error') }
                        break

                    case 'bass': case 'bassboost': case 'deep': case 'robot': case 'telephone': case 'underwater': case 'megaphone': case 'nightcore':
                        if (!quoted?.audioMessage &&!quoted?.videoMessage) return reply('Reply to audio/video!')
                        react('🎧')
                        try {
                            const type = quoted.audioMessage? 'audio' : 'video'
                            const stream = await downloadContentFromMessage(quoted[type + 'Message'], type)
                            let buf = Buffer.from([])
                            for await (const chunk of stream) buf = Buffer.concat([buf, chunk])
                            const form = new FormData()
                            form.append('audio', buf, 'audio.mp3')
                            const effect = command === 'bassboost'? 'bassboost' : command
                            const res = await axios.post(`${global.xwolf}/api/audio/${effect}`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Effect failed') }
                        break

                    case 'bal': case 'balance': case 'wallet':
                        reply(`💰 *Balance:* $${db.users[sender].balance}`)
                        break
                    case 'daily':
                        const last = db.users[sender].lastDaily || 0
                        if (Date.now() - last < 86400000) return reply('❌ Already claimed! Come back tomorrow')
                        db.users[sender].balance +=500
                        db.users[sender].lastDaily = Date.now()
                        saveDB()
                        reply('✅ Claimed $500 daily reward!')
                        break
                    case 'work':
                        const lastWork = db.users[sender].lastWork || 0
                        if (Date.now() - lastWork < 3600000) return reply('❌ You can only work once per hour!')
                        const earn = Math.floor(Math.random() * 200) + 50
                        db.users[sender].balance += earn
                        db.users[sender].lastWork = Date.now()
                        saveDB()
                        reply(`💼 You worked and earned $${earn}!\n💰 New balance: $${db.users[sender].balance}`)
                        break
                    case 'give': case 'pay':
                        const target = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                        const amount = parseInt(args[1])
                        if (!target ||!amount || amount <= 0) return reply('Usage:.give @user 100')
                        if (db.users[sender].balance < amount) return reply('❌ Insufficient funds!')
                        db.users[sender].balance -= amount
                        db.users[target].balance += amount
                        saveDB()
                        reply(`✅ Sent $${amount} to @${target.split('@')[0]}\n💰 Your balance: $${db.users[sender].balance}`)
                        break
                    case 'gamble':
                        const bet = parseInt(q)
                        if (!bet || bet <= 0) return reply('Bet amount?')
                        if (db.users[sender].balance < bet) return reply('❌ Insufficient funds!')
                        const win = Math.random() > 0.5
                        if (win) {
                            db.users[sender].balance += bet
                            reply(`🎉 You won $${bet}!\n💰 New balance: $${db.users[sender].balance}`)
                        } else {
                            db.users[sender].balance -= bet
                            reply(`💸 You lost $${bet}!\n💰 New balance: $${db.users[sender].balance}`)
                        }
                        saveDB()
                        break
                    case 'shop':
                        reply(`*🏪 SHOP*\n\n1. VIP Role - $5000\n2. Custom Name Color - $2000\n3. Bot Prefix Change - $10000\n\nUse: ${global.prefix}buy <item number>`)
                        break
                    case 'buy':
                        const item = parseInt(q)
                        const prices = { 1: 5000, 2: 2000, 3: 10000 }
                        if (!prices[item]) return reply('Invalid item!')
                        if (db.users[sender].balance < prices[item]) return reply('❌ Insufficient funds!')
                        db.users[sender].balance -= prices[item]
                        saveDB()
                        reply(`✅ Purchased item ${item} for $${prices[item]}!\n💰 Balance: $${db.users[sender].balance}`)
                        break

                    // SEARCH
                    case 'google':
                        if (!q) return reply('Search query?')
                        reply(`🔍 https://www.google.com/search?q=${encodeURIComponent(q)}`)
                        break
                    case 'wiki': case 'wikipedia':
                        if (!q) return reply('Search query?')
                        try {
                            const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`)
                            reply(`*${res.data.title}*\n\n${res.data.extract}`)
                        } catch { reply('❌ Not found on Wikipedia') }
                        break
                    case 'npm':
                        if (!q) return reply('Package name?')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/search/npm?q=${encodeURIComponent(q)}`)
                            const pkg = res.data.result[0]
                            reply(`📦 *${pkg.name}*\n${pkg.description}\n\n🔗 ${pkg.links.npm}`)
                        } catch { reply('❌ Package not found') }
                        break
                    case 'github':
                        if (!q) return reply('Repo name?')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/search/github?q=${encodeURIComponent(q)}`)
                            const repo = res.data.result[0]
                            reply(`📁 *${repo.full_name}*\n⭐ Stars: ${repo.stars}\n🔗 ${repo.url}\n\n${repo.description}`)
                        } catch { reply('❌ Repo not found') }
                        break
                    case 'weather':
                        if (!q) return reply('City name?')
                        try {
                            const res = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`)
                            reply(`🌤️ ${res.data}`)
                        } catch { reply('❌ Weather fetch failed') }
                        break
                    case 'movie':
                        if (!q) return reply('Movie title?')
                        try {
                            const res = await axios.get(`${global.xwolf}/api/xcasper/search?q=${encodeURIComponent(q)}&type=movie&page=1&perPage=1`)
                            const movie = res.data.result[0]
                            reply(`🎬 *${movie.title}*\n📅 ${movie.year}\n⭐ ${movie.rating}\n\n${movie.description}\n\n🔗 ${movie.url}`)
                        } catch { reply('❌ Movie not found') }
                        break

                    // UTILITY
                    case 'ssweb': case 'screenshot':
                        if (!q) return reply('URL?')
                        react('📸')
                        try {
                            await sock.sendMessage(from, { image: { url: `https://image.thum.io/get/width/1920/crop/1080/${q}` } }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Screenshot failed') }
                        break
                    case 'calc': case 'calculator':
                        if (!q) return reply('Expression?')
                        try {
                            const result = eval(q.replace(/[^0-9+\-*/().]/g, ''))
                            reply(`🧮 ${q} = ${result}`)
                        } catch { reply('❌ Invalid expression') }
                        break
                    case 'translate': case 'tr':
                        if (args.length < 2) return reply(`Usage: ${global.prefix}tr en Hello`)
                        const lang = args[0]
                        const text = args.slice(1).join(' ')
                        try {
                            const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`)
                            reply(`*Translated (${lang}):*\n${res.data.responseData.translatedText}`)
                        } catch { reply('❌ Translation failed') }
                        break
                    case 'tts': case 'speak':
                        if (!q) return reply('Text to speak?')
                        react('🔊')
                        try {
                            const res = await axios.get(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=en&client=tw-ob`, { responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg', ptt: true }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ TTS failed') }
                        break

                    default:
                        if (body.startsWith(global.prefix)) reply(`❌ Command *${command}* not found! Use ${global.prefix}menu`)
                }

            } catch (e) {
                console.error(e)
                sock.sendMessage(from, { text: '❌ Error occurred!' }, { quoted: msg })
            }
        })

        // Welcome & Goodbye
        sock.ev.on('group-participants.update', async (update) => {
            try {
                const { id, participants, action } = update
                if (!db.groups[id]) return
                if (action === 'add' && db.groups[id].welcome) {
                    for (let user of participants) {
                        await sock.sendMessage(id, { text: `Welcome @${user.split('@')[0]}! 🎉`, mentions: [user] })
                    }
                }
                if (action === 'remove' && db.groups[id].goodbye) {
                    for (let user of participants) {
                        await sock.sendMessage(id, { text: `Goodbye @${user.split('@')[0]} 👋`, mentions: [user] })
                    }
                }
            } catch (e) { console.error(e) }
        })

    } catch (err) {
        console.error('Connection failed:', err)
        setTimeout(connectToWhatsApp, 5000)
    }
}

connectToWhatsApp()

app.get('/', (req, res) => res.send('✅ Bot is connected!'))
app.listen(port, () => console.log(`Server running on port ${port}`))
