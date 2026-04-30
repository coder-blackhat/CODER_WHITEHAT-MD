import axios from 'axios'
import config from '../config.js'

export default {
    name: "toimg",
    aliases: ["s2img", "sticker2img"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}toimg <sticker url>\nOr reply to a sticker with ${config.prefix}toimg` })
        const url = args[0]
        await sock.sendMessage(from, { text: "Converting sticker to image..." })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/converter/sticker-to-img?url=${encodeURIComponent(url)}`, { timeout: 30000 })
            const imgUrl = res.data.result || res.data.url || res.data.download
            if (!imgUrl) return await sock.sendMessage(from, { text: "Conversion failed" })
            await sock.sendMessage(from, { image: { url: imgUrl } })
        } catch (e) {
            await sock.sendMessage(from, { text: "Sticker to image failed" })
        }
    }
}
