import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestInsights, getInsightsStatus } from "@/lib/insights-service";
import { resolvePodcastLanguage } from "@/lib/language-utils";

// GET /api/episodes/[id]/insights - Get insights status and content
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Language is auto-detected from existing transcripts in getInsightsStatus
    const status = await getInsightsStatus(id);

    return NextResponse.json(status, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
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
        title,
        podcasts!inner (id, title, language, rss_feed_url)
      `)
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Self-healing language detection via shared utility
    const podcastData = episode.podcasts as unknown as { id: string; title: string; language: string | null; rss_feed_url: string } | null;
    const language = await resolvePodcastLanguage(podcastData, supabase);

    // Build metadata for Apple Podcasts transcript lookup
    const metadata = podcastData?.title && episode.title
      ? { podcastTitle: podcastData.title, episodeTitle: episode.title }
      : undefined;

    // Request insights generation - pass transcript URL for FREE transcription (Priority A) and metadata for Apple (Priority A+)
    const result = await requestInsights(
      episodeId,
      episode.audio_url,
      language || undefined,
      episode.transcript_url || undefined,
      metadata
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
