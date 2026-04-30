import axios from 'axios'
import config from '../config.js'

export default {
    name: "snapchat",
    aliases: ["snap", "spotlight"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}snapchat <snap link>` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Downloading Snapchat..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/download/snapchat?url=${encodeURIComponent(url)}`, { timeout: 60000 })
            const videoUrl = res.data.result || res.data.url || res.data.download
            if (!videoUrl) return await sock.sendMessage(from, { text: "Snap not found" })
            await sock.sendMessage(from, { video: { url: videoUrl }, caption: "Snapchat downloaded" })
        } catch (e) {
            await sock.sendMessage(from, { text: "Snapchat failed" })
        }
    }
}
