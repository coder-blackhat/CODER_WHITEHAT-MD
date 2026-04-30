import axios from 'axios'
import config from '../config.js'

export default {
    name: "ytmp3",
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}ytmp3 <youtube link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Converting to MP3..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/youtube/mp3?url=${encodeURIComponent(url)}`, { timeout: 90000 })
            const audioUrl = res.data.result || res.data.url || res.data.download
            if (!audioUrl) return await sock.sendMessage(from, { text: "MP3 not found" })
            await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' })
        } catch (e) {
            await sock.sendMessage(from, { text: "YTMP3 failed" })
        }
    }
}
