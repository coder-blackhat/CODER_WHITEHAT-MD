import axios from 'axios'
import config from '../config.js'

export default {
    name: "ytinfo",
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}ytinfo <youtube link>` })
        const url = args[0]
        await sock.sendMessage(from, { react: { text: "ℹ️", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/youtube/info?url=${encodeURIComponent(url)}`, { timeout: 30000 })
            await sock.sendMessage(from, { text: `*YouTube Info:*\n${res.data.result || "No info"}` })
        } catch (e) {
            await sock.sendMessage(from, { text: "YT Info failed" })
        }
    }
}
