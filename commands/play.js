import axios from 'axios'
import config from '../config.js'

export default {
    name: "play",
    aliases: ["song", "mp3", "dlmp3"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}play <song name or yt link>` })
        const query = args.join(" ")
        await sock.sendMessage(from, { text: "Downloading audio..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/download/dlmp3?q=${encodeURIComponent(query)}`, { timeout: 60000 })
            const audioUrl = res.data.result || res.data.url || res.data.download
            if (!audioUrl) return await sock.sendMessage(from, { text: "Audio not found" })
            await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' })
        } catch (e) {
            await sock.sendMessage(from, { text: "Play failed. Try.yta" })
        }
    }
}
