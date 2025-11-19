const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Configuración
const SOURCE_CHANNEL_ID = '1437151487141740637';
const LOGS_CHANNEL_ID = '1440773871254110300';
const LOG_FILE = path.join(__dirname, 'logs_globales.txt');
const DAILY_LOG_FILE = path.join(__dirname, 'logs_diarios.txt');
const TOKEN = process.env.TOKEN;
// Almacenamiento de datos
let dailyLogs = [];

// Asegurar que los archivos existan
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, '', 'utf8');
if (!fs.existsSync(DAILY_LOG_FILE)) fs.writeFileSync(DAILY_LOG_FILE, '', 'utf8');

// Cargar logs diarios existentes
function loadDailyLogs() {
    try {
        if (fs.existsSync(DAILY_LOG_FILE)) {
            const data = fs.readFileSync(DAILY_LOG_FILE, 'utf8');
            const lines = data.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                const parts = line.split(' | ');
                if (parts.length >= 4) {
                    const info = {
                        nombre: parts[0],
                        display: parts[1],
                        user_id: parts[2],
                        ip: parts[3],
                        fecha: parts[4] || new Date().toLocaleString('es-ES')
                    };
                    dailyLogs.push(info);
                }
            });
            console.log(`✅ Logs diarios cargados: ${dailyLogs.length} registros`);
        }
    } catch (error) {
        console.error('Error cargando logs diarios:', error);
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

// Función mejorada para extraer valores
function extractValue(text) {
    if (!text) return "N/A";
    
    // Buscar contenido entre ``````
    const matches = text.match(/```([^`]+)```/);
    if (matches) return matches[1].trim();
    
    // Si no encuentra entre ```, buscar después de :
    const colonMatch = text.split(':')[1];
    if (colonMatch) return colonMatch.trim().replace(/`/g, '');
    
    return "N/A";
}

// Función específica para parsear el embed de ZL Hub
function parseZLHubEmbed(embed) {
    console.log('\n=== PROCESANDO EMBED ZL HUB ===');
    
    let nombre = "N/A";
    let display = "N/A";
    let user_id = "N/A";
    let ip = "N/A";
    let fecha = new Date().toLocaleString('es-ES');

    try {
        // Verificar campos del embed
        if (embed.fields && embed.fields.length > 0) {
            console.log(`📋 Número de campos: ${embed.fields.length}`);
            
            for (const field of embed.fields) {
                const fieldName = field.name || '';
                const fieldValue = field.value || '';
                
                console.log(`🔍 Campo: "${fieldName}"`);
                
                // Campo de USUARIO
                if (fieldName.includes('USUARIO') || fieldName.includes('👤')) {
                    console.log('📝 Procesando campo de usuario...');
                    
                    // Buscar Nombre
                    const nombreMatch = fieldValue.match(/Nombre:\s*```([^`]+)```/);
                    if (nombreMatch) {
                        nombre = nombreMatch[1].trim();
                        console.log(`✅ Nombre: ${nombre}`);
                    }
                    
                    // Buscar Display
                    const displayMatch = fieldValue.match(/Display:\s*```([^`]+)```/);
                    if (displayMatch) {
                        display = displayMatch[1].trim();
                        console.log(`✅ Display: ${display}`);
                    }
                    
                    // Buscar ID
                    const idMatch = fieldValue.match(/ID:\s*```(\d+)```/);
                    if (idMatch) {
                        user_id = idMatch[1].trim();
                        console.log(`✅ ID: ${user_id}`);
                    }
                }
                
                // Campo de IP
                else if (fieldName.includes('IP') || fieldName.includes('🌐')) {
                    const ipMatch = fieldValue.match(/```([^`]+)```/);
                    if (ipMatch) {
                        ip = ipMatch[1].trim();
                        console.log(`✅ IP: ${ip}`);
                    }
                }
                
                // Campo de SISTEMA (por si acaso)
                else if (fieldName.includes('SISTEMA') || fieldName.includes('💻')) {
                    console.log('⚙️ Campo de sistema encontrado');
                }
                
                // Campo de SESIÓN
                else if (fieldName.includes('SESIÓN') || fieldName.includes('🎯')) {
                    console.log('🎯 Campo de sesión encontrado');
                }
            }
        } else {
            console.log('⚠️ El embed no tiene campos definidos');
        }
        
        // Si no encontramos datos en los campos, intentar otras estrategias
        if (nombre === "N/A" && display === "N/A" && user_id === "N/A") {
            console.log('🔄 Intentando extracción alternativa...');
            
            // Buscar en la descripción del embed
            if (embed.description) {
                const descNombre = embed.description.match(/Nombre:\s*```([^`]+)```/);
                const descDisplay = embed.description.match(/Display:\s*```([^`]+)```/);
                const descID = embed.description.match(/ID:\s*```(\d+)```/);
                const descIP = embed.description.match(/IP[^`]*```([^`]+)```/);
                
                if (descNombre) nombre = descNombre[1].trim();
                if (descDisplay) display = descDisplay[1].trim();
                if (descID) user_id = descID[1].trim();
                if (descIP) ip = descIP[1].trim();
            }
        }
        
        // Verificar si tenemos datos válidos
        const hasValidData = nombre !== "N/A" || display !== "N/A" || user_id !== "N/A";
        
        if (hasValidData) {
            console.log(`🎉 DATOS EXTRAÍDOS EXITOSAMENTE:`);
            console.log(`   👤 Nombre: ${nombre}`);
            console.log(`   🏷️ Display: ${display}`);
            console.log(`   🆔 ID: ${user_id}`);
            console.log(`   🌐 IP: ${ip}`);
            console.log(`   📅 Fecha: ${fecha}`);
            
            return new ExtractedInfo(nombre, display, user_id, ip, fecha);
        } else {
            console.log('❌ No se pudieron extraer datos del embed');
            console.log('Embed completo para debug:', JSON.stringify(embed, null, 2));
            return null;
        }
        
    } catch (error) {
        console.error('💥 Error en parseZLHubEmbed:', error);
        return null;
    }
}

// Guardar en archivos
function saveLogs(info) {
    try {
        // Guardar en histórico global
        const globalLog = `${info.nombre} | ${info.display} | ${info.user_id} | ${info.ip} | ${info.fecha}\n`;
        fs.appendFileSync(LOG_FILE, globalLog, 'utf8');
        
        // Guardar en diario
        const dailyLog = `${info.nombre} | ${info.display} | ${info.user_id} | ${info.ip} | ${info.fecha}\n`;
        fs.appendFileSync(DAILY_LOG_FILE, dailyLog, 'utf8');
        
        console.log(`💾 Log guardado en archivos`);
    } catch (error) {
        console.error('Error guardando logs:', error);
    }
}

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`\n🤖 Bot conectado como ${client.user.tag}`);
    console.log(`📊 Monitorizando canal: ${SOURCE_CHANNEL_ID}`);
    console.log(`📨 Enviando logs diarios a: ${LOGS_CHANNEL_ID}`);
    
    loadDailyLogs();
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

    // Leer mensajes del canal fuente (incluyendo webhooks)
    if (message.channel.id === SOURCE_CHANNEL_ID) {
        console.log(`\n📨 Mensaje recibido en canal fuente`);
        console.log(`Autor: ${message.author.tag} (${message.author.id})`);
        console.log(`Webhook: ${message.webhookId ? 'Sí' : 'No'}`);
        console.log(`Embeds: ${message.embeds.length}`);

        // Procesar embeds del mensaje
        if (message.embeds.length > 0) {
            console.log(`🎯 Procesando ${message.embeds.length} embed(s)...`);
            for (const embed of message.embeds) {
                const result = parseZLHubEmbed(embed);
                if (result) {
                    // Guardar en memoria
                    dailyLogs.push(result);
                    // Guardar en archivos
                    saveLogs(result);
                    console.log(`✅ Total logs hoy: ${dailyLogs.length}`);
                }
            }
        } else {
            console.log('ℹ️ Mensaje sin embeds');
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
    embed.addFields({
        name: 'Estadísticas del Día',
        value: `**Total de registros:** ${dailyLogs.length}`,
        inline: true
    });

    embed.setFooter({ 
        text: `ZL Hub • ${new Date().toLocaleDateString('es-ES')}`
    });

    await channel.send({ embeds: [embed] });
    console.log(`✅ Logs enviados: ${dailyLogs.length} registros`);
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
        } else {
            // Enviar como archivo adjunto para muchos registros
            const file = new AttachmentBuilder(Buffer.from(dailyLogs.map(log => log.toString()).join('\n')), { 
                name: `logs_${new Date().toISOString().split('T')[0]}.txt` 
            });
            
            const embed = new EmbedBuilder()
                .setTitle('📊 LOGS DIARIOS - ZL Hub')
                .setDescription(`Se recopilaron **${dailyLogs.length}** registros hoy.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await logsChannel.send({ 
                embeds: [embed],
                files: [file]
            });
            console.log(`✅ Logs diarios enviados: ${dailyLogs.length} registros`);
        }

        // REINICIAR LOGS DEL DÍA
        console.log('🔄 Reiniciando logs del día...');
        dailyLogs = [];
        fs.writeFileSync(DAILY_LOG_FILE, '', 'utf8');
        console.log('✅ Logs reiniciados para nuevo día');

    } catch (error) {
        console.error('❌ Error enviando logs diarios:', error);
    }
}

// Manejo de errores
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// Iniciar el bot
client.login(TOKEN);
