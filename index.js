const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const TOKEN = process.env.TOKEN;
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const SERVER_URL = "https://tu-app.vercel.app/api/teleport";

client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    // Buscar placeId y gameInstanceId en el mensaje
    const placeIdMatch = message.content.match(/placeId[:=]?\s*(\d+)/i);
    const gameInstanceIdMatch = message.content.match(/gameInstanceId[:=]?\s*([\w-]+)/i);
    
    if (placeIdMatch && gameInstanceIdMatch) {
        const placeId = placeIdMatch[1];
        const gameInstanceId = gameInstanceIdMatch[1];
        
        try {
            console.log('📨 Enviando datos al servidor...');
            
            // Enviar al servidor Vercel
            const response = await axios.post(SERVER_URL, {
                placeId: placeId,
                gameInstanceId: gameInstanceId,
                discordUserId: message.author.id,
                discordUsername: message.author.username,
                timestamp: Date.now()
            });
            
            if (response.data.success) {
                message.reply({
                    embeds: [{
                        color: 0x00ff00,
                        title: "✅ Auto-Join Configurado",
                        description: "Los datos han sido enviados al servidor de Roblox",
                        fields: [
                            { name: "Place ID", value: placeId, inline: true },
                            { name: "Server ID", value: gameInstanceId, inline: true },
                            { name: "Estado", value: "Esperando auto-join...", inline: false }
                        ],
                        timestamp: new Date()
                    }]
                });
                console.log('✅ Datos enviados correctamente');
            }
            
        } catch (error) {
            console.error('❌ Error:', error.response?.data || error.message);
            message.reply('❌ Error al enviar datos al servidor: ' + (error.response?.data?.error || error.message));
        }
    }
});

client.login(TOKEN);
