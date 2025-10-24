require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

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

  const content = message.content.toLowerCase();
  const channelId = process.env.CHANNEL_ID;
  const guildId = process.env.GUILD_ID;

  // !join: يدخل روم من .env
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
        selfMute: false,
        selfDeaf: false,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      message.channel.send('✅ تم دخول الروم بنجاح');
      console.log('✅ تم دخول الروم');
    } catch (error) {
      console.error('خطأ في دخول الروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الدخول.');
    }
  }

  // !afk: يدخل نفس الروم اللي أنت فيه
  if (content === '!afk') {
    try {
      let foundChannel = null;
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          foundChannel = me.voice.channel;
        }
      });

      if (!foundChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      joinVoiceChannel({
        channelId: foundChannel.id,
        guildId: foundChannel.guild.id,
        selfMute: true,
        selfDeaf: false,
        adapterCreator: foundChannel.guild.voiceAdapterCreator,
      });

      message.channel.send(`✅ أنت الآن في وضع AFK في الروم: ${foundChannel.name}`);
      console.log(`✅ دخل الروم: ${foundChannel.name}`);
    } catch (err) {
      console.error('❌ خطأ في أمر AFK:', err.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تنفيذ أمر AFK.');
    }
  }

  // !mute: يفعل الميوت
  if (content === '!mute') {
    try {
      let myGuild = null;
      let myChannel = null;
      
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          myGuild = guild;
          myChannel = me.voice.channel;
        }
      });

      if (!myGuild || !myChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      await client.ws.broadcast({
        op: 4,
        d: {
          guild_id: myGuild.id,
          channel_id: myChannel.id,
          self_mute: true,
          self_deaf: false,
        },
      });

      message.channel.send('🔇 تم تفعيل الميوت');
      console.log('🔇 تم تفعيل الميوت');
    } catch (error) {
      console.error('خطأ في تفعيل الميوت:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تفعيل الميوت.');
    }
  }

  // !unmute: يلغي الميوت
  if (content === '!unmute') {
    try {
      let myGuild = null;
      let myChannel = null;
      
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          myGuild = guild;
          myChannel = me.voice.channel;
        }
      });

      if (!myGuild || !myChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      await client.ws.broadcast({
        op: 4,
        d: {
          guild_id: myGuild.id,
          channel_id: myChannel.id,
          self_mute: false,
          self_deaf: false,
        },
      });

      message.channel.send('🔊 تم إلغاء الميوت');
      console.log('🔊 تم إلغاء الميوت');
    } catch (error) {
      console.error('خطأ في إلغاء الميوت:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة إلغاء الميوت.');
    }
  }

  // !deafen: يفعل الدفن
  if (content === '!deafen') {
    try {
      let myGuild = null;
      let myChannel = null;
      
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          myGuild = guild;
          myChannel = me.voice.channel;
        }
      });

      if (!myGuild || !myChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      await client.ws.broadcast({
        op: 4,
        d: {
          guild_id: myGuild.id,
          channel_id: myChannel.id,
          self_mute: true,
          self_deaf: true,
        },
      });

      message.channel.send('🔇 تم تفعيل الدفن');
      console.log('🔇 تم تفعيل الدفن');
    } catch (error) {
      console.error('خطأ في تفعيل الدفن:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة تفعيل الدفن.');
    }
  }

  // !undeafen: يلغي الدفن
  if (content === '!undeafen') {
    try {
      let myGuild = null;
      let myChannel = null;
      
      client.guilds.cache.forEach(guild => {
        const me = guild.members.cache.get(client.user.id);
        if (me && me.voice.channel) {
          myGuild = guild;
          myChannel = me.voice.channel;
        }
      });

      if (!myGuild || !myChannel) {
        message.channel.send('❌ يجب أن تكون متصلاً بروم صوتي أولاً.');
        return;
      }

      await client.ws.broadcast({
        op: 4,
        d: {
          guild_id: myGuild.id,
          channel_id: myChannel.id,
          self_mute: false,
          self_deaf: false,
        },
      });

      message.channel.send('🔊 تم إلغاء الدفن');
      console.log('🔊 تم إلغاء الدفن');
    } catch (error) {
      console.error('خطأ في إلغاء الدفن:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة إلغاء الدفن.');
    }
  }

  // !move: الانتقال لروم صوتي آخر
  if (content.startsWith('!move ')) {
    const targetChannelId = content.split(' ')[1];
    
    if (!targetChannelId) {
      message.channel.send('❌ يرجى كتابة آيدي الروم\nمثال: `!move 123456789`');
      return;
    }

    try {
      const targetChannel = await client.channels.fetch(targetChannelId);
      
      if (!targetChannel) {
        message.channel.send('❌ لم يتم العثور على الروم.');
        return;
      }

      if (targetChannel.type !== 'GUILD_VOICE' && targetChannel.type !== 2) {
        message.channel.send('❌ هذا ليس روم صوتي!');
        return;
      }

      // التحقق من الاتصال الحالي
      const currentConnection = getVoiceConnection(targetChannel.guild.id);
      if (currentConnection) {
        currentConnection.destroy();
      }

      // الدخول للروم الجديد
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: targetChannel.guild.id,
        selfMute: false,
        selfDeaf: false,
        adapterCreator: targetChannel.guild.voiceAdapterCreator,
      });

      message.channel.send(`✅ تم الانتقال إلى الروم: ${targetChannel.name}`);
      console.log(`✅ تم الانتقال إلى: ${targetChannel.name}`);
    } catch (error) {
      console.error('خطأ في الانتقال للروم:', error.message);
      message.channel.send('❌ حدث خطأ أثناء محاولة الانتقال. تأكد من صحة الآيدي.');
    }
  }

  // !leave: يخرج من الروم
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
