import axios from 'axios'
import config from '../config.js'

export default {
    name: "lorem",
    aliases: ["picsum", "randomimg"],
    run: async ({ sock, m, args, from }) => {
        const width = args[0] || "800"
        const height = args[1] || "600"
        await sock.sendMessage(from, { react: { text: "🖼️", key: m.key } })
        try {
            const res = await axios.get(`https://apis.xwolf.space/api/ai/image/lorem-picsum?width=${width}&height=${height}`, {
                responseType: 'arraybuffer'
            })
            await sock.sendMessage(from, {
                image: Buffer.from(res.data),
                caption: `Random image ${width}x${height}`
            })
        } catch (e) {
            await sock.sendMessage(from, { text: "Lorem Picsum API failed" })
        }
    }
}
