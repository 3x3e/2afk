require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
// ⚠️ ملاحظة: تم إزالة @discordjs/voice والاعتماد على discord-stream-client
const { DiscordStreamClient } = require('discord-stream-client'); 

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// مسار أو رابط فيديو الشاشة السوداء (يمكنك استبداله بملف صامت لديك)
// هذا الرابط هو مثال فقط، يجب التأكد من أنه ملف فيديو صامت وقصير
const BLACK_SCREEN_VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'; 

app.get('/', (req, res) => {
    res.send('Bot is running!');
});
app.listen(port, () => {
    console.log(`Express server running on port ${port}`);
});

const client = new Client();
// إنشاء عميل البث الذي سيدير الاتصالات
const StreamClient = new DiscordStreamClient(client);

// متغيرات لتتبع حالة الاتصال والبث
let currentVoiceConnection = null;
let currentStreamPlayer = null;

client.on('ready', async () => {
    console.log(`${client.user.username} is ready!`);
});

client.on('messageCreate', async (message) => {
    // يتجاهل الرسائل التي لا تأتي من البوت نفسه
    if (message.author.id !== client.user.id) return;

    const content = message.content.toLowerCase();
    const channelId = process.env.CHANNEL_ID;
    const guildId = process.env.GUILD_ID;

    // !join: يدخل روم من .env
    if (content === '!join') {
        if (currentVoiceConnection) {
            message.channel.send('❌ The bot is already in a voice channel!');
            return;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 'GUILD_VOICE') {
                message.channel.send('❌ Voice channel not found.');
                return;
            }

            // استخدام StreamClient للاتصال (صوت فقط)
            const connection = await StreamClient.joinVoiceChannel(channel, {
                selfDeaf: false,
                selfMute: true,
                selfVideo: false, // لا تبدأ البث تلقائيا
            });
            currentVoiceConnection = connection;

            message.channel.send('✅ Successfully joined the voice channel.');
            console.log('✅ Joined voice channel.');
        } catch (error) {
            console.error('Error joining voice channel:', error.message);
            message.channel.send('❌ An error occurred while trying to join.');
        }
    }

    // !afk: يدخل نفس الروم اللي أنت فيه
    if (content === '!afk') {
        if (currentVoiceConnection) {
            message.channel.send('❌ The bot is already in a voice channel!');
            return;
        }
        try {
            let foundChannel = null;
            // البحث عن الروم الذي يتواجد فيه المستخدم الذي أرسل الأمر
            const senderGuild = client.guilds.cache.get(message.guildId);
            const me = senderGuild.members.cache.get(client.user.id);
            if (me && me.voice.channel) {
                foundChannel = me.voice.channel;
            }

            if (!foundChannel) {
                message.channel.send('❌ You must be connected to a voice channel first.');
                return;
            }

            // استخدام StreamClient للاتصال (صوت فقط)
            const connection = await StreamClient.joinVoiceChannel(foundChannel, {
                selfDeaf: false,
                selfMute: true,
                selfVideo: false,
            });
            currentVoiceConnection = connection;

            message.channel.send(`✅ You are now AFK in: ${foundChannel.name}`);
            console.log(`✅ AFK in: ${foundChannel.name}`);
        } catch (err) {
            console.error('❌ AFK command error:', err.message);
            message.channel.send('❌ An error occurred while trying to run AFK command.');
        }
    }

    // !screenshare: يبدأ بث الشاشة السوداء
    if (content === '!screenshare') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ Bot is not connected to a voice channel. Use !join or !afk first.');
            return;
        }
        
        // إيقاف أي بث سابق
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
        }

        try {
            // 1. إنشاء اتصال بث (مشاركة شاشة)
            const streamConnection = await currentVoiceConnection.createStream({
                selfVideo: true, // تفعيل البث
                selfMute: currentVoiceConnection.selfMute,
                selfDeaf: currentVoiceConnection.selfDeaf,
            });

            // 2. إنشاء المشغل وبث ملف الفيديو (يتطلب FFmpeg)
            currentStreamPlayer = StreamClient.createPlayer(
                BLACK_SCREEN_VIDEO_URL,
                streamConnection.udp // استخدام اتصال UDP الخاص بالبث
            );

            currentStreamPlayer.on('start', () => {
                message.channel.send('✅ Started Screen Share (Go Live).');
                console.log('✅ Started streaming.');
            });
            
            currentStreamPlayer.on('error', (error) => {
                console.error('Stream Player Error:', error.message);
                message.channel.send('❌ Error during stream playback. Check FFmpeg installation.');
            });

            // 3. تشغيل المشغل
            currentStreamPlayer.play();

        } catch (error) {
            console.error('❌ Screenshare error:', error.message);
            message.channel.send(`❌ An error occurred while trying to screenshare: ${error.message}`);
        }
    }

    // !stopshare: يوقف بث الشاشة
    if (content === '!stopshare') {
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
            
            // إرسال إشارة إيقاف الفيديو عبر الاتصال الصوتي
            if (currentVoiceConnection) {
                currentVoiceConnection.setVideo(false); 
            }
            
            message.channel.send('✅ Screen share stopped.');
        } else {
            message.channel.send('❌ No active screen share to stop.');
        }
    }


    // !leave: يخرج من الروم
    if (content === '!leave') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ Bot is not connected to a voice channel.');
            return;
        }
        
        // إيقاف البث إن وجد
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
        }

        try {
            // استخدام وظيفة الخروج من StreamClient
            await currentVoiceConnection.destroy();
            currentVoiceConnection = null;

            message.channel.send('✅ Left the voice channel.');
            console.log('✅ Left voice channel.');
        } catch (error) {
            console.error('Error leaving voice channel:', error.message);
            message.channel.send('❌ An error occurred while trying to leave.');
        }
    }
});

client.login(process.env.TOKEN);
