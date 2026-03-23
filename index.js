require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const Parser = require('rss-parser');

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const parser = new Parser();

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const RSS_URL = process.env.RSS_URL;

let lastLink = '';

client.once('ready', async () => { 
  console.log(`ログイン成功: ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  channel.send("Bot接続");

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

client.login(TOKEN);