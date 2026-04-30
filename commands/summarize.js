import axios from 'axios'
import config from '../config.js'

export default {
    name: "summarize",
    aliases: ["sum", "tldr"],
    run: async ({ sock, m, args, from }) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const text = args.join(" ") || quoted?.conversation || quoted?.extendedTextMessage?.text
        
        if (!text) return await sock.sendMessage(from, { text: `Reply to a message or use: ${config.prefix}summarize <long text>` })
        
        await sock.sendMessage(from, { react: { text: "📝", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/ai/summarize?q=${encodeURIComponent(text)}`, { timeout: 30000 })
            await sock.sendMessage(from, { text: `*Summary:*\n${res.data.result || "Failed to summarize"}` })
        } catch (e) {
            await sock.sendMessage(from, { text: "Summarize API failed" })
        }
    }
}
