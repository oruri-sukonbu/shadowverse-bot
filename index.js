const express = require('express');
const app = express();

const PORT = process.env.PORT;
if (!PORT) {
  console.error('Error: PORT environment variable is not set.');
  process.exit(1);
}

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

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

// Function to fetch RSS feed and send new posts to Discord channel
async function checkRSSFeed() {
  try {
    const feed = await parser.parseURL(RSS_URL);
    if (!feed || !feed.items || feed.items.length === 0) {
      console.warn('RSS feed is empty or unavailable.');
      return;
    }

    const latest = feed.items[0];

    if (!latest || !latest.link) {
      console.warn('Latest RSS item is missing or has no link.');
      return;
    }

    if (latest.link === lastLink) {
      // No new post since last check
      return;
    }

    lastLink = latest.link;

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error(`Discord channel with ID ${CHANNEL_ID} not found.`);
      return;
    }

    // Extract image URL from enclosure or content
    let imageUrl = null;
    if (latest.enclosure && latest.enclosure.url) {
      imageUrl = latest.enclosure.url;
    } else if (latest.content) {
      const match = latest.content.match(/<img.*?src="(.*?)"/);
      if (match) imageUrl = match[1];
    }

    const embed = new EmbedBuilder()
      .setTitle("📢 新着シャドバ投稿！")
      .setDescription(latest.title || '')
      .setURL(latest.link)
      .setColor(0x00AE86)
      .setFooter({ text: "Shadowverse公式" })
      .setTimestamp();

    if (imageUrl) {
      embed.setImage(imageUrl);
    }

    await channel.send({ embeds: [embed] });
    console.log(`New post sent: ${latest.title}`);

  } catch (error) {
    console.error('Error occurred while checking RSS feed:', error);
    // Could implement retry logic here if desired
  }
}

client.once('ready', async () => {
  console.log(`ログイン成功: ${client.user.tag}`);
  const channel = await client.channels.fetch(CHANNEL_ID);
  if (channel) {
    channel.send("Bot接続");
  } else {
    console.error(`Discord channel with ID ${CHANNEL_ID} not found on startup.`);
  }

  // Check RSS feed immediately and then every 60 seconds
  await checkRSSFeed();
  setInterval(checkRSSFeed, 60000);
});

client.login(TOKEN).catch(error => {
  console.error('Failed to login to Discord. Please check your TOKEN environment variable.');
  console.error(error);
  // Do not exit process to keep the web server running
});