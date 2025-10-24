// استيراد المكتبات باستخدام صيغة import
import 'dotenv/config'; 
import { Client } from 'discord.js-selfbot-v13';
import { Streamer } from '@dank074/discord-video-stream'; 
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

// رابط ملف فيديو لاستخدامه كـ "شاشة سوداء" للبث.
const BLACK_SCREEN_VIDEO_URL = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'; 

// إعداد خادم Express
app.get('/', (req, res) => {
    res.send('البوت يعمل وجاهز!');
});
app.listen(port, () => {
    console.log(`خادم Express يعمل على المنفذ: ${port}`);
});

const client = new Client();
// تهيئة عميل Streamer
const streamer = new Streamer(client); 

// متغيرات لتتبع حالة الاتصال والبث
let currentVoiceConnection = null;

client.on('ready', async () => {
    console.log(`البوت: ${client.user.username} جاهز للعمل!`);
});

client.on('messageCreate', async (message) => {
    // تجاهل الرسائل التي لا تأتي من حساب البوت نفسه
    if (message.author.id !== client.user.id) return;

    const content = message.content.toLowerCase();
    const channelId = process.env.CHANNEL_ID;
    const guildId = process.env.GUILD_ID;

    // دالة مساعدة لتحديث حالة الميوت/الديفن
    async function updateVoiceState(deaf, mute) {
        if (!message.guild || !client.user) return;
        const member = message.guild.members.cache.get(client.user.id);

        if (member && member.voice.channel) {
            try {
                // استخدام Streamer لتحديث حالة الميوت/الديفن
                await streamer.setDeaf(deaf);
                await streamer.setMute(mute);
                return true;
            } catch (error) {
                console.error("خطأ في تحديث حالة الصوت:", error);
                message.channel.send(`❌ خطأ في تحديث حالة الصوت: ${error.message}`);
                return false;
            }
        }
        message.channel.send('❌ البوت غير متصل بروم صوتي لتغيير حالته.');
        return false;
    }

    // الأمر !join
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

    // الأمر !afk
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

    // الأمر !mute (كتم/إلغاء الكتم)
    if (content === '!mute') {
        const member = message.guild.members.cache.get(client.user.id);
        if (member && member.voice.channel) {
            const targetMuteState = !member.voice.mute; // عكس الحالة الحالية
            const success = await updateVoiceState(member.voice.deaf, targetMuteState);
            if (success) {
                message.channel.send(targetMuteState ? '🔇 تم كتم الصوت.' : '🔈 تم إلغاء كتم الصوت.');
            }
        }
    }

    // الأمر !deafen (عزل/إلغاء العزل)
    if (content === '!deafen') {
        const member = message.guild.members.cache.get(client.user.id);
        if (member && member.voice.channel) {
            const targetDeafState = !member.voice.deaf; // عكس الحالة الحالية
            const success = await updateVoiceState(targetDeafState, member.voice.mute);
            if (success) {
                message.channel.send(targetDeafState ? '🙉 تم عزل الصوت (Deafen).' : '🔊 تم إلغاء عزل الصوت.');
            }
        }
    }

    // الأمر !screenshare (تم إصلاحه ليستخدم streamer.play)
    if (content === '!screenshare') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي. استخدم !join أو !afk أولاً.');
            return;
        }
        
        try {
            // استخدام streamer.play مباشرة لتشغيل البث
            // هذه هي الطريقة الجديدة والصحيحة في الإصدارات الأخيرة
            const streamPlayer = streamer.play(BLACK_SCREEN_VIDEO_URL, currentVoiceConnection);

            streamPlayer.on('start', () => {
                message.channel.send('✅ تم بدء مشاركة الشاشة (Go Live).');
                console.log('✅ تم بدء البث.');
            });
            
            streamPlayer.on('error', (error) => {
                console.error('خطأ في مشغل البث:', error.message);
                message.channel.send('❌ خطأ أثناء تشغيل البث. (هل FFmpeg مُثبت؟)');
            });

            // لا نحتاج لمتغير عالمي لـ streamPlayer، لأنه سيعمل حتى يتم استدعاء .destroy أو !leave
            
        } catch (error) {
            console.error('❌ خطأ في أمر Screenshare:', error.message);
            message.channel.send(`❌ حدث خطأ أثناء محاولة مشاركة الشاشة: ${error.message}`);
        }
    }

    // الأمر !stopshare
    if (content === '!stopshare') {
        // بما أن streamer.play لا يُعيد مشغلًا يمكن إيقافه بسهولة، سنعتمد على الخروج من الروم أو إنهاء البث.
        // الحل العملي هو إيقاف الفيديو ثم الخروج والدخول مرة أخرى إن لزم الأمر.
        if (currentVoiceConnection) {
            // إيقاف الفيديو على اتصال الديسكورد
            currentVoiceConnection.setVideo(false); 
            message.channel.send('✅ تم إيقاف مشاركة الشاشة. إذا لم يتوقف البث، قد تحتاج إلى !leave ثم !join.');
        } else {
            message.channel.send('❌ لا يوجد بث شاشة فعال لإيقافه.');
        }
    }

    // الأمر !leave
    if (content === '!leave') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي.');
            return;
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
