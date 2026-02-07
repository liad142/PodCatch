import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestSummary, getSummariesStatus } from "@/lib/summary-service";
import { fetchPodcastFeed } from "@/lib/rss";
import { getAuthUser } from "@/lib/auth-helpers";
import type { SummaryLevel } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function logWithTime(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(`[API /summaries ${timestamp}] ${message}`, data ? JSON.stringify(data) : '');
}

// GET /api/episodes/:id/summaries - Get both summary levels with statuses
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    logWithTime('GET request received', { episodeId: id });
    const result = await getSummariesStatus(id);
    logWithTime('GET request completed', { episodeId: id });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json({ error: 'Failed to fetch summaries' }, { status: 500 });
  }
}

// POST /api/episodes/:id/summaries - Request summary generation (idempotent)
export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const level: SummaryLevel = body.level || 'quick';

    logWithTime('POST request received', { episodeId: id, level });

    // Get episode with podcast info - language comes from RSS feed
    logWithTime('Fetching episode and podcast from DB...');
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        audio_url,
        transcript_url,
        podcasts!inner (id, language, rss_feed_url)
      `)
      .eq('id', id)
      .single();

    if (episodeError || !episode) {
      logWithTime('Episode not found', { episodeId: id, error: episodeError });
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    // Self-healing language detection:
    // If language is already set and not 'en' (default), use it directly from DB cache
    const podcastData = episode.podcasts as unknown as { id: string; language: string | null; rss_feed_url: string } | null;
    let language = podcastData?.language;

    if (language && language !== 'en') {
      // Language is already cached and valid - skip RSS fetch
      logWithTime('Using cached language from DB', { language });
    } else {
      // Language missing or 'en' (might be old default) - fetch from RSS to verify
      logWithTime('Language missing or default, fetching from RSS...', {
        currentLanguage: language,
        rssUrl: podcastData?.rss_feed_url?.substring(0, 50)
      });

      try {
        if (podcastData?.rss_feed_url) {
          let rssLanguage: string | undefined;

          // Handle Apple Podcasts (format: "apple:1234567890")
          if (podcastData.rss_feed_url.startsWith('apple:')) {
            logWithTime('Fetching language from Apple Podcasts RSS...');
            const appleId = podcastData.rss_feed_url.replace('apple:', '');

            // Get podcast details from iTunes to get the RSS feed URL
            const { getPodcastById } = await import('@/lib/apple-podcasts');
            const applePodcast = await getPodcastById(appleId, 'us');

            if (applePodcast?.feedUrl) {
              // Now fetch the actual RSS feed to get language
              const { podcast: rssPodcast } = await fetchPodcastFeed(applePodcast.feedUrl);
              rssLanguage = rssPodcast.language;
            }
          } else {
            // Regular RSS feed
            const { podcast: rssPodcast } = await fetchPodcastFeed(podcastData.rss_feed_url);
            rssLanguage = rssPodcast.language;
          }

          if (rssLanguage && rssLanguage !== language) {
            // Found different language in RSS - update DB for future requests and use it
            logWithTime('Found language in RSS, updating DB...', {
              oldLanguage: language,
              newLanguage: rssLanguage
            });

            await supabase
              .from('podcasts')
              .update({ language: rssLanguage })
              .eq('id', podcastData.id);

            language = rssLanguage;
          } else {
            language = rssLanguage || 'en';
          }
        }
      } catch (rssError) {
        logWithTime('Failed to fetch RSS for language, using fallback', {
          error: rssError instanceof Error ? rssError.message : String(rssError)
        });
        language = language || 'en';
      }
    }

    logWithTime('Episode found, calling requestSummary...', { 
      audioUrl: episode.audio_url?.substring(0, 50) + '...',
      transcriptUrl: episode.transcript_url ? 'YES (FREE!)' : 'NO',
      language
    });
    
    // Pass transcript URL for FREE transcription (Priority A)
    const result = await requestSummary(
      id,
      level,
      episode.audio_url,
      language || undefined,
      episode.transcript_url || undefined  // Priority A: FREE transcript from RSS
    );

    logWithTime('POST request completed', {
      episodeId: id,
      status: result.status,
      totalDurationMs: Date.now() - startTime,
      totalDurationSec: ((Date.now() - startTime) / 1000).toFixed(1)
    });

    return NextResponse.json({
      episodeId: id,
      level,
      ...result
    });
  } catch (error) {
    logWithTime('POST request FAILED', {
      error: error instanceof Error ? error.message : String(error),
      totalDurationMs: Date.now() - startTime
    });
    console.error('Error requesting summary:', error);
    return NextResponse.json({ error: 'Failed to request summary' }, { status: 500 });
  }
}
