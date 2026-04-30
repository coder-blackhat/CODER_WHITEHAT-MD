import config from "./config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = new Map();
const aliases = new Map();
const cmdPath = path.join(__dirname, "commands");

console.log("Bot directory:", __dirname);
console.log("Looking for commands in:", cmdPath);

if (fs.existsSync(cmdPath)) {
    const commandFiles = fs.readdirSync(cmdPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(cmdPath, file);
        const cmd = await import(`file://${filePath}`);

        if (cmd.default?.name && cmd.default?.run) {
            commands.set(cmd.default.name, cmd.default);
            console.log(`Loaded command: ${cmd.default.name}`);

            // Register aliases
            if (cmd.default.aliases) {
                cmd.default.aliases.forEach(alias => {
                    aliases.set(alias, cmd.default.name)
                })
            }
        }
    }
}

export default async function handler(sock, msg) {
    try {
        const m = msg.messages[0];
        if (!m.message) return;

        const from = m.key.remoteJid;
        const text = m.message.conversation ||
                     m.message.extendedTextMessage?.text ||
                     m.message.imageMessage?.caption ||
                     m.message.videoMessage?.caption ||
                     "";

        if (!text.startsWith(config.prefix)) return;

        const args = text.slice(config.prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        // Check command name or alias
        const command = commands.get(cmdName) || commands.get(aliases.get(cmdName))
        if (!command) return;

        await command.run({ sock, m, args, from });
    } catch (e) {
        console.error("Handler Error:", e);
    }
}
