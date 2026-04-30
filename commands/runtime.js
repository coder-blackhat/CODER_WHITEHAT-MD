const startTime = Date.now()

export default {
    name: "runtime",
    aliases: ["uptime"],
    run: async ({ sock, m, from }) => {
        const uptime = Date.now() - startTime
        const seconds = Math.floor(uptime / 1000) % 60
        const minutes = Math.floor(uptime / (1000 * 60)) % 60
        const hours = Math.floor(uptime / (1000 * 60 * 60))
        
        await sock.sendMessage(from, { 
            text: `*Bot Runtime*\n${hours}h ${minutes}m ${seconds}s` 
        })
    }
}
