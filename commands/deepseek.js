import axios from 'axios'
import config from '../config.js'

export default {
    name: "deepseek",
    aliases: ["ds"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Ask DeepSeek: ${config.prefix}deepseek <question>` })
        const query = args.join(" ")
        await sock.sendMessage(from, { react: { text: "🔍", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/ai/deepseek?q=${encodeURIComponent(query)}`, { timeout: 30000 })
            await sock.sendMessage(from, { text: res.data.result || "No response" })
        } catch (e) {
            await sock.sendMessage(from, { text: "DeepSeek API down" })
        }
    }
}
