import axios from 'axios'
import config from '../config.js'

export default {
    name: "imagine",
    aliases: ["img", "ɪᴍᴀɢɪɴᴇ", "dalle"],
    run: async ({ sock, m, args, from }) => {
        if (!args[0]) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}imagine <prompt>` })

        const prompt = args.join(" ")
        await sock.sendMessage(from, { text: "Generating image..." })

        try {
            // Free API - may be slow
            const res = await axios.get(`https://api.ryzendesu.vip/api/ai/flux?prompt=${encodeURIComponent(prompt)}`, {
                responseType: 'arraybuffer'
            })

            await sock.sendMessage(from, {
                image: Buffer.from(res.data),
                caption: `Prompt: ${prompt}`
            })
        } catch (e) {
            await sock.sendMessage(from, { text: "Image generation failed. API might be down." })
        }
    }
}
