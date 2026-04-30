import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'
import { exec } from 'child_process'
import config from '../config.js'

export default {
    name: "sticker",
    aliases: ["s", "sᴛɪᴄᴋᴇʀ"],
    run: async ({ sock, m, from }) => {
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
        const msg = quoted? { message: quoted } : m

        if (!msg.message?.imageMessage &&!msg.message?.videoMessage) {
            return await sock.sendMessage(from, { text: `Reply to an image/video with ${config.prefix}sticker` })
        }

        await sock.sendMessage(from, { text: "Creating sticker..." })

        try {
            const buffer = await downloadMediaMessage(msg, 'buffer', {})
            const isVideo =!!msg.message.videoMessage
            const input = `temp_${Date.now()}`
            const output = `sticker_${Date.now()}.webp`

            fs.writeFileSync(input, buffer)

            const cmd = isVideo
               ? `ffmpeg -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -vcodec libwebp -lossless 1 -loop 0 -preset default -an -vsync 0 -s 512:512 -t 10 ${output}`
                : `ffmpeg -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -vcodec libwebp -lossless 1 -preset default -an -vsync 0 ${output}`

            exec(cmd, async (err) => {
                if (err ||!fs.existsSync(output)) {
                    return await sock.sendMessage(from, { text: "Failed to create sticker. Install ffmpeg: pkg install ffmpeg" })
                }
                const sticker = fs.readFileSync(output)
                await sock.sendMessage(from, { sticker })
                fs.unlinkSync(input)
                fs.unlinkSync(output)
            })
        } catch (e) {
            await sock.sendMessage(from, { text: "Error: " + e.message })
        }
    }
}
