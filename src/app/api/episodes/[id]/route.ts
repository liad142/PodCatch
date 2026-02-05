import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Episode ID is required" },
        { status: 400 }
      );
    }

    // Fetch episode with transcript and summaries in a single query
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select(`
        id,
        podcast_id,
        title,
        description,
        audio_url,
        transcript_url,
        transcript_language,
        duration_seconds,
        published_at,
        created_at,
        transcripts (
          id,
          episode_id,
          text,
          status,
          language,
          diarized_json,
          created_at,
          updated_at,
          summaries (
            id,
            transcript_id,
            level,
            status,
            content,
            created_at,
            updated_at
          )
        )
      `)
      .eq("id", id)
      .single();

    if (episodeError) {
      if (episodeError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Episode not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching episode:", episodeError);
      return NextResponse.json(
        { error: "Failed to fetch episode" },
        { status: 500 }
      );
    }

    // Extract transcript and summary from the nested response
    const transcripts = episode.transcripts as any[] | null;
    const transcript = transcripts && transcripts.length > 0 ? transcripts[0] : null;
    let summary = null;
    if (transcript) {
      const summaries = transcript.summaries as any[] | null;
      summary = summaries && summaries.length > 0 ? summaries[0] : null;
      // Remove nested summaries from transcript to keep response shape clean
      delete transcript.summaries;
    }

    // Remove nested transcripts from episode to keep response shape clean
    const { transcripts: _transcripts, ...episodeData } = episode as any;

    return NextResponse.json({
      episode: episodeData,
      transcript: transcript || null,
      summary: summary || null,
    });
  } catch (error) {
    console.error("Error in episode GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
