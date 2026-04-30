export default {
    name: "getlink",
    aliases: ["link", "grouplink"],
    run: async ({ sock, m, from }) => {
        if (!m.key.remoteJid.endsWith('@g.us')) return await sock.sendMessage(from, { text: "This command only works in groups" })
        const code = await sock.groupInviteCode(from)
        await sock.sendMessage(from, { text: `https://chat.whatsapp.com/${code}` })
    }
}
