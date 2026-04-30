import axios from 'axios'
import config from '../config.js'

export default {
    name: "tiktokaudio",
    aliases: ["tta", "ttmp3"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}tiktokaudio <tiktok link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Extracting TikTok audio..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/tiktok/audio?url=${encodeURIComponent(url)}`, { timeout: 60000 })
            const audioUrl = res.data.result || res.data.url || res.data.download
            if (!audioUrl) return await sock.sendMessage(from, { text: "Audio not found" })
            await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' })
        } catch (e) {
            await sock.sendMessage(from, { text: "TikTok audio failed" })
        }
    }
}
