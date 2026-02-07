/**
 * Script to reset all episodes stuck in "transcribing" status
 * Usage: npx tsx scripts/fix-transcribing-episodes.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTranscribingEpisodes() {
  console.log('🔍 Searching for episodes with "transcribing" status...\n');

  try {
    // Find all summaries with transcribing status
    const { data: transcribingSummaries, error: queryError } = await supabase
      .from('summaries')
      .select('id, episode_id, level, status, created_at')
      .eq('status', 'transcribing');

    if (queryError) {
      console.error('❌ Error querying summaries:', queryError);
      return;
    }

    if (!transcribingSummaries || transcribingSummaries.length === 0) {
      console.log('✅ No summaries found with "transcribing" status');
      return;
    }

    console.log(`📊 Found ${transcribingSummaries.length} summaries stuck in "transcribing" status:\n`);

    transcribingSummaries.forEach((summary, i) => {
      console.log(`${i + 1}. Summary ID: ${summary.id}`);
      console.log(`   Episode ID: ${summary.episode_id}`);
      console.log(`   Level: ${summary.level}`);
      console.log(`   Created: ${new Date(summary.created_at).toLocaleString()}`);
      console.log('');
    });

    // Update all to failed status with error message
    const { error: updateError } = await supabase
      .from('summaries')
      .update({
        status: 'failed',
        error_message: 'Transcription timed out or stuck - reset by admin script'
      })
      .eq('status', 'transcribing');

    if (updateError) {
      console.error('❌ Error updating summaries:', updateError);
      return;
    }

    console.log(`✅ Successfully reset ${transcribingSummaries.length} summaries to "failed" status`);
    console.log('💡 Users can now retry summarization for these episodes\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
fixTranscribingEpisodes()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
