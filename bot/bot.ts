import { Client, GatewayIntentBits, Message as DiscordMessage } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// 1. Initialize Supabase (Admin Mode)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Initialize Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Crucial for reading text
  ],
});

const TARGET_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID!;

client.on('ready', () => {
  console.log(`🤖 Bot is online as ${client.user?.tag}`);
  console.log(`📡 Listening to channel: ${TARGET_CHANNEL_ID}`);
});

client.on('messageCreate', async (message: DiscordMessage) => {
  // Ignore messages from other channels or bots (prevents loops)
  if (message.channelId !== TARGET_CHANNEL_ID) return;
  if (message.author.bot) return;

  console.log(`📨 New message from ${message.author.username}: ${message.content}`);

  // 3. Upsert into Supabase
  // We use 'upsert' on the Unique Key (discord_message_id) to ensure Idempotency.
  const { error } = await supabase.from('messages').upsert({
    discord_message_id: message.id,
    content: message.content,
    author_username: message.author.username,
    author_avatar_url: message.author.displayAvatarURL(),
    channel_id: message.channelId,
  });

  if (error) {
    console.error('❌ Failed to save message:', error);
  } else {
    console.log('✅ Message saved to DB');
  }
});

// Start the bot
client.login(process.env.DISCORD_BOT_TOKEN);