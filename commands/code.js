import axios from 'axios'
import config from '../config.js'

export default {
    name: "code",
    aliases: ["codeai", "gen"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}code <describe what to code>` })
        const prompt = args.join(" ")
        await sock.sendMessage(from, { react: { text: "💻", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/ai/code?q=${encodeURIComponent(prompt)}`, { timeout: 45000 })
            await sock.sendMessage(from, { text: res.data.result || "Failed to generate code" })
        } catch (e) {
            await sock.sendMessage(from, { text: "Code API failed" })
        }
    }
}
