import axios from 'axios'
import config from '../config.js'

export default {
    name: "yta2",
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}yta2 <search>` })
        const query = args.join(" ")
        await sock.sendMessage(from, { text: "Fetching YTA2..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/download/yta2?q=${encodeURIComponent(query)}`, { timeout: 60000 })
            const audioUrl = res.data.result || res.data.url || res.data.download
            if (!audioUrl) return await sock.sendMessage(from, { text: "Not found" })
            await sock.sendMessage(from, { audio: { url: audioUrl }, mimetype: 'audio/mpeg' })
        } catch (e) {
            await sock.sendMessage(from, { text: "YTA2 failed" })
        }
    }
}
