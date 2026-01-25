'use client';

import React, { useState } from 'react';
import FeedScreen from '@/components/FeedScreen';
import YouTubeChannelManager from '@/components/YouTubeChannelManager';
import { Button } from '@/components/ui/button';

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'manage'>('feed');

  // TODO: Replace with actual user ID from auth context
  const userId = 'demo-user-id';

  return (
    <div className="px-4 py-8">
      {/* Tab Navigation */}
      <div className="bg-background/95 backdrop-blur border-b border-border sticky top-14 lg:top-0 z-10 -mx-4 px-4 mb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex gap-4 py-3">
            <Button
              variant={activeTab === 'feed' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('feed')}
              className="rounded-full"
            >
              Feed
            </Button>
            <Button
              variant={activeTab === 'manage' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('manage')}
              className="rounded-full"
            >
              Manage Channels
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto">
        {activeTab === 'feed' ? (
          <FeedScreen />
        ) : (
          <YouTubeChannelManager userId={userId} />
        )}
      </div>
    </div>
  );
}
