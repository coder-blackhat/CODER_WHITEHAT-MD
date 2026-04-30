import axios from 'axios'
import config from '../config.js'

export default {
    name: "tovideo",
    aliases: ["gif2mp4", "s2v"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}tovideo <gif url>\nOr reply to a sticker/gif with ${config.prefix}tovideo` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Converting to video..." })
        try {
            const endpoint = url.includes('.webp')? 'sticker-to-img' : 'gif-to-video'
            const res = await axios.get(`https://apis.xwolf.space/api/converter/${endpoint}?url=${encodeURIComponent(url)}`, { timeout: 60000 })
            const videoUrl = res.data.result || res.data.url || res.data.download
            if (!videoUrl) return await sock.sendMessage(from, { text: "Conversion failed" })
            await sock.sendMessage(from, { video: { url: videoUrl } })
        } catch (e) {
            await sock.sendMessage(from, { text: "Video conversion failed" })
        }
    }
}
