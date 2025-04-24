require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Express سيرفر وهمي لـ Render
app.get('/', (req, res) => {
  res.send('Bot is running!');
});
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});

const client = new Client();
let afkChannel = null; // متغير لتخزين القناة الصوتية عند استخدام أمر !afk

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return; // بس يستقبل أوامر منك

  const content = message.content.toLowerCase();
  const channelId = process.env.CHANNEL_ID;
  const guildId = process.env.GUILD_ID;

  if (!channelId || !guildId) {
    console.error('Missing CHANNEL_ID or GUILD_ID in .env file.');
    return;
  }

  // أمر !join لدخول الروم المحدد
  if (content === '!join') {
    const connection = getVoiceConnection(guildId);
    if (connection && connection.state.status !== VoiceConnectionStatus.Disconnected) {
      message.channel.send('❌ البوت داخل الروم فعليًا!');
      return;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        message.channel.send('❌ لم يتم العثور على الروم.');
        return;
      }

      joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        selfMute: true,
        selfDeaf: true,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      message.channel.send('✅ تم دخول الروم بنجاح');
      console.log('✅ تم دخول الروم');
    } catch (error) {
      console.error('خطأ في دخول الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الدخول.');
    }
  }

  // أمر !leave للخروج من الروم
  if (content === '!leave') {
    const connection = getVoiceConnection(guildId);
    if (!connection) {
      message.channel.send('❌ البوت غير متصل بالروم.');
      return;
    }

    try {
      connection.destroy();
      message.channel.send('✅ تم الخروج من الروم');
      console.log('✅ تم الخروج من الروم');
    } catch (error) {
      console.error('خطأ في الخروج من الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الخروج.');
    }
  }

  // أمر !afk للبقاء في الروم الحالي
  if (content === '!afk') {
    const connection = getVoiceConnection(guildId);
    if (connection) {
      afkChannel = connection.joinConfig.channelId; // تخزين القناة الحالية
      message.channel.send(`✅ أنت الآن في وضع AFK في الروم: <#${afkChannel}>`);
    } else {
      message.channel.send('❌ يجب أن تكون في قناة صوتية أولاً لاستخدام أمر AFK.');
    }
  }

  // أمر العودة إلى الروم السابق باستخدام !afk
  if (content === '!return') {
    if (afkChannel) {
      const channel = await client.channels.fetch(afkChannel);
      if (channel) {
        joinVoiceChannel({
          channelId: afkChannel,
          guildId: guildId,
          selfMute: true,
          selfDeaf: true,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });
        message.channel.send('✅ تم العودة إلى الروم السابق');
      } else {
        message.channel.send('❌ لم يتم العثور على القناة السابقة.');
      }
    } else {
      message.channel.send('❌ لم تكن في أي قناة عندما استخدمت أمر AFK.');
    }
  }
});

client.login(process.env.TOKEN);
