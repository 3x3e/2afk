// استيراد المكتبات الضرورية
require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { Streamer } = require('@dank074/discord-video-stream'); 

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// رابط ملف فيديو لاستخدامه كـ "شاشة سوداء" للبث.
// (يتطلب FFmpeg لمعالجة هذا الرابط)
const BLACK_SCREEN_VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'; 

// إعداد خادم Express للحفاظ على تشغيل البوت على Render
app.get('/', (req, res) => {
    res.send('البوت يعمل وجاهز!');
});
app.listen(port, () => {
    console.log(`خادم Express يعمل على المنفذ: ${port}`);
});

const client = new Client();
// تهيئة عميل Streamer للتعامل مع الاتصال الصوتي والبث
const streamer = new Streamer(client); 

// متغيرات لتتبع حالة الاتصال والبث
let currentVoiceConnection = null;
let currentStreamPlayer = null;

client.on('ready', async () => {
    console.log(`البوت: ${client.user.username} جاهز للعمل!`);
});

client.on('messageCreate', async (message) => {
    // تجاهل الرسائل التي لا تأتي من حساب البوت نفسه (السيلف بوت)
    if (message.author.id !== client.user.id) return;

    const content = message.content.toLowerCase();
    const channelId = process.env.CHANNEL_ID;
    const guildId = process.env.GUILD_ID;

    // الأمر !join: يدخل الروم الصوتي المحدد في ملف .env
    if (content === '!join') {
        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي!');
            return;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 'GUILD_VOICE') {
                message.channel.send('❌ لم يتم العثور على الروم الصوتي المحدد.');
                return;
            }

            // الانضمام للروم باستخدام streamer.joinVoice
            const connection = await streamer.joinVoice(guildId, channelId); 
            currentVoiceConnection = connection;

            message.channel.send('✅ تم الاتصال بالروم الصوتي بنجاح.');
            console.log('✅ تم الانضمام للروم الصوتي.');
        } catch (error) {
            console.error('خطأ أثناء محاولة الانضمام للروم:', error.message);
            message.channel.send('❌ حدث خطأ أثناء محاولة الانضمام للروم.');
        }
    }

    // الأمر !afk: يدخل الروم الصوتي الذي يتواجد فيه المستخدم حاليًا
    if (content === '!afk') {
        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي!');
            return;
        }
        try {
            let foundChannel = null;
            const senderGuild = client.guilds.cache.get(message.guildId);
            const me = senderGuild.members.cache.get(client.user.id);
            if (me && me.voice.channel) {
                foundChannel = me.voice.channel;
            }

            if (!foundChannel) {
                message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً لتشغيل هذا الأمر.');
                return;
            }

            // الانضمام للروم باستخدام streamer.joinVoice
            const connection = await streamer.joinVoice(foundChannel.guild.id, foundChannel.id);
            currentVoiceConnection = connection;

            message.channel.send(`✅ تم تفعيل وضع AFK في الروم: ${foundChannel.name}`);
            console.log(`✅ تفعيل AFK في الروم: ${foundChannel.name}`);
        } catch (err) {
            console.error('❌ خطأ في أمر AFK:', err.message);
            message.channel.send('❌ حدث خطأ أثناء محاولة تشغيل أمر AFK.');
        }
    }

    // الأمر !screenshare: يبدأ بث الشاشة (Go Live)
    if (content === '!screenshare') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي. استخدم !join أو !afk أولاً.');
            return;
        }
        
        // إيقاف أي بث سابق قبل البدء
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
        }

        try {
            // إنشاء مشغل البث. يتطلب FFmpeg ليعمل.
            currentStreamPlayer = streamer.createPlayer(BLACK_SCREEN_VIDEO_URL, currentVoiceConnection.udp);

            currentStreamPlayer.on('start', () => {
                message.channel.send('✅ تم بدء مشاركة الشاشة (Go Live).');
                console.log('✅ تم بدء البث.');
            });
            
            currentStreamPlayer.on('error', (error) => {
                console.error('خطأ في مشغل البث:', error.message);
                message.channel.send('❌ خطأ أثناء تشغيل البث. يرجى التحقق من تثبيت FFmpeg.');
            });

            currentStreamPlayer.play();

        } catch (error) {
            console.error('❌ خطأ في أمر Screenshare:', error.message);
            message.channel.send(`❌ حدث خطأ أثناء محاولة مشاركة الشاشة: ${error.message}`);
        }
    }

    // الأمر !stopshare: يوقف بث الشاشة
    if (content === '!stopshare') {
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
            
            // إيقاف الفيديو على اتصال الديسكورد
            if (currentVoiceConnection) {
                currentVoiceConnection.setVideo(false); 
            }
            
            message.channel.send('✅ تم إيقاف مشاركة الشاشة.');
        } else {
            message.channel.send('❌ لا يوجد بث شاشة فعال لإيقافه.');
        }
    }


    // الأمر !leave: يخرج من الروم الصوتي
    if (content === '!leave') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي.');
            return;
        }
        
        // إيقاف البث إن وجد
        if (currentStreamPlayer) {
            currentStreamPlayer.stop();
            currentStreamPlayer = null;
        }

        try {
            // استخدام وظيفة destroy للخروج من الروم
            await currentVoiceConnection.destroy();
            currentVoiceConnection = null;

            message.channel.send('✅ تم الخروج من الروم الصوتي.');
            console.log('✅ تم الخروج من الروم الصوتي.');
        } catch (error) {
            console.error('خطأ أثناء الخروج من الروم:', error.message);
            message.channel.send('❌ حدث خطأ أثناء محاولة الخروج من الروم.');
        }
    }
});

client.login(process.env.TOKEN);
