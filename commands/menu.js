import config from '../config.js'

export default {
    name: "menu",
    aliases: ["help", "list", "commands"],
    run: async ({ sock, m, from }) => {
        const menuText = `
╭━━━〔 *${config.botname}* 〕━━━⬣
┃ 📱 Version: ${config.version}
┃ 👑 Owner: ${config.ownernumber}
┃ 🔧 Mode: ${config.mode}
┃ 📝 Prefix: ${config.prefix}
┃ 👥 Status: Group: CODER_WHITEHAT 𝐕1
┃ 🖥️ Host: ${config.host}
┃ 💻 Platform: ${config.platform}
╰━━━━━━━━━━━━━━━⬣

╭━━〔 *ᴄᴏᴍᴀɴᴅs* 〕━━⬣
┃
┃   ⫷ 𝐌𝐄𝐃𝐈𝐀 ⫸
┃ ${config.prefix}sᴛɪᴄᴋᴇʀ
┃ ${config.prefix}sᴛɪᴄᴋᴇʀᴠɪᴅ
┃ ${config.prefix}ᴛᴏɪᴍᴀɢᴇ
┃ ${config.prefix}ᴛᴏᴠɪᴅᴇᴏ
┃ ${config.prefix}ᴛᴏᴀᴜᴅɪᴏ
┃ ${config.prefix}ᴛᴏᴠᴏɪᴄᴇ
┃ ${config.prefix}ᴛᴏᴜʀʟ
┃ ${config.prefix}ᴛᴏɢɪꜰ
┃
┃   ⫷ 𝐎𝐖𝐍𝐄𝐑 ⫸
┃ ${config.prefix}ᴏᴡɴᴇʀ
┃ ${config.prefix}ᴘɪɴɢ
┃ ${config.prefix}ʀᴜɴᴛɪᴍᴇ
┃ ${config.prefix}ᴀʟɪᴠᴇ
┃ ${config.prefix}ʙʀᴏᴀᴅᴄᴀsᴛ
┃
┃   ⫷ 𝐆𝐑𝐎𝐔𝐏 ⫸
┃ ${config.prefix}ᴋɪᴄᴋ @user
┃ ${config.prefix}ᴀᴅᴅ <num>
┃ ${config.prefix}ᴘʀᴏᴍᴏᴛᴇ @user
┃ ${config.prefix}ᴛᴀɢᴀʟʟ
┃ ${config.prefix}ᴏᴘᴇɴ
┃ ${config.prefix}ᴄʟᴏsᴇ
┃ ${config.prefix}ɢᴇᴛʟɪɴᴋ
┃
┃   ⫷ 𝐀𝐈 ⫸
┃ ${config.prefix}ᴀɪ <question>
┃ ${config.prefix}ɪᴍᴀɢɪɴᴇ <prompt>
┃ ${config.prefix}ᴄʜᴀᴛʙᴏᴛ on/off
┃
┃   ⫷ 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ⫸
┃ ${config.prefix}ᴘʟᴀʏ <song>
┃ ${config.prefix}ʏᴛᴍᴘ3 <link>
┃ ${config.prefix}ʏᴛᴍᴘ4 <link>
┃ ${config.prefix}ᴛɪᴋᴛᴏᴋ <link>
┃ ${config.prefix}ɪɢ <link>
┃
┃   ⫷ 𝐆𝐀𝐌𝐄𝐒 ⫸
┃ ${config.prefix}ᴛɪᴄᴛᴀᴄᴛᴏᴇ @user
┃ ${config.prefix}ɴᴜᴍɢᴜᴇss
┃ ${config.prefix}ᴛʀɪᴠɪᴀ
┃
╰━━━━━━━━━━━━━━━⬣
> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ CODER_WHITEHAT
`.trim()

        await sock.sendMessage(from, { text: menuText });
    }
}
