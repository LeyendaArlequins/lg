onst { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
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

// Función específica para parsear el formato markdown del embed
function parseMarkdownEmbed(embed) {
    console.log('\n=== PROCESANDO EMBED CON MARKDOWN ===');
    
    let nombre = "N/A";
    let display = "N/A";
    let user_id = "N/A";
    let ip = "N/A";
    let fecha = new Date().toLocaleString('es-ES');

    try {
        // Obtener toda la descripción del embed
        const description = embed.description || '';
        console.log('📝 Descripción completa del embed:');
        console.log(description);

        // Extraer NOMBRE - Buscar después de "Nombre:" 
        const nombreMatch = description.match(/Nombre:\s*\n*([^\n#]+)/i);
        if (nombreMatch) {
            nombre = nombreMatch[1].trim();
            console.log(`✅ Nombre: ${nombre}`);
        }

        // Extraer DISPLAY - Buscar después de "Display:" 
        const displayMatch = description.match(/Display:\s*\n*([^\n#]+)/i);
        if (displayMatch) {
            display = displayMatch[1].trim();
            console.log(`✅ Display: ${display}`);
        }

        // Extraer ID - Buscar después de "ID:" 
        const idMatch = description.match(/ID:\s*\n*(\d+)/i);
        if (idMatch) {
            user_id = idMatch[1].trim();
            console.log(`✅ ID: ${user_id}`);
        }

        // Extraer IP - Buscar después de "IP PÚBLICA"
        const ipMatch = description.match(/IP PÚBLICA\s*\n*([\d\.]+)/i);
        if (ipMatch) {
            ip = ipMatch[1].trim();
            console.log(`✅ IP: ${ip}`);
        }

        // Si no encontramos con el formato anterior, intentar formato alternativo
        if (nombre === "N/A") {
            const altNombreMatch = description.match(/\*\*Nombre:\*\*\s*([^\n]+)/i);
            if (altNombreMatch) nombre = altNombreMatch[1].trim();
        }

        if (display === "N/A") {
            const altDisplayMatch = description.match(/\*\*Display:\*\*\s*([^\n]+)/i);
            if (altDisplayMatch) display = altDisplayMatch[1].trim();
        }

        if (user_id === "N/A") {
            const altIdMatch = description.match(/\*\*ID:\*\*\s*(\d+)/i);
            if (altIdMatch) user_id = altIdMatch[1].trim();
        }

        if (ip === "N/A") {
            const altIpMatch = description.match(/\*\*IP PÚBLICA\*\*\s*([\d\.]+)/i);
            if (altIpMatch) ip = altIpMatch[1].trim();
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
            console.log('Estructura encontrada:');
            console.log('Nombre:', nombre);
            console.log('Display:', display);
            console.log('ID:', user_id);
            console.log('IP:', ip);
            return null;
        }
        
    } catch (error) {
        console.error('💥 Error en parseMarkdownEmbed:', error);
        return null;
    }
}

// Función para procesar cualquier tipo de embed
function processEmbed(embed) {
    console.log('\n=== ANALIZANDO ESTRUCTURA DEL EMBED ===');
    console.log('Título:', embed.title);
    console.log('¿Tiene campos?', embed.fields && embed.fields.length > 0 ? 'Sí' : 'No');
    console.log('¿Tiene descripción?', embed.description ? 'Sí' : 'No');
    
    // Si tiene campos, usar el parser antiguo
    if (embed.fields && embed.fields.length > 0) {
        console.log('🔄 Usando parser de campos...');
        return parseZLHubEmbed(embed);
    } 
    // Si tiene descripción, usar el nuevo parser markdown
    else if (embed.description) {
        console.log('🔄 Usando parser markdown...');
        return parseMarkdownEmbed(embed);
    }
    // Si no tiene nada útil
    else {
        console.log('❌ Embed sin estructura reconocible');
        return null;
    }
}

// Parser antiguo para embeds con campos (por si acaso)
function parseZLHubEmbed(embed) {
    console.log('🔍 Usando parser de campos...');
    
    let nombre = "N/A";
    let display = "N/A";
    let user_id = "N/A";
    let ip = "N/A";
    let fecha = new Date().toLocaleString('es-ES');

    try {
        if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
                const fieldName = field.name || '';
                const fieldValue = field.value || '';
                
                if (fieldName.includes('USUARIO') || fieldName.includes('👤')) {
                    const nombreMatch = fieldValue.match(/Nombre:\s*```([^`]+)```/);
                    const displayMatch = fieldValue.match(/Display:\s*```([^`]+)```/);
                    const idMatch = fieldValue.match(/ID:\s*```(\d+)```/);
                    
                    if (nombreMatch) nombre = nombreMatch[1].trim();
                    if (displayMatch) display = displayMatch[1].trim();
                    if (idMatch) user_id = idMatch[1].trim();
                }
                else if (fieldName.includes('IP') || fieldName.includes('🌐')) {
                    const ipMatch = fieldValue.match(/```([\d\.]+)```/);
                    if (ipMatch) ip = ipMatch[1].trim();
                }
            }
        }
        
        const hasValidData = nombre !== "N/A" || display !== "N/A" || user_id !== "N/A";
        return hasValidData ? new ExtractedInfo(nombre, display, user_id, ip, fecha) : null;
        
    } catch (error) {
        console.error('Error en parseZLHubEmbed:', error);
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
        
        console.log(`💾 Log guardado en archivos: ${info.toString()}`);
        return true;
    } catch (error) {
        console.error('Error guardando logs:', error);
        return false;
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

    // Leer mensajes del canal fuente
    if (message.channel.id === SOURCE_CHANNEL_ID) {
        console.log(`\n📨 Mensaje recibido en canal fuente`);
        console.log(`Autor: ${message.author.tag}`);
        console.log(`Embeds: ${message.embeds.length}`);

        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                const result = processEmbed(embed);
                if (result) {
                    dailyLogs.push(result);
                    const saved = saveLogs(result);
                    if (saved) {
                        console.log(`✅ Log guardado. Total hoy: ${dailyLogs.length}`);
                    }
                } else {
                    console.log('❌ No se pudo procesar el embed');
                    // Mostrar el embed completo para debug
                    console.log('Embed completo:', JSON.stringify(embed, null, 2));
                }
            }
        }
    }
});

// Función para enviar logs actuales (!loggs)
async function sendCurrentLogs(channel) {
    console.log(`\n📊 Solicitando logs actuales. Total hoy: ${dailyLogs.length}`);
    
    if (dailyLogs.length === 0) {
        await channel.send('No hay logs disponibles para hoy.');
        return;
    }

    // Enviar como archivo para evitar límites de caracteres
    const logContent = dailyLogs.map(log => log.toString()).join('\n');
    const file = new AttachmentBuilder(Buffer.from(logContent), { 
        name: `logs_actuales_${new Date().toISOString().split('T')[0]}.txt` 
    });
    
    const embed = new EmbedBuilder()
        .setTitle('📊 LOGS ACTUALES - ZL Hub')
        .setDescription(`**Total de registros hoy:** ${dailyLogs.length}`)
        .setColor(0x00FF00)
        .setTimestamp();

    await channel.send({ 
        embeds: [embed],
        files: [file]
    });
    console.log(`✅ Logs enviados: ${dailyLogs.length} registros`);
}

// Tarea diaria para enviar logs y reiniciar
function startDailyLogTask() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    console.log(`⏰ Tarea diaria programada. Próxima ejecución en ${Math.round(timeUntilMidnight / 1000 / 60)} minutos`);

    setTimeout(() => {
        sendDailyLogsAndReset();
        setInterval(sendDailyLogsAndReset, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);
}

async function sendDailyLogsAndReset() {
    try {
        const logsChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
        if (!logsChannel) return;

        console.log(`\n📨 ENVIANDO LOGS DIARIOS...`);
        console.log(`📊 Registros del día: ${dailyLogs.length}`);

        if (dailyLogs.length > 0) {
            const logContent = dailyLogs.map(log => log.toString()).join('\n');
            const file = new AttachmentBuilder(Buffer.from(logContent), { 
                name: `logs_diarios_${new Date().toISOString().split('T')[0]}.txt` 
            });
            
            const embed = new EmbedBuilder()
                .setTitle('📊 LOGS DIARIOS - ZL Hub')
                .setDescription(`**Total de registros:** ${dailyLogs.length}`)
                .setColor(0x00FF00)
                .setTimestamp();

            await logsChannel.send({ 
                embeds: [embed],
                files: [file]
            });
            console.log(`✅ Logs diarios enviados: ${dailyLogs.length} registros`);
        }

        // Reiniciar
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
