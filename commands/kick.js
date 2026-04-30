import config from '../config.js'

export default {
    name: "kick",
    aliases: ["remove"],
    run: async ({ sock, m, args, from, isGroup, isAdmin, isBotAdmin, participants }) => {
        if (!isGroup) return await sock.sendMessage(from, { text: "Group only command" })
        if (!isAdmin) return await sock.sendMessage(from, { text: "Only admins can use this" })
        if (!isBotAdmin) return await sock.sendMessage(from, { text: "Make me admin first" })
        
        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
        const targets = mentioned.length? mentioned : quoted? [quoted] : []
        
        if (!targets.length) return await sock.sendMessage(from, { text: `Usage: ${config.prefix}kick @user\nOr reply to user with ${config.prefix}kick` })
        
        try {
            await sock.groupParticipantsUpdate(from, targets, "remove")
            await sock.sendMessage(from, { text: `Kicked ${targets.length} user(s) ✅` })
        } catch (e) {
            await sock.sendMessage(from, { text: "Failed to kick. Check my admin perms" })
        }
    }
}
