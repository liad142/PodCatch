import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestInsights, getInsightsStatus } from "@/lib/insights-service";
import { fetchPodcastFeed } from "@/lib/rss";

// GET /api/episodes/[id]/insights - Get insights status and content
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Language is auto-detected from existing transcripts in getInsightsStatus
    const status = await getInsightsStatus(id);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    );
  }
}

// POST /api/episodes/[id]/insights - Generate insights
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await context.params;

    // Fetch episode with podcast info - language comes from RSS feed
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select(`
        audio_url,
        transcript_url,
        podcasts!inner (id, language, rss_feed_url)
      `)
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Self-healing language detection:
    // If language is missing or 'en' (might be old default), fetch from RSS to verify
    const podcastData = episode.podcasts as unknown as { id: string; language: string | null; rss_feed_url: string } | null;
    let language = podcastData?.language;
    
    if (!language || language === 'en') {
      // Language might be wrong/missing - fetch from RSS to verify
      console.log('[INSIGHTS] Language missing or default, fetching from RSS...', { 
        currentLanguage: language,
        rssUrl: podcastData?.rss_feed_url?.substring(0, 50) 
      });
      
      try {
        if (podcastData?.rss_feed_url && !podcastData.rss_feed_url.startsWith('apple:')) {
          const { podcast: rssPodcast } = await fetchPodcastFeed(podcastData.rss_feed_url);
          const rssLanguage = rssPodcast.language;
          
          if (rssLanguage && rssLanguage !== language) {
            // Found different language in RSS - update DB and use it
            console.log('[INSIGHTS] Found language in RSS, updating DB...', { 
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
        console.log('[INSIGHTS] Failed to fetch RSS for language, using fallback', { 
          error: rssError instanceof Error ? rssError.message : String(rssError) 
        });
        language = language || 'en';
      }
    }
    
    console.log('[INSIGHTS] Using language:', language);

    // Request insights generation - pass transcript URL for FREE transcription (Priority A)
    const result = await requestInsights(
      episodeId, 
      episode.audio_url, 
      language,
      episode.transcript_url || undefined  // Priority A: FREE transcript from RSS
    );

    return NextResponse.json({
      episode_id: episodeId,
      ...result
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
