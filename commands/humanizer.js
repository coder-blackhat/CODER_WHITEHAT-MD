import axios from 'axios'
import config from '../config.js'

export default {
    name: "humanizer",
    aliases: ["humanize", "rewrite"],
    run: async ({ sock, m, args, from }) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const text = args.join(" ") || quoted?.conversation || quoted?.extendedTextMessage?.text
        
        if (!text) return await sock.sendMessage(from, { text: `Reply to text or use: ${config.prefix}humanizer <AI text>` })
        
        await sock.sendMessage(from, { react: { text: "✍️", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/ai/humanizer?q=${encodeURIComponent(text)}`, { timeout: 30000 })
            await sock.sendMessage(from, { text: `*Humanized:*\n${res.data.result || "Failed to humanize"}` })
        } catch (e) {
            await sock.sendMessage(from, { text: "Humanizer API failed" })
        }
    }
}
