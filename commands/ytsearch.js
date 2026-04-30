import axios from 'axios'
import config from '../config.js'

export default {
    name: "ytsearch",
    aliases: ["yts"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}ytsearch <query>` })
        const query = args.join(" ")
        await sock.sendMessage(from, { react: { text: "🔍", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/youtube/search?q=${encodeURIComponent(query)}`, { timeout: 30000 })
            await sock.sendMessage(from, { text: `*YouTube Results:*\n${res.data.result || "No results"}` })
        } catch (e) {
            await sock.sendMessage(from, { text: "YT Search failed" })
        }
    }
}
