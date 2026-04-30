import axios from 'axios'
import config from '../config.js'

export default {
    name: "tosticker",
    aliases: ["s", "sticker", "v2s"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}tosticker <image/video url>\nOr reply to an image/video with ${config.prefix}tosticker` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Converting to sticker..." })
        try {
            const endpoint = url.includes('.mp4') || url.includes('video')? 'video-to-sticker' : 'img-to-sticker'
            const res = await axios.get(`https://apis.xwolf.space/api/converter/${endpoint}?url=${encodeURIComponent(url)}`, { timeout: 60000 })
            const stickerUrl = res.data.result || res.data.url || res.data.download
            if (!stickerUrl) return await sock.sendMessage(from, { text: "Conversion failed" })
            await sock.sendMessage(from, { sticker: { url: stickerUrl } })
        } catch (e) {
            await sock.sendMessage(from, { text: "Sticker conversion failed" })
        }
    }
}
