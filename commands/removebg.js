import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../config.js'

export default {
    name: "removebg",
    aliases: ["rmbg", "nobg"],
    run: async ({ sock, m, from }) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const msg = quoted ? { message: quoted } : m
        
        if (!msg.message?.imageMessage) {
            return await sock.sendMessage(from, { text: `Reply to an image with ${config.prefix}removebg` })
        }
        
        await sock.sendMessage(from, { text: "Removing background..." })
        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            const base64 = buffer.toString('base64')
            
            const res = await axios.post('https://apis.xwolf.space/api/ai/removebg', {
                image: `data:image/jpeg;base64,${base64}`
            }, { 
                timeout: 45000,
                responseType: 'arraybuffer'
            })
            
            await sock.sendMessage(from, {
                image: Buffer.from(res.data),
                caption: "Background removed ✅"
            })
        } catch (e) {
            await sock.sendMessage(from, { text: "RemoveBG failed. Try a clearer image." })
        }
    }
}
