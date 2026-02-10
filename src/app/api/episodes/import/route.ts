import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth-helpers';

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
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ImportEpisodeRequest = await request.json();
    const { episode, podcast } = body;

    if (!episode || !podcast) {
      return NextResponse.json(
        { error: 'Episode and podcast data are required' },
        { status: 400 }
      );
    }

    // Validate input lengths and formats
    if (!episode.title || episode.title.length > 1000) {
      return NextResponse.json({ error: 'Invalid episode title' }, { status: 400 });
    }
    if (episode.description && episode.description.length > 50000) {
      return NextResponse.json({ error: 'Description too long' }, { status: 400 });
    }
    if (episode.audioUrl) {
      try {
        const parsed = new URL(episode.audioUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          return NextResponse.json({ error: 'audioUrl must be HTTP/HTTPS' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid audioUrl' }, { status: 400 });
      }
    }
    if (episode.publishedAt && isNaN(Date.parse(episode.publishedAt))) {
      return NextResponse.json({ error: 'Invalid publishedAt date' }, { status: 400 });
    }

    const supabase = createAdminClient();

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

    // Atomically update podcast's latest_episode_date (only if newer)
    if (episode.publishedAt) {
      const publishedDate = new Date(episode.publishedAt).toISOString();

      // Update only if current latest is null or older than this episode
      await supabase
        .from('podcasts')
        .update({ latest_episode_date: publishedDate })
        .eq('id', podcastId)
        .or(`latest_episode_date.is.null,latest_episode_date.lt.${publishedDate}`);
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
