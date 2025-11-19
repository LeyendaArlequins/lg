const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuración
const SOURCE_CHANNEL_ID = '1437151487141740637';
const LOGS_CHANNEL_ID = '1440773871254110300';
const LOG_FILE = 'logs.txt';
const DAILY_LOG_FILE = 'daily_logs.txt';
const TOKEN = procces.env.TOKEN;
// Almacenamiento de datos
let extractedData = [];
let dailyLogs = [];

// Cargar logs existentes del archivo
function loadLogsFromFile() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const data = fs.readFileSync(LOG_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                const parts = line.split(' | ');
                if (parts.length >= 5) {
                    const info = new ExtractedInfo(parts[0], parts[1], parts[2], parts[3], parts[4]);
                    extractedData.push(info);
                }
            });
            console.log(`✅ Logs cargados desde archivo: ${extractedData.length} registros`);
        }
    } catch (error) {
        console.error('Error cargando logs:', error);
    }
}

// Guardar log en archivo
function saveLogToFile(info) {
    try {
        const logEntry = `${info.nombre} | ${info.display} | ${info.user_id} | ${info.ip} | ${info.fecha}\n`;
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
        console.log(`✅ Log guardado en archivo: ${info.toString()}`);
    } catch (error) {
        console.error('Error guardando log:', error);
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
    // Buscar contenido entre ```
    const matches = text.match(/```([^```]+)```/);
    return matches ? matches[1].trim() : "N/A";
}

// Función mejorada para procesar embeds
function processEmbed(embed) {
    try {
        console.log('\n=== NUEVO EMBED DETECTADO ===');
        console.log('Título:', embed.title);
        console.log('Descripción:', embed.description);
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

                console.log(`🔍 Campo: "${field.name}"`);

                if (fieldName.includes('usuario') || fieldName.includes('👤')) {
                    console.log('📝 Procesando campo de usuario...');
                    const lines = fieldValue.split('\n');
                    for (const line of lines) {
                        if (line.includes('Nombre:')) {
                            nombre = extractValue(line);
                            console.log('✅ Nombre:', nombre);
                        } else if (line.includes('Display:')) {
                            display = extractValue(line);
                            console.log('✅ Display:', display);
                        } else if (line.includes('ID:')) {
                            user_id = extractValue(line);
                            console.log('✅ ID:', user_id);
                        }
                    }
                } else if (fieldName.includes('ip') || fieldName.includes('🌐')) {
                    ip = extractValue(fieldValue);
                    console.log('✅ IP:', ip);
                }
            }
        } else {
            console.log('⚠️ El embed no tiene campos');
        }

        // Verificar si se extrajeron datos válidos
        if (nombre !== "N/A" || display !== "N/A" || user_id !== "N/A") {
            const info = new ExtractedInfo(nombre, display, user_id, ip, fecha);
            
            // Guardar en memoria
            extractedData.push(info);
            dailyLogs.push(info);
            
            // Guardar en archivos
            saveLogToFile(info);
            saveDailyLogToFile(info);
            
            console.log(`🎉 DATOS EXTRAÍDOS EXITOSAMENTE: ${info.toString()}`);
            return info;
        } else {
            console.log('❌ No se pudieron extraer datos del embed');
            // Mostrar el embed completo para debugging
            console.log('Embed completo:', JSON.stringify(embed, null, 2));
            return null;
        }

    } catch (error) {
        console.error('💥 Error procesando embed:', error);
        return null;
    }
}

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`\n🤖 Bot conectado como ${client.user.tag}`);
    console.log(`📊 Monitorizando canal: ${SOURCE_CHANNEL_ID}`);
    console.log(`📨 Enviando logs diarios a: ${LOGS_CHANNEL_ID}`);
    
    // Cargar logs existentes
    loadLogsFromFile();
    console.log(`📁 Total de logs en memoria: ${extractedData.length}`);
    
    startDailyLogTask();
});

// Evento para mensajes
client.on('messageCreate', async (message) => {
    // Ignorar mensajes del propio bot
    if (message.author.bot) return;

    // Procesar comandos
    if (message.content === '!loggs') {
        console.log(`\n📋 Comando !loggs recibido de ${message.author.tag}`);
        await sendCurrentLogs(message.channel);
        return;
    }

    if (message.content === '!stats') {
        await showStats(message.channel);
        return;
    }

    if (message.content === '!clearlogs') {
        if (message.author.id === 'TU_ID_DE_ADMIN') { // Reemplaza con tu ID
            extractedData = [];
            dailyLogs = [];
            try {
                fs.writeFileSync(LOG_FILE, '');
                fs.writeFileSync(DAILY_LOG_FILE, '');
                await message.channel.send('✅ Logs limpiados correctamente');
            } catch (error) {
                await message.channel.send('❌ Error limpiando logs');
            }
        }
        return;
    }

    // Leer mensajes del canal fuente
    if (message.channel.id === SOURCE_CHANNEL_ID) {
        console.log(`\n📨 Mensaje recibido en canal fuente`);
        console.log(`Autor: ${message.author.tag} (${message.author.id})`);
        console.log(`Webhook: ${message.webhookId ? 'Sí' : 'No'}`);
        console.log(`Embeds: ${message.embeds.length}`);

        // Procesar embeds del mensaje
        if (message.embeds.length > 0) {
            console.log(`🎯 Procesando ${message.embeds.length} embed(s)...`);
            for (const embed of message.embeds) {
                processEmbed(embed);
            }
        } else {
            console.log('ℹ️ Mensaje sin embeds, contenido:', message.content);
        }
    }
});

// Función para enviar logs actuales
async function sendCurrentLogs(channel) {
    console.log(`\n📊 Solicitando logs. Total en memoria: ${extractedData.length}`);
    
    // Verificar si hay logs en el archivo
    if (fs.existsSync(LOG_FILE)) {
        const fileStats = fs.statSync(LOG_FILE);
        console.log(`📁 Archivo de logs: ${fileStats.size} bytes`);
    }

    if (extractedData.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('📊 LOGS ACTUALES - ZL Hub')
            .setDescription('No hay logs disponibles en este momento.')
            .setColor(0xFFA500)
            .addFields({
                name: 'Información',
                value: 'Los logs se guardan automáticamente en archivos TXT:\n- `logs.txt` (todos los logs)\n- `daily_logs.txt` (logs del día)'
            })
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        return;
    }

    // Crear embed con los logs
    const embed = new EmbedBuilder()
        .setTitle('📊 LOGS ACTUALES - ZL Hub')
        .setColor(0x00FF00)
        .setTimestamp();

    // Tomar los últimos 25 registros para no exceder límites de Discord
    const recentLogs = extractedData.slice(-25);
    let logDescription = '```\n';

    recentLogs.forEach((log, index) => {
        logDescription += `${(index + 1).toString().padStart(2, '0')}. ${log.toString()}\n`;
    });

    logDescription += '```';

    embed.setDescription(logDescription);

    embed.addFields(
        {
            name: 'Estadísticas',
            value: `**Total de registros:** ${extractedData.length}\n**Mostrando:** últimos ${recentLogs.length}\n**Archivo:** logs.txt`,
            inline: true
        }
    );

    embed.setFooter({ 
        text: `ZL Hub • ${new Date().toLocaleString('es-ES')}`
    });

    await channel.send({ embeds: [embed] });
    console.log(`✅ Logs enviados: ${recentLogs.length} registros`);
}

