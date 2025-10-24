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

// دالة مساعدة عامة للعثور على الروم الصوتي الذي يتواجد فيه المستخدم (السيلف بوت)
function getBotVoiceState() {
    if (!client.user) return null;
    
    // البحث في جميع السيرفرات المتصل بها
    for (const guild of client.guilds.cache.values()) {
        const member = guild.members.cache.get(client.user.id);
        if (member && member.voice.channel) {
            // إرجاع كائن العضو وحالة الاتصال
            return { member, connection: currentVoiceConnection };
        }
    }
    return null;
}

// دالة مساعدة جديدة: للعثور على الروم الصوتي للمستخدم (أنت)
function findUserVoiceChannel() {
    if (!client.user) return null;
    
    // البحث عن المستخدم (السيلف بوت) في كل السيرفرات
    for (const guild of client.guilds.cache.values()) {
        const member = guild.members.cache.get(client.user.id);
        // إذا كان العضو متصلاً بروم صوتي، نُعيد قناة الصوت
        if (member && member.voice.channel) {
            return member.voice.channel;
        }
    }
    return null;
}


client.on('messageCreate', async (message) => {
    // تجاهل الرسائل التي لا تأتي من حساب البوت نفسه
    if (message.author.id !== client.user.id) return;
    
    const content = message.content.toLowerCase();
    const channelId = process.env.CHANNEL_ID;
    const guildId = process.env.GUILD_ID;

    // دالة مساعدة لتحديث حالة الميوت/الديفن
    async function updateVoiceState(deaf, mute) {
        const state = getBotVoiceState();

        if (state) {
            try {
                // استخدام Streamer لتحديث حالة الميوت/الديفن
                await streamer.setDeaf(deaf);
                await streamer.setMute(mute);
                return true;
            } catch (error) {
                message.channel.send(`❌ خطأ في تحديث حالة الصوت: ${error.message}`);
                return false;
            }
        }
        message.channel.send('❌ البوت غير متصل بروم صوتي لتغيير حالته.');
        return false;
    }
    
    // الأمر !reset
    if (content === '!reset') {
        if (currentVoiceConnection) {
            try {
                await currentVoiceConnection.destroy();
            } catch (e) {
                // تجاهل خطأ التدمير إذا كان الاتصال غير صالح بالفعل
            }
        }
        currentVoiceConnection = null;
        message.channel.send('✅ تم تصفير حالة الاتصال بنجاح. يمكنك الآن استخدام !join أو !afk.');
        return;
    }


    // الأمر !join
    if (content === '!join') {
        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي! إذا لم يكن كذلك، استخدم !reset.');
            return;
        }

        try {
            const channel = await client.channels.fetch(channelId);
            if (!channel || channel.type !== 'GUILD_VOICE' || !guildId) {
                message.channel.send('❌ لم يتم العثور على الروم/السيرفر المحدد في .env أو المعلومات غير صحيحة.');
                return;
            }
            
            const connection = await streamer.joinVoice(guildId, channelId); 
            currentVoiceConnection = connection;

            message.channel.send('✅ تم الاتصال بالروم الصوتي بنجاح.');
        } catch (error) {
            message.channel.send('❌ حدث خطأ أثناء محاولة الانضمام للروم. (تأكد من وجود البوت في السيرفر).');
        }
    }

    // الأمر !afk (يعمل الآن من أي مكان)
    if (content === '!afk') {
        if (currentVoiceConnection) {
            message.channel.send('❌ البوت متصل بالفعل بروم صوتي! إذا لم يكن كذلك، استخدم !reset.');
            return;
        }
        
        try {
            // البحث عن الروم الصوتي الذي يتواجد فيه المستخدم (السيلف بوت)
            const foundChannel = findUserVoiceChannel();
            
            if (!foundChannel) {
                message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً لتشغيل هذا الأمر.');
                return;
            }

            const connection = await streamer.joinVoice(foundChannel.guild.id, foundChannel.id);
            currentVoiceConnection = connection;

            message.channel.send(`✅ تم تفعيل وضع AFK في الروم: ${foundChannel.name}`);
        } catch (err) {
            message.channel.send('❌ حدث خطأ أثناء محاولة تشغيل أمر AFK.');
        }
    }

    // أوامر التحكم في الصوت والبث (!mute, !deafen, !screenshare, !stopshare)
    if (content === '!mute' || content === '!deafen' || content === '!screenshare' || content === '!stopshare') {
        
        const state = getBotVoiceState();
        
        if (!state) {
            message.channel.send('❌ البوت غير متصل بروم صوتي لتنفيذ هذا الأمر.');
            return;
        }

        const member = state.member;
        
        if (content === '!mute') {
            const targetMuteState = !member.voice.mute; 
            const success = await updateVoiceState(member.voice.deaf, targetMuteState);
            if (success) {
                message.channel.send(targetMuteState ? '🔇 تم كتم الصوت.' : '🔈 تم إلغاء كتم الصوت.');
            }
        } 
        
        else if (content === '!deafen') {
            const targetDeafState = !member.voice.deaf; 
            const success = await updateVoiceState(targetDeafState, member.voice.mute);
            if (success) {
                message.channel.send(targetDeafState ? '🙉 تم عزل الصوت (Deafen).' : '🔊 تم إلغاء عزل الصوت.');
            }
        } 
        
        else if (content === '!screenshare') {
            try {
                // استخدام streamer.play مباشرة لتشغيل البث
                const streamPlayer = streamer.play(BLACK_SCREEN_VIDEO_URL, currentVoiceConnection);

                streamPlayer.on('start', () => {
                    message.channel.send('✅ تم بدء مشاركة الشاشة (Go Live).');
                });
                
                streamPlayer.on('error', (error) => {
                    message.channel.send('❌ خطأ أثناء تشغيل البث. (هل FFmpeg مُثبت؟)');
                });
                
            } catch (error) {
                message.channel.send(`❌ حدث خطأ أثناء محاولة مشاركة الشاشة: ${error.message}`);
            }
        } 
        
        else if (content === '!stopshare') {
            // إيقاف الفيديو على اتصال الديسكورد
            currentVoiceConnection.setVideo(false); 
            message.channel.send('✅ تم إيقاف مشاركة الشاشة.');
        }
    }


    // الأمر !leave
    if (content === '!leave') {
        if (!currentVoiceConnection) {
            message.channel.send('❌ البوت غير متصل بروم صوتي.');
            return;
        }
        
        try {
            await currentVoiceConnection.destroy();
            currentVoiceConnection = null;

            message.channel.send('✅ تم الخروج من الروم الصوتي.');
        } catch (error) {
            // في حالة فشل الخروج، نقوم بتصفير المتغير يدوياً
            currentVoiceConnection = null;
            message.channel.send('❌ حدث خطأ أثناء محاولة الخروج من الروم. تم تصفير الحالة يدوياً. يمكنك الآن استخدام !join.');
        }
    }
});

client.login(process.env.TOKEN);
