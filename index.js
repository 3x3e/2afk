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
    
    // 🆕 تم حذف 'if (!message.guild) return;' للسماح بجميع الأوامر
    
    const content = message.content.toLowerCase();
    const channelId = process.env.CHANNEL_ID;
    const guildId = process.env.GUILD_ID;

    // دالة مساعدة لتحديث حالة الميوت/الديفن
    async function updateVoiceState(deaf, mute) {
        // 🆕 يجب أن يكون هناك سيرفر عند استدعاء هذه الدالة
        if (!message.guild) return false; 
        
        const member = message.guild.members.cache.get(client.user.id);

        if (member && member.voice.channel) {
            try {
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

    // الأمر !reset: لتصفير حالة الاتصال يدويًا (يعمل في أي مكان)
    if (content === '!reset') {
        if (currentVoiceConnection) {
            try {
                await currentVoiceConnection.destroy();
            } catch (e) {
                console.log('فشل تدمير الاتصال القديم، سيتم تصفير المتغير فقط.');
            }
        }
        currentVoiceConnection = null;
        message.channel.send('✅ تم تصفير حالة الاتصال بنجاح. يمكنك الآن استخدام !join أو !afk.');
        return;
    }

    // الأمر !join (يعمل في أي مكان)
    if (content === '!join') {
        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي! إذا لم يكن كذلك، استخدم !reset.');
            return;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 'GUILD_VOICE') {
                message.channel.send('❌ لم يتم العثور على الروم الصوتي المحدد في .env.');
                return;
            }
            
            // 🆕 يجب التأكد من وجود guildId قبل الانضمام
            if (!guildId) {
                message.channel.send('❌ لم يتم تحديد GUILD_ID في ملف .env.');
                return;
            }
            
            const connection = await streamer.joinVoice(guildId, channelId); 
            currentVoiceConnection = connection;

            message.channel.send('✅ تم الاتصال بالروم الصوتي بنجاح.');
            console.log('✅ تم الانضمام للروم الصوتي.');
        } catch (error) {
            console.error('خطأ أثناء محاولة الانضمام للروم:', error.message);
            message.channel.send('❌ حدث خطأ أثناء محاولة الانضمام للروم.');
        }
    }

    // الأمر !afk (يتطلب أن تكون الرسالة داخل سيرفر)
    if (content === '!afk') {
        // 🆕 فحص السيرفر
        if (!message.guild) {
            message.channel.send('❌ أمر !afk يتطلب أن تكون في سيرفر.');
            return;
        }

        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي! إذا لم يكن كذلك، استخدم !reset.');
            return;
        }
        try {
            const senderGuild = client.guilds.cache.get(message.guildId);
            const me = senderGuild.members.cache.get(client.user.id);
            const foundChannel = me && me.voice.channel ? me.voice.channel : null;

            if (!foundChannel) {
                message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً لتشغيل هذا الأمر.');
                return;
            }

            const connection = await streamer.joinVoice(foundChannel.guild.id, foundChannel.id);
            currentVoiceConnection = connection;

            message.channel.send(`✅ تم تفعيل وضع AFK في الروم: ${foundChannel.name}`);
            console.log(`✅ تفعيل AFK في الروم: ${foundChannel.name}`);
        } catch (err) {
            console.error('❌ خطأ في أمر AFK:', err.message);
            message.channel.send('❌ حدث خطأ أثناء محاولة تشغيل أمر AFK.');
        }
    }

    // أوامر التحكم في الصوت والبث (!mute, !deafen, !screenshare, !stopshare)
    if (content === '!mute' || content === '!deafen' || content === '!screenshare' || content === '!stopshare') {
        // 🆕 فحص السيرفر لجميع أوامر التحكم الصوتي والبث
        if (!message.guild) {
            message.channel.send('❌ هذا الأمر يتطلب أن تكون في سيرفر.');
            return;
        }

        const member = message.guild.members.cache.get(client.user.id);
        const isConnected = member && member.voice.channel;

        if (content === '!mute') {
            if (!isConnected) {
                message.channel.send('❌ البوت غير متصل بروم صوتي لتغيير حالته.');
                return;
            }
            const targetMuteState = !member.voice.mute; 
            const success = await updateVoiceState(member.voice.deaf, targetMuteState);
            if (success) {
                message.channel.send(targetMuteState ? '🔇 تم كتم الصوت.' : '🔈 تم إلغاء كتم الصوت.');
            }
        } 
        
        else if (content === '!deafen') {
            if (!isConnected) {
                message.channel.send('❌ البوت غير متصل بروم صوتي لتغيير حالته.');
                return;
            }
            const targetDeafState = !member.voice.deaf; 
            const success = await updateVoiceState(targetDeafState, member.voice.mute);
            if (success) {
                message.channel.send(targetDeafState ? '🙉 تم عزل الصوت (Deafen).' : '🔊 تم إلغاء عزل الصوت.');
            }
        } 
        
        else if (content === '!screenshare') {
            if (!currentVoiceConnection) {
                message.channel.send('❌ البوت غير متصل بروم صوتي. استخدم !join أو !afk أولاً.');
                return;
            }
            
            try {
                const streamPlayer = streamer.play(BLACK_SCREEN_VIDEO_URL, currentVoiceConnection);

                streamPlayer.on('start', () => {
                    message.channel.send('✅ تم بدء مشاركة الشاشة (Go Live).');
                    console.log('✅ تم بدء البث.');
                });
                
                streamPlayer.on('error', (error) => {
                    console.error('خطأ في مشغل البث:', error.message);
                    message.channel.send('❌ خطأ أثناء تشغيل البث. (هل FFmpeg مُثبت؟)');
                });
                
            } catch (error) {
                console.error('❌ خطأ في أمر Screenshare:', error.message);
                message.channel.send(`❌ حدث خطأ أثناء محاولة مشاركة الشاشة: ${error.message}`);
            }
        } 
        
        else if (content === '!stopshare') {
            if (currentVoiceConnection) {
                currentVoiceConnection.setVideo(false); 
                message.channel.send('✅ تم إيقاف مشاركة الشاشة. إذا لم يتوقف البث، قد تحتاج إلى !leave ثم !join.');
            } else {
                message.channel.send('❌ لا يوجد بث شاشة فعال لإيقافه.');
            }
        }
    }


    // الأمر !leave (يعمل في أي مكان)
    if (content === '!leave') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي.');
            return;
        }
        
        try {
            await currentVoiceConnection.destroy();
            currentVoiceConnection = null;

            message.channel.send('✅ تم الخروج من الروم الصوتي.');
            console.log('✅ تم الخروج من الروم الصوتي.');
        } catch (error) {
            console.error('خطأ أثناء الخروج من الروم، سيتم تصفير المتغير:', error.message);
            currentVoiceConnection = null;
            message.channel.send('❌ حدث خطأ أثناء محاولة الخروج من الروم. تم تصفير الحالة يدوياً. يمكنك الآن استخدام !join.');
        }
    }
});

client.login(process.env.TOKEN);
