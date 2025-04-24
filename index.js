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

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.id !== client.user.id) return; // فقط أوامرك

  const content = message.content.toLowerCase();
  const channelId = process.env.CHANNEL_ID;
  const guildId = process.env.GUILD_ID;

  // أمر !join يدخل روم محدد من env
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

  // أمر !afk يدخل الروم اللي أنت متصل فيه بنفس الحساب
  if (content === '!afk') {
    const userVoiceChannel = client.voice?.channel;

    if (!userVoiceChannel) {
      message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
      return;
    }

    try {
      joinVoiceChannel({
        channelId: userVoiceChannel.id,
        guildId: userVoiceChannel.guild.id,
        selfMute: true,
        selfDeaf: true,
        adapterCreator: userVoiceChannel.guild.voiceAdapterCreator,
      });

      message.channel.send(`✅ أنت الآن في وضع AFK في الروم: ${userVoiceChannel.name}`);
      console.log(`✅ دخل الروم: ${userVoiceChannel.name}`);
    } catch (err) {
      console.error('❌ خطأ في أمر AFK:', err.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تنفيذ أمر AFK.');
    }
  }

  // أمر !leave يطلع من الروم
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
});

client.login(process.env.TOKEN);
