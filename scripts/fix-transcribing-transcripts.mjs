/**
 * Script to reset all transcripts stuck in "transcribing" status
 * Usage: node scripts/fix-transcribing-transcripts.mjs
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SECRET_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTranscribingTranscripts() {
  console.log('🔍 Searching for transcripts with "transcribing" status...\n');

  try {
    // Find all transcripts with transcribing status
    const { data: transcribingTranscripts, error: queryError } = await supabase
      .from('transcripts')
      .select('id, episode_id, status, language, created_at')
      .eq('status', 'transcribing');

    if (queryError) {
      console.error('❌ Error querying transcripts:', queryError);
      return;
    }

    if (!transcribingTranscripts || transcribingTranscripts.length === 0) {
      console.log('✅ No transcripts found with "transcribing" status');
      return;
    }

    console.log(`📊 Found ${transcribingTranscripts.length} transcripts stuck in "transcribing" status:\n`);

    transcribingTranscripts.forEach((transcript, i) => {
      console.log(`${i + 1}. Transcript ID: ${transcript.id}`);
      console.log(`   Episode ID: ${transcript.episode_id}`);
      console.log(`   Language: ${transcript.language || 'unknown'}`);
      console.log(`   Created: ${new Date(transcript.created_at).toLocaleString()}`);
      console.log('');
    });

    // Update all to failed status
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        status: 'failed'
      })
      .eq('status', 'transcribing');

    if (updateError) {
      console.error('❌ Error updating transcripts:', updateError);
      return;
    }

    console.log(`✅ Successfully reset ${transcribingTranscripts.length} transcripts to "failed" status`);
    console.log('💡 Users can now retry transcription for these episodes\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
fixTranscribingTranscripts()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
