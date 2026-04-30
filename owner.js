import config from "../config.js";

export default {
  name: "owner",
  run: async ({ sock, from }) => {
    await sock.sendMessage(from, {
      text: `Owner: ${config.owner.join(", ")}`,
    });
  },
};
