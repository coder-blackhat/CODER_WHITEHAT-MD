import axios from 'axios'
import config from '../config.js'

export default {
    name: "togif",
    aliases: ["v2gif", "mp42gif"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}togif <video url>\nOr reply to a video with ${config.prefix}togif` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Converting to GIF..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/converter/video-to-gif?url=${encodeURIComponent(url)}`, { timeout: 90000 })
            const gifUrl = res.data.result || res.data.url || res.data.download
            if (!gifUrl) return await sock.sendMessage(from, { text: "GIF conversion failed" })
            await sock.sendMessage(from, { video: { url: gifUrl }, gifPlayback: true })
        } catch (e) {
            await sock.sendMessage(from, { text: "GIF conversion failed" })
        }
    }
}
