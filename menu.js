export default {
  name: "menu",
  run: async ({ sock, from }) => {
    const menu = `
╔════════════════════════════════════╗
║ ⚠️ SYSTEM ONLINE...               
║ 🤖 INITIALIZING: CODER-WHITEHAT-MD      
╚════════════════════════════════════╝

┏━━⟪ CORE ⟫━━
┣ ≽ .ping
┣ ≽ .menu
┣ ≽ .owner
┗━━━━━━━━━━━━━━

┏━━⟪ UTILITIES ⟫━━
┣ ≽ .runtime
┣ ≽ .stats
┗━━━━━━━━━━━━━━

[ SYSTEM RUNNING SAFELY ]
Powered by: CODER_WHITEHAT
`;

    await sock.sendMessage(from, { text: menu });
  },
};
