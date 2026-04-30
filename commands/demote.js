import config from '../config.js'

export default {
    name: "demote",
    aliases: ["unadmin"],
    run: async ({ sock, m, args, from, isGroup, isAdmin, isBotAdmin }) => {
        if (!isGroup) return await sock.sendMessage(from, { text: "Group only" })
        if (!isAdmin) return await sock.sendMessage(from, { text: "Admins only" })
        if (!isBotAdmin) return await sock.sendMessage(from, { text: "Bot needs admin" })
        
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
        const targets = mentioned.length? mentioned : quoted? [quoted] : []
        
        if (!targets.length) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}demote @user` })
        
        try {
            await sock.groupParticipantsUpdate(from, targets, "demote")
            await sock.sendMessage(from, { text: `Demoted ✅` })
        } catch (e) {
            await sock.sendMessage(from, { text: "Failed to demote" })
        }
    }
}
