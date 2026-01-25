'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/LoadingState';
import { PlusIcon, TrashIcon, RefreshCwIcon } from 'lucide-react';

interface YouTubeChannel {
  id: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl?: string;
}

interface YouTubeChannelManagerProps {
  userId: string;
}

export default function YouTubeChannelManager({ userId }: YouTubeChannelManagerProps) {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [following, setFollowing] = useState(false);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/youtube/channels?userId=${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch channels');
      }

      setChannels(data.channels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!input.trim()) return;

    try {
      setFollowing(true);
      setError(null);

      const response = await fetch('/api/youtube/channels/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to follow channel');
      }

      setInput('');
      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to follow channel');
    } finally {
      setFollowing(false);
    }
  };

  const handleUnfollow = async (channelId: string) => {
    try {
      const response = await fetch(
        `/api/youtube/channels/${channelId}/unfollow?userId=${userId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unfollow channel');
      }

      await fetchChannels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfollow channel');
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/youtube/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh channels');
      }

      alert(
        `Refreshed ${data.channelsRefreshed} channels. ${data.videosAdded} new videos added.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh channels');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchChannels();
  }, []);

  return (
    <div className="space-y-6">
      {/* Add Channel Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Follow YouTube Channel
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Paste channel URL, ID, or @handle"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFollow()}
            className="flex-1"
          />
          <Button onClick={handleFollow} disabled={following || !input.trim()}>
            <PlusIcon className="w-4 h-4 mr-1" />
            {following ? 'Following...' : 'Follow'}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
        )}
      </Card>

      {/* Followed Channels List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Followed Channels ({channels.length})
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={loading || channels.length === 0}
          >
            <RefreshCwIcon className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </div>

        {loading ? (
          <LoadingState />
        ) : channels.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-center py-8">
            No channels followed yet. Add one above!
          </p>
        ) : (
          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {channel.thumbnailUrl && (
                  <img
                    src={channel.thumbnailUrl}
                    alt={channel.channelName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">
                    {channel.channelName}
                  </h3>
                  <a
                    href={channel.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-600 dark:text-slate-400 hover:underline truncate block"
                  >
                    {channel.channelUrl}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleUnfollow(channel.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
