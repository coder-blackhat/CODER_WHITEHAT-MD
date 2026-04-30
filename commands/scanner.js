import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../config.js'

export default {
    name: "scanner",
    aliases: ["ocr", "read"],
    run: async ({ sock, m, from }) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const msg = quoted ? { message: quoted } : m
        
        if (!msg.message?.imageMessage) {
            return await sock.sendMessage(from, { text: `Reply to an image with ${config.prefix}scanner` })
        }
        
        await sock.sendMessage(from, { react: { text: "🔍", key: m.key } })
        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            const base64 = buffer.toString('base64')
            
            const res = await axios.post('https://apis.xwolf.space/api/ai/scanner', {
                image: `data:image/jpeg;base64,${base64}`
            }, { timeout: 30000 })
            
            await sock.sendMessage(from, { text: `*Scanned Text:*\n${res.data.result || "No text found"}` })
        } catch (e) {
            await sock.sendMessage(from, { text: "Scanner API failed. Make sure image has clear text." })
        }
    }
}
