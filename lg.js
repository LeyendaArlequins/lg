const { Client, GatewayIntentBits, PermissionsBitField, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const CHANNEL_ID = "1437151487141740637";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// === CALCULAR SEMANA DEL AÑO ===
function getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
}

// === CAPTURAR MENSAJES NUEVOS ===
client.on("messageCreate", (message) => {
    if (message.author.bot) return;
    if (message.channel.id !== CHANNEL_ID) return;

    if (message.embeds.length === 0) return;

    const embed = message.embeds[0];

    // Extraer campos requeridos
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

    // Formato solicitado
    const linea = `${campos.usuario || "N/A"} | ${campos.display || "N/A"} | ${campos.ip || "N/A"} | ${campos.pais || "N/A"} | ${campos.estado || "N/A"} | ${campos.ciudad || "N/A"} | ${campos.id || "N/A"} | ${fecha}\n`;

    // Archivo semanal
    const semana = getWeekNumber();
    const archivo = path.join(__dirname, `logs_semana_${semana}.txt`);

    fs.appendFileSync(archivo, linea, "utf8");
});

// === COMANDO PARA ENVIAR LOGS POR DM (SOLO ADMINS) ===
client.on("messageCreate", async (message) => {
    if (!message.content.startsWith("!log")) return;

    // Verificar permisos
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply("❌ No tienes permisos para usar este comando.");
    }

    const semana = getWeekNumber();
    const archivo = path.join(__dirname, `logs_semana_${semana}.txt`);

    if (!fs.existsSync(archivo)) {
        return message.reply("No hay logs guardados esta semana.");
    }

    const file = new AttachmentBuilder(archivo);

    try {
        const dm = await message.author.send({
            content: `📄 Aquí están los logs de la semana ${semana}:`,
            files: [file]
        });

        await message.reply("📬 Logs enviados por DM.");
    } catch (err) {
        message.reply("❌ No pude enviarte mensaje privado. Activa tus DMs.");
    }
});

client.login("token");
