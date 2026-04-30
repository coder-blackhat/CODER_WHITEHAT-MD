import axios from 'axios'
import config from '../config.js'

export default {
    name: "ytmp4v2",
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}ytmp4v2 <youtube link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Downloading MP4..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/youtube/mp4?url=${encodeURIComponent(url)}`, { timeout: 120000 })
            const videoUrl = res.data.result || res.data.url || res.data.download
            if (!videoUrl) return await sock.sendMessage(from, { text: "MP4 not found" })
            await sock.sendMessage(from, { video: { url: videoUrl } })
        } catch (e) {
            await sock.sendMessage(from, { text: "YTMP4V2 failed" })
        }
    }
}
