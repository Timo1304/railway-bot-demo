'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Message } from '@/types/supabase';


// Initialize Client (Public Key is safe here)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('🔴 Connecting...');

  useEffect(() => {
    // 1. Fetch initial history (Last 50 messages)
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) console.error('Error fetching history:', error);
      else setMessages(data || []);
      setStatus('🟢 Live');
    };

    fetchHistory();

    // 2. Subscribe to Realtime Updates (The "Stream")
    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('New message received:', payload);
          // Prepend the new message to the list immediately
          setMessages((prev) => [payload.new as Message, ...prev]);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setStatus('🟢 Live Streaming');
      });

    // Cleanup when user leaves page
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 p-8 font-mono">
      <header className="max-w-4xl mx-auto mb-8 border-b border-gray-700 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Railway Discord Stream</h1>
          <p className="text-gray-400 text-sm mt-1">
            System: <span className="text-emerald-400">{status}</span>
          </p>
        </div>
        <div className="text-xs text-gray-500">
           Syncing via Supabase Realtime
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className="bg-gray-800 border border-gray-700 rounded p-4 flex gap-4 animate-in fade-in slide-in-from-top-2 duration-300"
          >
            <div className="shrink-0">
                  {msg.author_avatar_url ? (
                    <Image
                      src={msg.author_avatar_url}
                      alt={msg.author_username}
                      width={40}
                      height={40}
                      className="rounded-full bg-gray-600"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                      {msg.author_username[0].toUpperCase()}
                    </div>
                  )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-bold text-indigo-400">
                  {msg.author_username}
                </h3>
                <span className="text-xs text-gray-500">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="mt-1 text-gray-300 wrap-break-word whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-20 italic">
            Waiting for signals...
          </div>
        )}
      </div>
    </main>
  );
}