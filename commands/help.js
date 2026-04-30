export default {
    name: "help",
    run: async ({ sock, m, from }) => {
        await sock.sendMessage(from, { 
            text: `*CODER-WHITEHAT-MD*\n\nCommands:\n!ping - Check if bot is alive\n!help - This menu` 
        });
    }
}
