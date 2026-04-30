import config from '../config.js'

export default {
    name: "tagall",
    aliases: ["everyone", "hidetag"],
    run: async ({ sock, m, args, from, isGroup, isAdmin, participants }) => {
        if (!isGroup) return await sock.sendMessage(from, { text: "Group only" })
        if (!isAdmin) return await sock.sendMessage(from, { text: "Admins only" })
        
        const text = args.join(" ") || "Tagging everyone"
        const mentions = participants.map(p => p.id)
        
        await sock.sendMessage(from, { 
            text: `${text}\n\n${mentions.map(u => '@' + u.split('@')[0]).join(' ')}`,
            mentions 
        })
    }
}
