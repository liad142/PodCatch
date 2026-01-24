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
        { error: "Podcast ID is required" },
        { status: 400 }
      );
    }

    // Fetch podcast details
    const { data: podcast, error: podcastError } = await supabase
      .from("podcasts")
      .select("*")
      .eq("id", id)
      .single();

    if (podcastError) {
      if (podcastError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Podcast not found" },
          { status: 404 }
        );
      }
      console.error("Error fetching podcast:", podcastError);
      return NextResponse.json(
        { error: "Failed to fetch podcast" },
        { status: 500 }
      );
    }

    // Fetch all episodes for this podcast, ordered by published_at DESC
    const { data: episodes, error: episodesError } = await supabase
      .from("episodes")
      .select("*")
      .eq("podcast_id", id)
      .order("published_at", { ascending: false });

    if (episodesError) {
      console.error("Error fetching episodes:", episodesError);
      return NextResponse.json(
        { error: "Failed to fetch episodes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      podcast,
      episodes: episodes || [],
    });
  } catch (error) {
    console.error("Error in podcast GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
