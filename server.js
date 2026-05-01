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
global.ownernumber = '263771405118' // <-- CHANGED TO YOUR NUMBER
global.prefix = '.'
global.mode = 'public'
global.version = '3.0.0'
global.host = 'Railway'
global.platform = process.platform
global.startTime = Date.now()

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
        // FORCE CLEAN SESSION - prevents "No sessions" error
        if (fs.existsSync('auth_info')) {
            fs.rmSync('auth_info', { recursive: true, force: true })
            console.log('🗑️ Deleted old auth_info folder')
        }
        if (fs.existsSync('auth_info.zip')) {
            fs.unlinkSync('auth_info.zip')
            console.log('🗑️ Deleted auth_info.zip')
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

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                console.log('Connection closed:', statusCode)
                if (statusCode!== DisconnectReason.loggedOut) {
                    console.log('Reconnecting...')
                    setTimeout(connectToWhatsApp, 3000)
                } else {
                    console.log('Logged out. Delete auth_info and restart.')
                }
            } else if (connection === 'open') {
                console.log('✅ Bot connected to WhatsApp!')
                if (db.settings.autobio) {
                    setInterval(() => {
                        sock.updateProfileStatus(`🤖 ${global.botname} | Runtime: ${runtime()} | Mode: ${global.mode}`)
                    }, 60000)
                }
            } else if (connection === 'connecting') {
                console.log('Connecting to WhatsApp...')
            }

            // AUTO PAIRING CODE FOR YOUR NUMBER
            if (!sock.authState.creds.registered) {
                setTimeout(async () => {
                    try {
                        const code = await sock.requestPairingCode(global.ownernumber)
                        console.log(`\n\n=== PAIRING CODE ===`)
                        console.log(`Number: ${global.ownernumber}`)
                        console.log(`Code: ${code}`)
                        console.log(`====================\n\n`)
                    } catch (e) {
                        console.log('Pairing code error:', e.message)
                    }
                }, 3000)
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
                            const cleanNum = q.replace(/[^0-9]/g, '')
                            if (cleanNum.length < 11) return reply('❌ Invalid number. Use full country code: 263771234567')
                            const { state: pairState, saveCreds: savePairCreds } = await useMultiFileAuthState(`./pair_${cleanNum}`)
                            const pairSock = makeWASocket({
                                auth: pairState,
                                printQRInTerminal: false,
                                logger: pino({ level: 'silent' }),
                                browser: ['Ubuntu', 'Chrome', '20.0.04']
                            })
                            pairSock.ev.on('creds.update', savePairCreds)
                            await new Promise(resolve => setTimeout(resolve, 2000))
                            if (!pairSock.authState.creds.registered) {
                                const code = await pairSock.requestPairingCode(cleanNum)
                                reply(`*PAIRING CODE FOR ${cleanNum}*\n\nCode: *${code}*\n\n1. WhatsApp > Linked Devices\n2. Link with phone number\n3. Enter this code\n\n_Expires in 60s_`)
                                setTimeout(() => pairSock.end(), 60000)
                            } else reply('✅ Number already registered!')
                            react('✅')
                        } catch (e) {
                            console.log('Pair error:', e)
                            reply('❌ Error. Number may be banned or try again.')
                        }
                        break

                    case 'menu': case 'help': case 'list':
                        const menu = `╭━━━〔 *${global.botname}* 〕━━━⬣
┃ 📱 Version: ${global.version}
┃ 👑 Owner: ${global.ownername}
┃ ⏰ Runtime: ${runtime()}
┃ 🔧 Mode: ${global.mode.toUpperCase()}
┃ 📝 Prefix: ${global.prefix}
┃ 🖥️ Host: ${global.host}
╰━━━━━━━━━━━━━━━⬣

╭━━〔 *ᴄᴏᴍᴀɴᴅs* 〕━━⬣
┃ ⫷ 𝐌𝐄𝐃𝐈𝐀 ⫸
┃ +${global.prefix}sticker +${global.prefix}toimage +${global.prefix}tovideo
┃ +${global.prefix}toaudio +${global.prefix}removebg
┃ ⫷ 𝐎𝐖𝐍𝐄𝐑 ⫸
┃ +${global.prefix}owner +${global.prefix}ping +${global.prefix}runtime
┃ +${global.prefix}public +${global.prefix}private +${global.prefix}autoread
┃ +${global.prefix}block +${global.prefix}unblock +${global.prefix}pair
┃ ⫷ 𝐆𝐑𝐎𝐔𝐏 ⫸
┃ +${global.prefix}kick +${global.prefix}add +${global.prefix}promote +${global.prefix}demote
┃ +${global.prefix}tagall +${global.prefix}hidetag +${global.prefix}group open/close
┃ +${global.prefix}link +${global.prefix}revoke
┃ ⫷ 𝐏𝐑𝐎𝐓𝐄𝐂𝐓𝐈𝐎𝐍 ⫸
┃ +${global.prefix}antilink on/off +${global.prefix}warn +${global.prefix}unwarn
┃ ⫷ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ⫸
┃ +${global.prefix}play +${global.prefix}ytmp3 +${global.prefix}ytmp4
┃ +${global.prefix}tiktok +${global.prefix}ig +${global.prefix}fb
┃ ⫷ 𝐀𝐈 𝐈𝐌𝐀𝐆𝐄 ⫸
┃ +${global.prefix}imagine <prompt>
┃ ⫷ 𝐀𝐈 𝐂𝐇𝐀𝐓 ⫸
┃ +${global.prefix}gpt +${global.prefix}claude +${global.prefix}gemini
┃ +${global.prefix}wormgpt
┃ ⫷ 𝐀𝐔𝐃𝐈𝐎 𝐄𝐅𝐄𝐂𝐓𝐒 ⫸
┃ +${global.prefix}bass +${global.prefix}robot +${global.prefix}nightcore
┃ ⫷ 𝐄𝐂𝐎𝐍𝐎𝐌𝐘 ⫸
┃ +${global.prefix}bal +${global.prefix}daily +${global.prefix}work
┃ +${global.prefix}give +${global.prefix}gamble
┃ ⫷ 𝐒𝐄𝐀𝐑𝐂𝐇 ⫸
┃ +${global.prefix}google +${global.prefix}wiki +${global.prefix}weather
┃ ⫷ 𝐔𝐓𝐈𝐋𝐈𝐓𝐘 ⫸
┃ +${global.prefix}ssweb +${global.prefix}calc +${global.prefix}tts
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

                    case 'sticker': case 's':
                        if (!quoted) return reply('Reply to image/video!')
                        const type = getContentType(quoted)
                        if (!type.includes('image') &&!type.includes('video')) return reply('Reply to media!')
                        react('⏳')
                        const mediaStream = await downloadContentFromMessage(quoted[type], type.includes('image')? 'image' : 'video')
                        let mediaBuffer = Buffer.from([])
                        for await (const chunk of mediaStream) mediaBuffer = Buffer.concat([mediaBuffer, chunk])
                        await sock.sendMessage(from, { sticker: mediaBuffer }, { quoted: msg })
                        react('✅')
                        break
                    case 'toimage': case 'toimg':
                        if (!quoted?.stickerMessage) return reply('Reply to sticker!')
                        react('⏳')
                        const stickerStream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker')
                        let stickerBuffer = Buffer.from([])
                        for await (const chunk of stickerStream) stickerBuffer = Buffer.concat([stickerBuffer, chunk])
                        await sock.sendMessage(from, { image: stickerBuffer }, { quoted: msg })
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
                            const res = await axios.post('https://api.ryzendesu.vip/api/converter/webp-to-mp4', form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
                            await sock.sendMessage(from, { video: Buffer.from(res.data) }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Conversion failed') }
                        break
                    case 'toaudio': case 'tomp3':
                        if (!quoted?.videoMessage) return reply('Reply to video!')
                        react('⏳')
                        try {
                            const vidStream = await downloadContentFromMessage(quoted.videoMessage, 'video')
                            let vidBuf = Buffer.from([])
                            for await (const chunk of vidStream) vidBuf = Buffer.concat([vidBuf, chunk])
                            await sock.sendMessage(from, { audio: vidBuf, mimetype: 'audio/mpeg' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'removebg': case 'nobg':
                        if (!quoted?.imageMessage) return reply('Reply to an image!')
                        react('⏳')
                        try {
                            const imgStream = await downloadContentFromMessage(quoted.imageMessage, 'image')
                            let imgBuf = Buffer.from([])
                            for await (const chunk of imgStream) imgBuf = Buffer.concat([imgBuf, chunk])
                            const form = new FormData()
                            form.append('image', imgBuf, 'image.jpg')
                            const res = await axios.post('https://api.ryzendesu.vip/api/tools/removebg', form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
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
                        const inviteCode = await sock.groupInviteCode(from)
                        reply(`https://chat.whatsapp.com/${inviteCode}`)
                        break
                    case 'revoke':
                        if (!isGroup ||!botAdmin) return reply('Bot needs admin!')
                        await sock.groupRevokeInvite(from)
                        reply('✅ Link revoked')
                        break

                    case 'antilink':
                        if (!isGroup ||!isAdmin) return reply('Admin only!')
                        if (args[0] === 'on') { db.groups[from].antilink = true; saveDB(); reply('✅ Antilink ON') }
                        else if (args[0] === 'off') { db.groups[from].antilink = false; saveDB(); reply('✅ Antilink OFF') }
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

                    case 'play': case 'song':
                        if (!q) return reply('Song name?')
                        react('🎵')
                        try {
                            let video, dlUrl
                            try {
                                const s1 = await axios.get(`https://api.ryzendesu.vip/api/search/yt?query=${encodeURIComponent(q)}`, { timeout: 10000 })
                                if (s1.data[0]) {
                                    video = s1.data[0]
                                    const d1 = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${video.url}`, { timeout: 15000 })
                                    dlUrl = d1.data.url
                                }
                            } catch {}
                            if (!dlUrl) {
                                const s2 = await axios.get(`https://api.vreden.my.id/api/ytplay?query=${encodeURIComponent(q)}`, { timeout: 10000 })
                                if (s2.data.result?.metadata) {
                                    video = s2.data.result.metadata
                                    dlUrl = s2.data.result.mp3.url
                                }
                            }
                            if (!dlUrl) return reply(`❌ Song not found: *${q}*\n\nTry mainstream songs or use.ytmp3 with link`)
                            await reply(`*Found:* ${video.title}\n_Downloading..._`)
                            await sock.sendMessage(from, {
                                audio: { url: dlUrl },
                                mimetype: 'audio/mpeg',
                                contextInfo: { externalAdReply: { title: video.title, thumbnailUrl: video.thumbnail }}
                            }, { quoted: msg })
                            react('✅')
                        } catch (e) {
                            console.log('Play error:', e.message)
                            reply('❌ All APIs down. Try.ytmp3 with YouTube link.')
                        }
                        break
                    case 'ytmp3': case 'yta':
                        if (!q) return reply('YouTube URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { audio: { url: res.data.url }, mimetype: 'audio/mpeg' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'ytmp4': case 'ytv':
                        if (!q) return reply('YouTube URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.url }, caption: res.data.title }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'tiktok': case 'tt':
                        if (!q) return reply('TikTok URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/ttdl?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.data.play }, caption: res.data.data.title }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'ig': case 'instagram':
                        if (!q) return reply('Instagram URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.data[0].url }, caption: 'Instagram DL' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break
                    case 'fb': case 'facebook':
                        if (!q) return reply('Facebook URL?')
                        react('⏳')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(q)}`)
                            await sock.sendMessage(from, { video: { url: res.data.data[0].url }, caption: 'Facebook DL' }, { quoted: msg })
                            react('✅')
                        } catch { reply('❌ Failed') }
                        break

                    case 'imagine': case 'gen': case 'generate':
                        if (!q) return reply('Give me a prompt!')
                        react('🎨')
                        try {
                            const res = await axios.get(`https://api.davidcyriltech.my.id/api/dalle?text=${encodeURIComponent(q)}`, {
                                responseType: 'arraybuffer',
                                timeout: 30000
                            })
                            await sock.sendMessage(from, {
                                image: Buffer.from(res.data),
                                caption: `*Prompt:* ${q}\n\n_Generated by DALL-E_`
                            }, { quoted: msg })
                            react('✅')
                        } catch (e) {
                            console.log('Imagine error:', e.message)
                            reply('❌ Image generation failed. Try again.')
                        }
                        break

                    case 'gpt':
                        if (!q) return reply('Ask something!')
                        react('🤖')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/ai/chatgpt?q=${encodeURIComponent(q)}`)
                            reply(res.data.response)
                            react('✅')
                        } catch { reply('❌ GPT error') }
                        break
                    case 'claude':
                        if (!q) return reply('Ask something!')
                        react('🧠')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/ai/claude?q=${encodeURIComponent(q)}`)
                            reply(`*Claude:*\n\n${res.data.response}`)
                            react('✅')
                        } catch { reply('❌ Claude error') }
                        break
                    case 'gemini':
                        if (!q) return reply('Ask something!')
                        react('💎')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/ai/gemini?q=${encodeURIComponent(q)}`)
                            reply(`*Gemini:*\n\n${res.data.response}`)
                            react('✅')
                        } catch { reply('❌ Gemini error') }
                        break
                    case 'wormgpt': case 'evil': case 'uncen':
                        if (!q) return reply('Ask something!')
                        react('🐛')
                        try {
                            const res = await axios.get(`https://api.ryzendesu.vip/api/ai/uncen?q=${encodeURIComponent(q)}`, { timeout: 20000 })
                            if (res.data.response) {
                                reply(`*WormGPT:*\n\n${res.data.response}`)
                                react('✅')
                            } else throw new Error('Empty response')
                        } catch {
                            try {
                                const res2 = await axios.get(`https://api.kenzap.com/v1/ai/luminai?text=${encodeURIComponent(q)}&uncensored=true`)
                                reply(`*WormGPT:*\n\n${res2.data.result}`)
                                react('✅')
                            } catch {
                                reply('❌ All uncensored APIs down. Use.gpt for normal questions.')
                            }
                        }
                        break

                    case 'bass': case 'robot': case 'nightcore':
                        if (!quoted?.audioMessage &&!quoted?.videoMessage) return reply('Reply to audio/video!')
                        react('🎧')
                        try {
                            const audioType = quoted.audioMessage? 'audio' : 'video'
                            const audioStream = await downloadContentFromMessage(quoted[audioType + 'Message'], audioType)
                            let audioBuf = Buffer.from([])
                            for await (const chunk of audioStream) audioBuf = Buffer.concat([audioBuf, chunk])
                            const form = new FormData()
                            form.append('audio', audioBuf, 'audio.mp3')
                            const res = await axios.post(`https://api.ryzendesu.vip/api/audio/${command}`, form, { headers: form.getHeaders(), responseType: 'arraybuffer' })
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
                        db.users[sender].balance += 500
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
                        if (!db.users[target]) db.users[target] = { balance: 100, warns: 0, banned: false, lastDaily: 0, lastWork: 0 }
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
                    case 'weather':
                        if (!q) return reply('City name?')
                        try {
                            const res = await axios.get(`https://wttr.in/${encodeURIComponent(q)}?format=3`)
                            reply(`🌤️ ${res.data}`)
                        } catch { reply('❌ Weather fetch failed') }
                        break

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

        sock.ev.on('group-participants.update', async (update) => {
            try {
                const { id, participants, action } = update
                if (!db.groups[id]) return
                if (action === 'add' && db.groups[id].welcome) {
                    for (let user of participants) {
                        await sock.sendMessage(id, { text: `Welcome @${user.split('@')[0]}! 🎉`, mentions: })
                    }
                }
                if (action === 'remove' && db.groups[id].goodbye) {
                    for (let user of participants) {
                        await sock.sendMessage(id, { text: `Goodbye @${user.split('@')[0]} 👋`, mentions: })
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
