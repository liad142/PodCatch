import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchPodcastFeed } from "@/lib/rss";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rss_url } = body;

    if (!rss_url || typeof rss_url !== "string") {
      return NextResponse.json(
        { error: "rss_url is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if podcast already exists
    const { data: existingPodcast } = await supabase
      .from("podcasts")
      .select("*")
      .eq("rss_feed_url", rss_url)
      .single();

    if (existingPodcast) {
      // Return existing podcast with episodes
      const { data: episodes } = await supabase
        .from("episodes")
        .select("*")
        .eq("podcast_id", existingPodcast.id)
        .order("published_at", { ascending: false });

      return NextResponse.json({
        podcast: existingPodcast,
        episodes: episodes || [],
        message: "Podcast already exists",
      });
    }

    // Fetch and parse the RSS feed
    const { podcast: parsedPodcast, episodes: parsedEpisodes } =
      await fetchPodcastFeed(rss_url);

    // Insert podcast into Supabase
    const { data: podcast, error: podcastError } = await supabase
      .from("podcasts")
      .insert({
        title: parsedPodcast.title,
        author: parsedPodcast.author || null,
        description: parsedPodcast.description || null,
        rss_feed_url: rss_url,
        image_url: parsedPodcast.image_url || null,
        language: "en", // Default to English, could be extracted from feed
      })
      .select()
      .single();

    if (podcastError) {
      console.error("Error inserting podcast:", podcastError);
      return NextResponse.json(
        { error: "Failed to save podcast" },
        { status: 500 }
      );
    }

    // Insert episodes into Supabase
    const episodesToInsert = parsedEpisodes.map((episode) => ({
      podcast_id: podcast.id,
      title: episode.title,
      description: episode.description || null,
      audio_url: episode.audio_url,
      duration_seconds: episode.duration_seconds || null,
      published_at: episode.published_at || null,
    }));

    const { data: episodes, error: episodesError } = await supabase
      .from("episodes")
      .insert(episodesToInsert)
      .select();

    if (episodesError) {
      console.error("Error inserting episodes:", episodesError);
      // Podcast was created but episodes failed - still return podcast
      return NextResponse.json({
        podcast,
        episodes: [],
        warning: "Podcast saved but some episodes failed to save",
      });
    }

    return NextResponse.json(
      {
        podcast,
        episodes: episodes || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding podcast:", error);

    if (error instanceof Error && error.message.includes("fetch")) {
      return NextResponse.json(
        { error: "Failed to fetch RSS feed. Please check the URL." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
