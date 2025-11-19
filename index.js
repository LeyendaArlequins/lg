const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuración
const SOURCE_CHANNEL_ID = '1437151487141740637';
const LOGS_CHANNEL_ID = '1440773871254110300';
const LOG_FILE = 'logs.txt';
const DAILY_LOG_FILE = 'daily_logs.txt';
const TOKEN = process.env.TOKEN;
// Almacenamiento de datos - SOLO logs del día actual
let dailyLogs = [];

// Cargar logs diarios existentes del archivo (por si el bot se reinicia)
function loadDailyLogsFromFile() {
    try {
        if (fs.existsSync(DAILY_LOG_FILE)) {
            const data = fs.readFileSync(DAILY_LOG_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                const parts = line.split(' | ');
                if (parts.length >= 5) {
                    const info = new ExtractedInfo(parts[0], parts[1], parts[2], parts[3], parts[4]);
                    dailyLogs.push(info);
                }
            });
            console.log(`✅ Logs diarios cargados: ${dailyLogs.length} registros`);
        }
    } catch (error) {
        console.error('Error cargando logs diarios:', error);
    }
}

// Guardar log en archivo histórico
function saveLogToFile(info) {
    try {
        const logEntry = `${info.nombre} | ${info.display} | ${info.user_id} | ${info.ip} | ${info.fecha}\n`;
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
        console.log(`✅ Log guardado en histórico: ${info.toString()}`);
    } catch (error) {
        console.error('Error guardando log histórico:', error);
    }
}

// Guardar log diario en archivo
function saveDailyLogToFile(info) {
    try {
        const logEntry = `${info.nombre} | ${info.display} | ${info.user_id} | ${info.ip} | ${info.fecha}\n`;
        fs.appendFileSync(DAILY_LOG_FILE, logEntry, 'utf8');
    } catch (error) {
        console.error('Error guardando log diario:', error);
    }
}

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
    const matches = text.match(/```([^```]+)```/);
    return matches ? matches[1].trim() : "N/A";
}

// Función para procesar embeds
function processEmbed(embed) {
    try {
        console.log('\n=== NUEVO EMBED DETECTADO ===');
        console.log('Título:', embed.title);
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

                if (fieldName.includes('usuario') || fieldName.includes('👤')) {
                    const lines = fieldValue.split('\n');
                    for (const line of lines) {
                        if (line.includes('Nombre:')) {
                            nombre = extractValue(line);
                        } else if (line.includes('Display:')) {
                            display = extractValue(line);
                        } else if (line.includes('ID:')) {
                            user_id = extractValue(line);
                        }
                    }
                } else if (fieldName.includes('ip') || fieldName.includes('🌐')) {
                    ip = extractValue(fieldValue);
                }
            }
        }

        // Verificar si se extrajeron datos válidos
        if (nombre !== "N/A" || display !== "N/A" || user_id !== "N/A") {
            const info = new ExtractedInfo(nombre, display, user_id, ip, fecha);
            
            // Guardar en logs del día
            dailyLogs.push(info);
            
            // Guardar en archivos
            saveLogToFile(info); // Histórico completo
            saveDailyLogToFile(info); // Diario
            
            console.log(`✅ LOG GUARDADO: ${info.toString()}`);
            console.log(`📊 Total logs hoy: ${dailyLogs.length}`);
            return info;
        } else {
            console.log('❌ No se pudieron extraer datos del embed');
            return null;
        }

    } catch (error) {
        console.error('Error procesando embed:', error);
        return null;
    }
}

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`\n🤖 Bot conectado como ${client.user.tag}`);
    console.log(`📊 Monitorizando canal: ${SOURCE_CHANNEL_ID}`);
    console.log(`📨 Enviando logs diarios a: ${LOGS_CHANNEL_ID}`);
    
    // Cargar logs diarios existentes
    loadDailyLogsFromFile();
    console.log(`📁 Logs del día cargados: ${dailyLogs.length}`);
    
    startDailyLogTask();
});

// Evento para mensajes
client.on('messageCreate', async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return;

    // Procesar comando !loggs
    if (message.content === '!loggs') {
        console.log(`\n📋 Comando !loggs recibido de ${message.author.tag}`);
        await sendCurrentLogs(message.channel);
        return;
    }

    if (message.content === '!stats') {
        await showStats(message.channel);
        return;
    }

    // Leer mensajes del canal fuente
    if (message.channel.id === SOURCE_CHANNEL_ID) {
        console.log(`\n📨 Mensaje recibido en canal fuente de: ${message.author.tag}`);
        console.log(`Embeds: ${message.embeds.length}`);

        // Procesar embeds del mensaje
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                processEmbed(embed);
            }
        }
    }
});

// Función para enviar logs actuales (!loggs)
async function sendCurrentLogs(channel) {
    console.log(`\n📊 Solicitando logs actuales. Total hoy: ${dailyLogs.length}`);
    
    if (dailyLogs.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📊 LOGS ACTUALES - ZL Hub')
            .setDescription('No hay logs disponibles para hoy.')
            .setColor(0xFFA500)
            .setFooter({ text: 'Los logs se reinician cada día a las 00:00' })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        return;
    }

    // Crear embed con los logs del día
    const embed = new EmbedBuilder()
        .setTitle('📊 LOGS ACTUALES - ZL Hub')
        .setColor(0x00FF00)
        .setTimestamp();

    // Mostrar todos los logs del día
    let logDescription = '```\n';
    dailyLogs.forEach((log, index) => {
        logDescription += `${(index + 1).toString().padStart(2, '0')}. ${log.toString()}\n`;
    });
    logDescription += '```';

    embed.setDescription(logDescription);

    embed.addFields(
        {
            name: 'Estadísticas del Día',
            value: `**Total de registros hoy:** ${dailyLogs.length}\n**Próximo reset:** 00:00`,
            inline: true
        }
    );

    embed.setFooter({ 
        text: `ZL Hub • ${new Date().toLocaleDateString('es-ES')}`
    });

    await channel.send({ embeds: [embed] });
    console.log(`✅ Logs enviados: ${dailyLogs.length} registros del día`);
}

