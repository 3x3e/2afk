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
  if (message.author.id !== client.user.id) return;

  const content = message.content.toLowerCase().trim();
  const guildId = process.env.GUILD_ID;

  if (!guildId) {
    console.error('❌ Missing GUILD_ID in .env file.');
    return;
  }

  // أمر الدخول للروم الصوتي
  if (content.startsWith('!join')) {
    const args = content.split(' ');
    const customChannelId = args[1] || process.env.CHANNEL_ID;

    if (!customChannelId) {
      message.channel.send('❌ لم يتم تحديد ID الروم الصوتي.');
      return;
    }

    const connection = getVoiceConnection(guildId);
    if (connection && connection.state.status !== VoiceConnectionStatus.Disconnected) {
      message.channel.send('❌ البوت داخل الروم فعليًا!');
      return;
    }

    try {
      const channel = await client.channels.fetch(customChannelId);
      if (!channel || channel.type !== 2) {
        message.channel.send(`❌ لم يتم العثور على روم صوتي بهذا الـ ID: ${customChannelId}`);
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
      console.log(`✅ دخل الروم: ${channel.name}`);
    } catch (error) {
      console.error('❌ Error joining voice channel:', error);
      message.channel.send(`❌ حدث خطأ أثناء محاولة الدخول: ${error.message}`);
    }
  }

  // أمر الخروج من الروم الصوتي
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
      console.error('❌ Error leaving voice channel:', error);
      message.channel.send('❌ حدث خطأ أثناء محاولة الخروج.');
    }
  }
});

client.login(process.env.TOKEN);
