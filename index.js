require('dotenv').config(); // لتحميل المتغيرات من ملف .env
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel } = require('@discordjs/voice');
const express = require('express'); // <-- إضافة Express
const app = express();
const port = process.env.PORT || 3000;

// سيرفر وهمي لـ Render
app.get('/', (req, res) => {
  res.send('Bot is running!');
});
app.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});

const client = new Client();

client.on('ready', async () => {
  console.log(`${client.user.username} is ready!`);

  const channelId = process.env.CHANNEL_ID;
  const guildId = process.env.GUILD_ID;

  if (!channelId || !guildId) {
    console.error('Missing CHANNEL_ID or GUILD_ID in .env file.');
    return;
  }

  setInterval(async () => {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error('Channel not found.');
        return;
      }

      joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        selfMute: true,
        selfDeaf: true,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
    } catch (error) {
      console.error('Error joining voice channel:', error.message);
    }
  }, 1000); // تحديث كل ثانية
});

client.login(process.env.TOKEN);