// Función para mostrar estadísticas
async function showStats(channel) {
    const totalLogs = extractedData.length;
    const today = new Date().toLocaleDateString('es-ES');
    const todayLogs = extractedData.filter(log => 
        log.fecha.includes(today)
    ).length;

    let fileSize = 'N/A';
    if (fs.existsSync(LOG_FILE)) {
        const stats = fs.statSync(LOG_FILE);
        fileSize = (stats.size / 1024).toFixed(2) + ' KB';
    }

    const embed = new EmbedBuilder()
        .setTitle('📈 ESTADÍSTICAS - ZL Hub')
        .setColor(0x0099FF)
        .addFields(
            { name: 'Total de Logs', value: totalLogs.toString(), inline: true },
            { name: 'Logs Hoy', value: todayLogs.toString(), inline: true },
            { name: 'Tamaño archivo', value: fileSize, inline: true },
            { name: 'Canal Fuente', value: `<#${SOURCE_CHANNEL_ID}>`, inline: true },
            { name: 'Canal Logs', value: `<#${LOGS_CHANNEL_ID}>`, inline: true },
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

        console.log(`\n📨 Enviando logs diarios... Registros del día: ${dailyLogs.length}`);

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

        let logDescription = '```\n';
        dailyLogs.forEach((log, index) => {
            logDescription += `${(index + 1).toString().padStart(2, '0')}. ${log.toString()}\n`;
        });
        logDescription += '```';

        embed.setDescription(logDescription);

        embed.addFields({
            name: `Resumen del día - ${new Date().toLocaleDateString('es-ES')}`,
            value: `**Total de registros:** ${dailyLogs.length}\n**Guardado en:** daily_logs.txt`
        });

        embed.setFooter({ 
            text: 'ZL Hub • Logs Automáticos Diarios' 
        });

        await logsChannel.send({ embeds: [embed] });

        console.log(`✅ Logs diarios enviados. Total: ${dailyLogs.length} registros`);

        // Limpiar logs del día después de enviarlos
        dailyLogs = [];
        // Reiniciar archivo diario
        fs.writeFileSync(DAILY_LOG_FILE, '', 'utf8');

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
