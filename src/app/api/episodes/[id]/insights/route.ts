import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requestInsights, getInsightsStatus } from "@/lib/insights-service";

// GET /api/episodes/[id]/insights - Get insights status and content
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const language = new URL(request.url).searchParams.get('language') || 'en';

    const status = await getInsightsStatus(id, language);

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
    const body = await request.json().catch(() => ({}));
    const language = body.language || 'en';

    // Fetch episode to get audio URL
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("audio_url")
      .eq("id", episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: "Episode not found" },
        { status: 404 }
      );
    }

    // Request insights generation
    const result = await requestInsights(episodeId, episode.audio_url, language);

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
