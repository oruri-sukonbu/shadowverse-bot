const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Web server running on port ${PORT}`);
});
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Parser = require('rss-parser');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const parser = new Parser();

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const RSS_URL = process.env.RSS_URL;

if (!TOKEN || TOKEN.trim() === '') {
  console.error('Error: Discord bot token is not set or is empty. Please set the TOKEN environment variable.');
  process.exit(1);
}

let lastLink = '';

client.once('ready', async () => { 
  console.log(`ログイン成功: ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (channel) {
    channel.send("Bot接続");
  }

  setInterval(() => {
    (async () => {
      try {
        const feed = await parser.parseURL(RSS_URL);
        const latest = feed.items[0];

        // 画像URL取得（優先: enclosure → content内のimg）
        let imageUrl = null;
        if (latest.enclosure && latest.enclosure.url) {
          imageUrl = latest.enclosure.url;
        } else if (latest.content) {
          const match = latest.content.match(/<img.*?src="(.*?)"/);
          if (match) imageUrl = match[1];
        }

        if (!latest) return;

        if (latest.link !== lastLink) {
          lastLink = latest.link;

          const channel = await client.channels.fetch(CHANNEL_ID);
          if (!channel) return;

          const embed = new EmbedBuilder()
            .setTitle("📢 新着シャドバ投稿！")
            .setDescription(latest.title)
            .setURL(latest.link)
            .setColor(0x00AE86)
            .setFooter({ text: "Shadowverse公式" })
            .setTimestamp();

          // 画像があれば追加
          if (imageUrl) {
            embed.setImage(imageUrl);
          }

          channel.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, 60000);
});

client.login(TOKEN).catch(error => {
  console.error('Failed to login to Discord. Please check your TOKEN environment variable.');
  console.error(error);
  process.exit(1);
});