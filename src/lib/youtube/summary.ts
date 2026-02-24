import { createAdminClient } from '@/lib/supabase/admin';
import { fetchYouTubeTranscript } from './transcripts';
import { generateSummaryForLevel } from '@/lib/summary-service';
import type { SummaryLevel, SummaryStatus } from '@/types/database';

/**
 * Request a summary for a YouTube video.
 *
 * 1. Checks for existing summary at the given level
 * 2. Ensures a transcript exists (fetches YouTube captions if needed)
 * 3. Creates/updates summary row, then calls generateSummaryForLevel()
 */
export async function requestYouTubeSummary(
  episodeId: string,
  videoId: string,
  level: SummaryLevel
): Promise<{ status: SummaryStatus; error?: string }> {
  const supabase = createAdminClient();
  const language = 'en';

  // Check for existing summary
  const { data: existingSummary } = await supabase
    .from('summaries')
    .select('status')
    .eq('episode_id', episodeId)
    .eq('level', level)
    .eq('language', language)
    .single();

  if (existingSummary?.status === 'ready') {
    return { status: 'ready' };
  }

  if (existingSummary?.status === 'summarizing' || existingSummary?.status === 'transcribing') {
    return { status: existingSummary.status as SummaryStatus };
  }

  // Ensure transcript exists
  const { data: existingTranscript } = await supabase
    .from('transcripts')
    .select('full_text, status')
    .eq('episode_id', episodeId)
    .eq('language', language)
    .single();

  let transcriptText: string;

  if (existingTranscript?.status === 'ready' && existingTranscript.full_text) {
    transcriptText = existingTranscript.full_text;
  } else {
    // Fetch YouTube captions
    const ytTranscript = await fetchYouTubeTranscript(videoId);

    if (!ytTranscript) {
      // Update summary status to failed
      await supabase
        .from('summaries')
        .upsert(
          {
            episode_id: episodeId,
            level,
            language,
            status: 'failed',
            error_message: 'No captions available for this video',
          },
          { onConflict: 'episode_id,level,language' }
        );
      return { status: 'failed', error: 'No captions available for this video' };
    }

    // Store transcript
    await supabase
      .from('transcripts')
      .upsert(
        {
          episode_id: episodeId,
          language,
          full_text: ytTranscript.text,
          status: 'ready',
          provider: 'youtube-captions',
        },
        { onConflict: 'episode_id,language' }
      );

    transcriptText = ytTranscript.text;
  }

  // Ensure summary row exists with 'queued' status
  await supabase
    .from('summaries')
    .upsert(
      {
        episode_id: episodeId,
        level,
        language,
        status: 'queued',
      },
      { onConflict: 'episode_id,level,language' }
    );

  // Generate summary
  const result = await generateSummaryForLevel(
    episodeId,
    level,
    transcriptText,
    language
  );

  return { status: result.status, error: result.error };
}
