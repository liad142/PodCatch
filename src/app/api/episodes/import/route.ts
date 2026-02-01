import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

interface ImportEpisodeRequest {
  episode: {
    externalId: string;
    title: string;
    description: string;
    publishedAt: string;
    duration: number;
    audioUrl?: string;
  };
  podcast: {
    externalId: string;
    name: string;
    artistName: string;
    artworkUrl: string;
    feedUrl?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ImportEpisodeRequest = await request.json();
    const { episode, podcast } = body;

    if (!episode || !podcast) {
      return NextResponse.json(
        { error: 'Episode and podcast data are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if podcast exists by external ID stored in rss_feed_url
    // We use a convention: apple:podcastId as rss_feed_url for imported podcasts
    const externalPodcastRef = `apple:${podcast.externalId}`;

    let { data: existingPodcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('rss_feed_url', podcast.feedUrl || externalPodcastRef)
      .single();

    let podcastId: string;

    if (!existingPodcast) {
      // Also check by the apple: reference
      const { data: podcastByRef } = await supabase
        .from('podcasts')
        .select('id')
        .eq('rss_feed_url', externalPodcastRef)
        .single();

      if (podcastByRef) {
        podcastId = podcastByRef.id;
      } else {
        // Create podcast
        const { data: newPodcast, error: podcastError } = await supabase
          .from('podcasts')
          .insert({
            title: podcast.name,
            author: podcast.artistName,
            description: null,
            rss_feed_url: podcast.feedUrl || externalPodcastRef,
            image_url: podcast.artworkUrl,
            language: 'en',
          })
          .select('id')
          .single();

        if (podcastError) {
          console.error('Error creating podcast:', podcastError);
          return NextResponse.json(
            { error: 'Failed to create podcast' },
            { status: 500 }
          );
        }
        podcastId = newPodcast.id;
      }
    } else {
      podcastId = existingPodcast.id;
    }

    // Check if episode exists by external ID
    // We store external ID in a specific format in a comment field or match by audio_url
    const externalEpisodeRef = `apple:${episode.externalId}`;

    let { data: existingEpisode } = await supabase
      .from('episodes')
      .select('id')
      .eq('podcast_id', podcastId)
      .eq('audio_url', episode.audioUrl || externalEpisodeRef)
      .single();

    if (!existingEpisode && episode.audioUrl) {
      // Also check by audio URL
      const { data: episodeByAudio } = await supabase
        .from('episodes')
        .select('id')
        .eq('audio_url', episode.audioUrl)
        .single();

      if (episodeByAudio) {
        existingEpisode = episodeByAudio;
      }
    }

    if (existingEpisode) {
      // Episode already exists, return its ID
      return NextResponse.json({
        episodeId: existingEpisode.id,
        podcastId,
        isNew: false,
      });
    }

    // Create episode
    const { data: newEpisode, error: episodeError } = await supabase
      .from('episodes')
      .insert({
        podcast_id: podcastId,
        title: episode.title,
        description: episode.description || null,
        audio_url: episode.audioUrl || externalEpisodeRef,
        duration_seconds: episode.duration || null,
        published_at: episode.publishedAt ? new Date(episode.publishedAt).toISOString() : null,
      })
      .select('id')
      .single();

    if (episodeError) {
      console.error('Error creating episode:', episodeError);
      return NextResponse.json(
        { error: 'Failed to create episode' },
        { status: 500 }
      );
    }

    // Update podcast's latest_episode_date for "new episode" badge
    if (episode.publishedAt) {
      const publishedDate = new Date(episode.publishedAt).toISOString();

      // Only update if this episode is newer than the current latest
      const { data: currentPodcast } = await supabase
        .from('podcasts')
        .select('latest_episode_date')
        .eq('id', podcastId)
        .single();

      const shouldUpdate = !currentPodcast?.latest_episode_date ||
        new Date(publishedDate) > new Date(currentPodcast.latest_episode_date);

      if (shouldUpdate) {
        await supabase
          .from('podcasts')
          .update({ latest_episode_date: publishedDate })
          .eq('id', podcastId);
      }
    }

    return NextResponse.json({
      episodeId: newEpisode.id,
      podcastId,
      isNew: true,
    });
  } catch (error) {
    console.error('Error in episode import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
