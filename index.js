const { Client, GatewayIntentBits, PermissionsBitField, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;

// === CONFIG ===
const CHANNEL_ID_LISTEN = "1437151487141740637";  // Canal donde lee embeds
const CHANNEL_ID_SEND = "1440773871254110300";    // Canal donde envía logs diarios

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// === ARCHIVO DE LOGS DIARIO ===
function getTodayFile() {
    const date = new Date();
    const day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return path.join(__dirname, `logs_${day}.txt`);
}

// === GUARDAR LOG ===
client.on("messageCreate", (message) => {
    // Aceptar mensajes de webhook, pero ignorar bots normales
if (!message.webhookId && message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID_LISTEN) return;

    if (message.embeds.length === 0) return;
    const embed = message.embeds[0];

    // Extraer campos
    const campos = {};
    embed.fields?.forEach(f => {
        const name = f.name.toLowerCase();

        if (name.includes("usuario")) campos.usuario = f.value;
        if (name.includes("display")) campos.display = f.value;
        if (name.includes("ip")) campos.ip = f.value;
        if (name.includes("país") || name.includes("pais")) campos.pais = f.value;
        if (name.includes("estado")) campos.estado = f.value;
        if (name.includes("ciudad")) campos.ciudad = f.value;
        if (name.includes("id") && !name.includes("job")) campos.id = f.value;
    });

    const fecha = new Date().toLocaleString();
    const linea = `${campos.usuario || "N/A"} | ${campos.display || "N/A"} | ${campos.ip || "N/A"} | ${campos.pais || "N/A"} | ${campos.estado || "N/A"} | ${campos.ciudad || "N/A"} | ${campos.id || "N/A"} | ${fecha}\n`;

    const archivo = getTodayFile();
    fs.appendFileSync(archivo, linea, "utf8");
});

// === ENVIAR LOGS DEL DÍA AUTOMÁTICAMENTE ===
async function enviarLogsDiarios() {
    const archivo = getTodayFile();

    if (!fs.existsSync(archivo)) return; // Si no hay archivo, no envía nada

    const canal = await client.channels.fetch(CHANNEL_ID_SEND);
    if (!canal) return;

    const file = new AttachmentBuilder(archivo);

    await canal.send({
        content: "📄 **Logs del día:**",
        files: [file]
    });

    // Reiniciar archivo para no saturar Railway
    fs.unlinkSync(archivo);
}

// Ejecutar cada día a las 00:00
setInterval(() => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        enviarLogsDiarios();
    }
}, 60 * 1000); // Revisar cada minuto

// === COMANDO PARA OBTENER LOGS ACUMULADOS ===
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!loggs")) return;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const archivo = getTodayFile();

    if (!fs.existsSync(archivo)) {
        return message.reply("No hay logs todavía hoy.");
    }

    const file = new AttachmentBuilder(archivo);

    try {
        await message.author.send({
            content: `📄 Aquí están los registros acumulados del día:`,
            files: [file]
        });

        message.reply("📬 Logs enviados a tu DM.");
    } catch (err) {
        message.reply("❌ No pude enviarte mensaje privado. Activa tus DMs.");
    }
});

client.login(TOKEN);
