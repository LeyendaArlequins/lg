const { Client, GatewayIntentBits, EmbedBuilder, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const TOKEN = process.env.TOKEN;
// Configuración
const SOURCE_CHANNEL_ID = '1437151487141740637';
const LOGS_CHANNEL_ID = '1440773871254110300';

// Almacenamiento de datos
let extractedData = [];
let dailyLogs = [];

class ExtractedInfo {
    constructor(nombre, display, user_id, ip, fecha) {
        this.nombre = nombre;
        this.display = display;
        this.user_id = user_id;
        this.ip = ip;
        this.fecha = fecha;
    }
    
    toString() {
        return `${this.nombre} | ${this.display} | ${this.user_id} | ${this.ip} | ${this.fecha}`;
    }
}

// Crear el cliente con los intents necesarios
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Comandos
client.commands = new Collection();

// Función para extraer valores entre backticks
function extractValue(text) {
    if (!text) return "N/A";
    const matches = text.match(/```(.*?)```/);
    return matches ? matches[1].trim() : "N/A";
}

// Función para procesar embeds
function processEmbed(embed) {
    try {
        let nombre = "N/A";
        let display = "N/A";
        let user_id = "N/A";
        let ip = "N/A";
        let fecha = new Date().toLocaleString('es-ES');

        // Buscar en los campos del embed
        if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
                const fieldName = field.name.toLowerCase();
                const fieldValue = field.value || '';

                if (fieldName.includes('usuario')) {
                    // Extraer nombre, display e ID
                    const lines = fieldValue.split('\n');
                    for (const line of lines) {
                        const lowerLine = line.toLowerCase();
                        if (lowerLine.includes('nombre:')) {
                            nombre = extractValue(line);
                        } else if (lowerLine.includes('display:')) {
                            display = extractValue(line);
                        } else if (lowerLine.includes('id:')) {
                            user_id = extractValue(line);
                        }
                    }
                } else if (fieldName.includes('ip pública')) {
                    ip = extractValue(fieldValue);
                }
            }
        }

        // Crear objeto con la información extraída
        const info = new ExtractedInfo(nombre, display, user_id, ip, fecha);
        extractedData.push(info);
        dailyLogs.push(info);

        console.log(`Datos extraídos: ${info.toString()}`);
        return info;

    } catch (error) {
        console.error('Error procesando embed:', error);
        return null;
    }
}

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    startDailyLogTask();
});

// Evento para mensajes
client.on('messageCreate', async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return;

    // Procesar comando !loggs
    if (message.content === '!loggs') {
        await sendCurrentLogs(message.channel);
    }

    // Procesar comando !stats
    if (message.content === '!stats') {
        await showStats(message.channel);
    }

    // Leer embeds del canal fuente
    if (message.channel.id === SOURCE_CHANNEL_ID && message.embeds.length > 0) {
        for (const embed of message.embeds) {
            processEmbed(embed);
        }
    }
});

// Función para enviar logs actuales
async function sendCurrentLogs(channel) {
    if (extractedData.length === 0) {
        await channel.send('No hay logs disponibles.');
        return;
    }

    // Crear embed con los logs
    const embed = new EmbedBuilder()
        .setTitle('📊 LOGS ACTUALES - ZL Hub')
        .setColor(0x00FF00)
        .setTimestamp();

    // Tomar los últimos 50 registros
    const recentLogs = extractedData.slice(-50);
    let logDescription = '';

    recentLogs.forEach((log, index) => {
        logDescription += `**${index + 1}.** ${log.toString()}\n`;
    });

    embed.setDescription(logDescription.length > 4096 ? 
        logDescription.substring(0, 4093) + '...' : 
        logDescription
    );

    embed.setFooter({ 
        text: `Total de registros: ${extractedData.length} • ZL Hub`
    });

    await channel.send({ embeds: [embed] });
}

// Función para mostrar estadísticas
async function showStats(channel) {
    const totalLogs = extractedData.length;
    const today = new Date().toLocaleDateString('es-ES');
    const todayLogs = extractedData.filter(log => 
        log.fecha.includes(today)
    ).length;

    const embed = new EmbedBuilder()
        .setTitle('📈 ESTADÍSTICAS - ZL Hub')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Total de Logs', value: totalLogs.toString(), inline: true },
            { name: 'Logs Hoy', value: todayLogs.toString(), inline: true },
            { name: 'Canal Fuente', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true }
        )
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

// Tarea diaria para enviar logs
function startDailyLogTask() {
    // Calcular tiempo hasta la próxima medianoche
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    // Programar primera ejecución a medianoche
    setTimeout(() => {
        sendDailyLogs();
        // Programar ejecución cada 24 horas
        setInterval(sendDailyLogs, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);

    console.log('Tarea diaria programada. Próxima ejecución a las 00:00');
}

// Función para enviar logs diarios
async function sendDailyLogs() {
    try {
        const logsChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
        if (!logsChannel) {
            console.error('No se pudo encontrar el canal de logs');
            return;
        }

        if (dailyLogs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📊 LOGS DIARIOS - ZL Hub')
                .setDescription('No hay registros para el día de hoy.')
                .setColor(0xFFA500)
                .setTimestamp();

            await logsChannel.send({ embeds: [embed] });
            return;
        }

        // Crear embed para logs diarios
        const embed = new EmbedBuilder()
            .setTitle('📊 LOGS DIARIOS - ZL Hub')
            .setColor(0x00FF00)
            .setTimestamp();

        let logDescription = '';
        dailyLogs.forEach((log, index) => {
            logDescription += `**${index + 1}.** ${log.toString()}\n`;
        });

        embed.setDescription(logDescription.length > 4096 ? 
            logDescription.substring(0, 4093) + '...' : 
            logDescription
        );

        embed.addFields({
            name: `Resumen del día`,
            value: `**Total de registros:** ${dailyLogs.length}\n**Fecha:** ${new Date().toLocaleDateString('es-ES')}`
        });

        embed.setFooter({ 
            text: 'ZL Hub • Logs Automáticos Diarios' 
        });

        await logsChannel.send({ embeds: [embed] });

        // Limpiar logs del día después de enviarlos
        dailyLogs = [];

        console.log(`Logs diarios enviados. Total: ${dailyLogs.length} registros`);

    } catch (error) {
        console.error('Error enviando logs diarios:', error);
    }
}

// Manejo de errores
client.on('error', (error) => {
    console.error('Error del cliente:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

// Iniciar el bot
client.login(TOKEN);