// Función para mostrar estadísticas
async function showStats(channel) {
    const todayLogs = dailyLogs.length;
    const today = new Date().toLocaleDateString('es-ES');

    let historicalSize = 'N/A';
    if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        historicalSize = (stats.size / 1024).toFixed(2) + ' KB';
    }

    const embed = new EmbedBuilder()
        .setTitle('📈 ESTADÍSTICAS - ZL Hub')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Logs Hoy', value: todayLogs.toString(), inline: true },
            { name: 'Fecha', value: today, inline: true },
            { name: 'Tamaño histórico', value: historicalSize, inline: true },
            { name: 'Canal Fuente', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true },
            { name: 'Canal Logs', value: `<#${LOGS_CHANNEL_ID}>`, inline: true },
            { name: 'Estado', value: '🟢 Activo', inline: true }
        )
        .setFooter({ text: 'Los logs se reinician diariamente a las 00:00' })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

// Tarea diaria para enviar logs y reiniciar
function startDailyLogTask() {
    // Calcular tiempo hasta la próxima medianoche
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    console.log(`⏰ Tarea diaria programada. Próxima ejecución en ${Math.round(timeUntilMidnight / 1000 / 60)} minutos`);

    // Programar primera ejecución a medianoche
    setTimeout(() => {
        sendDailyLogsAndReset();
        // Programar ejecución cada 24 horas
        setInterval(sendDailyLogsAndReset, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
}

// Función para enviar logs diarios y reiniciar
async function sendDailyLogsAndReset() {
    try {
        const logsChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
        if (!logsChannel) {
            console.error('No se pudo encontrar el canal de logs');
            return;
        }

        console.log(`\n📨 ENVIANDO LOGS DIARIOS...`);
        console.log(`📊 Registros del día: ${dailyLogs.length}`);

        if (dailyLogs.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📊 LOGS DIARIOS - ZL Hub')
                .setDescription('No hubo registros para el día de hoy.')
                .setColor(0xFFA500)
                .setTimestamp();

            await logsChannel.send({ embeds: [embed] });
            console.log('✅ Mensaje de "sin registros" enviado');
        } else {
            // Crear embed para logs diarios
            const embed = new EmbedBuilder()
                .setTitle('📊 LOGS DIARIOS - ZL Hub')
                .setColor(0x00FF00)
                .setTimestamp();

            let logDescription = '```\n';
            dailyLogs.forEach((log, index) => {
                logDescription += `${(index + 1).toString().padStart(2, '0')}. ${log.toString()}\n`;
            });
            logDescription += '```';

            embed.setDescription(logDescription);

            embed.addFields({
                name: `Resumen del Día - ${new Date().toLocaleDateString('es-ES')}`,
                value: `**Total de registros:** ${dailyLogs.length}\n**Hora de envío:** ${new Date().toLocaleTimeString('es-ES')}`
            });

            embed.setFooter({ 
                text: 'ZL Hub • Logs Diarios - Reinicio Automático' 
            });

            await logsChannel.send({ embeds: [embed] });
            console.log(`✅ Logs diarios enviados: ${dailyLogs.length} registros`);
        }

        // REINICIAR LOGS DEL DÍA
        console.log('🔄 Reiniciando logs del día...');
        const logsCountBeforeReset = dailyLogs.length;
        dailyLogs = []; // Vaciar array de logs del día
        
        // Reiniciar archivo diario
        fs.writeFileSync(DAILY_LOG_FILE, '', 'utf8');
        
        console.log(`✅ Logs reiniciados. Se enviaron ${logsCountBeforeReset} registros`);

    } catch (error) {
        console.error('❌ Error enviando logs diarios:', error);
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
