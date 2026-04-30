import axios from 'axios'
import config from '../config.js'

export default {
    name: "tiktok",
    aliases: ["tt", "ttdl"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}tiktok <tiktok link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Downloading TikTok..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/tiktok?url=${encodeURIComponent(url)}`, { timeout: 60000 })
            const videoUrl = res.data.result || res.data.url || res.data.download
            if (!videoUrl) return await sock.sendMessage(from, { text: "TikTok not found" })
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: "TikTok downloaded ✅" })
        } catch (e) {
            await sock.sendMessage(from, { text: "TikTok API failed" })
        }
    }
}
