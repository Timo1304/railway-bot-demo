export type Message = {
  id: number;
  discord_message_id: string;
  content: string;
  author_username: string;
  author_avatar_url: string | null;
  channel_id: string;
  created_at: string;
};
