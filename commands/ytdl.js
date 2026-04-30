import axios from 'axios'
import config from '../config.js'

export default {
    name: "ytdl",
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}ytdl <youtube link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Downloading..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/youtube?url=${encodeURIComponent(url)}`, { timeout: 90000 })
            const dlUrl = res.data.result || res.data.url || res.data.download
            if (!dlUrl) return await sock.sendMessage(from, { text: "Not found" })
            await sock.sendMessage(from, { video: { url: dlUrl }, caption: "YouTube downloaded" })
        } catch (e) {
            await sock.sendMessage(from, { text: "YTDL failed" })
        }
    }
}
