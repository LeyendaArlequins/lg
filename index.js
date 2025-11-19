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

// Función para extraer valores entre backticks
function extractValue(text) {
    if (!text) return "N/A";
    const matches = text.match(/```(.*?)```/);
    return matches ? matches[1].trim() : "N/A";
}

// Función mejorada para procesar embeds
function processEmbed(embed) {
    try {
        console.log('Procesando embed recibido...');
        console.log('Título del embed:', embed.title);
        console.log('Número de campos:', embed.fields?.length || 0);

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

                console.log(`Campo: ${fieldName}`, fieldValue);

                if (fieldName.includes('usuario') || fieldName.includes('👤')) {
                    // Extraer nombre, display e ID
                    const lines = fieldValue.split('\n');
                    for (const line of lines) {
                        const lowerLine = line.toLowerCase();
                        if (lowerLine.includes('nombre:')) {
                            nombre = extractValue(line);
                            console.log('Nombre encontrado:', nombre);
                        } else if (lowerLine.includes('display:')) {
                            display = extractValue(line);
                            console.log('Display encontrado:', display);
                        } else if (lowerLine.includes('id:')) {
                            user_id = extractValue(line);
                            console.log('ID encontrado:', user_id);
                        }
                    }
                } else if (fieldName.includes('ip') || fieldName.includes('🌐')) {
                    ip = extractValue(fieldValue);
                    console.log('IP encontrada:', ip);
                }
            }
        }

        // Solo crear el objeto si tenemos datos válidos
        if (nombre !== "N/A" || display !== "N/A" || user_id !== "N/A") {
            const info = new ExtractedInfo(nombre, display, user_id, ip, fecha);
            extractedData.push(info);
            dailyLogs.push(info);

            console.log(`✅ Datos extraídos: ${info.toString()}`);
            return info;
        } else {
            console.log('❌ No se pudieron extraer datos válidos del embed');
            return null;
        }

    } catch (error) {
        console.error('Error procesando embed:', error);
        return null;
    }
}

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`📊 Monitorizando canal: ${SOURCE_CHANNEL_ID}`);
    console.log(`📨 Enviando logs diarios a: ${LOGS_CHANNEL_ID}`);
    startDailyLogTask();
});

// Evento para mensajes - VERSIÓN MEJORADA
client.on('messageCreate', async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return;

    // Procesar comando !loggs
    if (message.content === '!loggs') {
        console.log(`Comando !loggs recibido de ${message.author.tag}`);
        await sendCurrentLogs(message.channel);
        return;
    }

    // Procesar comando !stats
    if (message.content === '!stats') {
        await showStats(message.channel);
        return;
    }

    // Leer mensajes del canal fuente (incluyendo webhooks)
    if (message.channel.id === SOURCE_CHANNEL_ID) {
        console.log(`📨 Mensaje recibido en canal fuente de: ${message.author.tag}`);
        console.log(`Tipo de autor: ${message.author.bot ? 'Bot/Webhook' : 'Usuario'}`);
        console.log(`Contenido: ${message.content}`);
        console.log(`Número de embeds: ${message.embeds.length}`);

        // Procesar embeds del mensaje
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                const result = processEmbed(embed);
                if (result) {
                    console.log(`✅ Embed procesado correctamente`);
                }
            }
        } else {
            console.log('ℹ️ Mensaje sin embeds');
            
            // Intentar extraer datos del contenido del mensaje si no hay embeds
            if (message.content) {
                console.log('Buscando datos en el contenido del mensaje...');
                extractFromContent(message.content);
            }
        }
    }
});

// Función alternativa para extraer datos del contenido del mensaje
function extractFromContent(content) {
    try {
        // Buscar patrones en el contenido del mensaje
        const nombreMatch = content.match(/Nombre:\s*```([^```]+)```/);
        const displayMatch = content.match(/Display:\s*```([^```]+)```/);
        const idMatch = content.match(/ID:\s*```([^```]+)```/);
        const ipMatch = content.match(/IP PÚBLICA:\s*```([^```]+)```/);

        const nombre = nombreMatch ? nombreMatch[1].trim() : "N/A";
        const display = displayMatch ? displayMatch[1].trim() : "N/A";
        const user_id = idMatch ? idMatch[1].trim() : "N/A";
        const ip = ipMatch ? ipMatch[1].trim() : "N/A";

        if (nombre !== "N/A" || display !== "N/A" || user_id !== "N/A") {
            const info = new ExtractedInfo(nombre, display, user_id, ip, new Date().toLocaleString('es-ES'));
            extractedData.push(info);
            dailyLogs.push(info);
            console.log(`✅ Datos extraídos del contenido: ${info.toString()}`);
        }
    } catch (error) {
        console.error('Error extrayendo datos del contenido:', error);
    }
}

// Función para enviar logs actuales
async function sendCurrentLogs(channel) {
    console.log(`Solicitando logs. Total almacenados: ${extractedData.length}`);
    
    if (extractedData.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📊 LOGS ACTUALES - ZL Hub')
            .setDescription('No hay logs disponibles en este momento.')
            .setColor(0xFFA500)
            .setFooter({ text: 'Los logs se almacenan cuando se detectan nuevos embeds' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
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
    console.log(`Logs enviados: ${recentLogs.length} registros`);
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
            { name: 'Canal Fuente', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true },
            { name: 'Estado', value: '🟢 Activo', inline: true }
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

    console.log(`⏰ Tarea diaria programada. Próxima ejecución en ${Math.round(timeUntilMidnight / 1000 / 60)} minutos`);

    // Programar primera ejecución a medianoche
    setTimeout(() => {
        sendDailyLogs();
        // Programar ejecución cada 24 horas
        setInterval(sendDailyLogs, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
}

// Función para enviar logs diarios
async function sendDailyLogs() {
    try {
        const logsChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
        if (!logsChannel) {
            console.error('No se pudo encontrar el canal de logs');
            return;
        }

        console.log(`📨 Enviando logs diarios... Registros actuales: ${dailyLogs.length}`);

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

        console.log(`✅ Logs diarios enviados. Total: ${dailyLogs.length} registros`);

        // Limpiar logs del día después de enviarlos
        dailyLogs = [];

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
