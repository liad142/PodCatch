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

    // Fetch episode details
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .select("*")
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

    // Fetch transcript if available
    const { data: transcript } = await supabase
      .from("transcripts")
      .select("*")
      .eq("episode_id", id)
      .single();

    // Fetch summary if transcript exists
    let summary = null;
    if (transcript) {
      const { data: summaryData } = await supabase
        .from("summaries")
        .select("*")
        .eq("transcript_id", transcript.id)
        .single();
      summary = summaryData;
    }

    return NextResponse.json({
      episode,
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
