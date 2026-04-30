import config from '../config.js'

export default {
    name: "alive",
    run: async ({ sock, m, from }) => {
        await sock.sendMessage(from, { 
            text: `*${config.botname}* is alive!\n\nVersion: ${config.version}\nMode: ${config.mode}\nPrefix: ${config.prefix}` 
        })
    }
}
