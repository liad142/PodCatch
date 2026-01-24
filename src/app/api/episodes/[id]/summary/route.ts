import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { transcribeFromUrl } from "@/lib/groq";
import { generateSummary } from "@/lib/claude";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Episode ID is required" },
        { status: 400 }
      );
    }

    // Step 1: Fetch episode details
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

    // Step 2: Check if summary already exists (cached)
    const { data: existingTranscript } = await supabase
      .from("transcripts")
      .select("*")
      .eq("episode_id", id)
      .single();

    if (existingTranscript) {
      const { data: existingSummary } = await supabase
        .from("summaries")
        .select("*")
        .eq("transcript_id", existingTranscript.id)
        .single();

      if (existingSummary) {
        // Return cached summary
        return NextResponse.json({
          summary: existingSummary.summary_text,
          key_points: existingSummary.key_points || [],
          resources: existingSummary.resources || {},
          cached: true,
        });
      }
    }

    // Step 3: Get or create transcript
    let transcript = existingTranscript;

    if (!transcript) {
      // Transcribe audio using Groq
      console.log(`Transcribing episode: ${episode.title}`);

      const transcriptText = await transcribeFromUrl(episode.audio_url);

      // Save transcript to database
      const { data: newTranscript, error: transcriptError } = await supabase
        .from("transcripts")
        .insert({
          episode_id: id,
          full_text: transcriptText,
          language: "en",
          provider: "groq",
        })
        .select()
        .single();

      if (transcriptError) {
        console.error("Error saving transcript:", transcriptError);
        return NextResponse.json(
          { error: "Failed to save transcript" },
          { status: 500 }
        );
      }

      transcript = newTranscript;
    }

    // Step 4: Generate summary using Claude
    console.log(`Generating summary for episode: ${episode.title}`);

    const summaryResult = await generateSummary(transcript.full_text);

    // Step 5: Save summary to database
    const { data: savedSummary, error: summaryError } = await supabase
      .from("summaries")
      .insert({
        transcript_id: transcript.id,
        summary_text: summaryResult.summary,
        key_points: summaryResult.key_points,
        resources: summaryResult.resources,
      })
      .select()
      .single();

    if (summaryError) {
      console.error("Error saving summary:", summaryError);
      // Still return the generated summary even if save fails
      return NextResponse.json({
        summary: summaryResult.summary,
        key_points: summaryResult.key_points,
        resources: summaryResult.resources,
        cached: false,
        warning: "Summary generated but failed to cache",
      });
    }

    // Step 6: Return the summary
    return NextResponse.json({
      summary: savedSummary.summary_text,
      key_points: savedSummary.key_points || [],
      resources: savedSummary.resources || {},
      cached: false,
    });
  } catch (error) {
    console.error("Error generating summary:", error);

    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch audio")) {
        return NextResponse.json(
          { error: "Failed to fetch audio file for transcription" },
          { status: 400 }
        );
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
