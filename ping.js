```js
export default {
  name: "ping",
  run: async ({ sock, m, from }) => {
    await sock.sendMessage(from, { text: "Pong! 🏓" });
  },
};
