/**
 * Cleanup Script: Remove Duplicate and Failed Summaries
 *
 * This script:
 * 1. Finds episodes with multiple summaries of the same level
 * 2. Keeps only the best one (ready > summarizing > transcribing > others)
 * 3. Deletes old failed/stuck summaries
 *
 * Run with: npx tsx scripts/cleanup-summaries.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Status priority: higher is better
const statusPriority: Record<string, number> = {
  ready: 6,
  summarizing: 5,
  transcribing: 4,
  queued: 3,
  failed: 2,
  not_ready: 1,
};

interface Summary {
  id: string;
  episode_id: string;
  level: 'quick' | 'deep';
  status: string;
  created_at: string;
  updated_at: string;
}

async function cleanupSummaries() {
  console.log('🔍 Fetching all summaries...\n');

  const { data: allSummaries, error } = await supabase
    .from('summaries')
    .select('id, episode_id, level, status, created_at, updated_at')
    .order('episode_id')
    .order('level')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching summaries:', error);
    return;
  }

  console.log(`Found ${allSummaries.length} total summaries\n`);

  // Group summaries by episode_id + level
  const grouped = new Map<string, Summary[]>();

  for (const summary of allSummaries) {
    const key = `${summary.episode_id}:${summary.level}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(summary);
  }

  // Find duplicates and determine what to keep/delete
  const toDelete: string[] = [];
  let duplicateCount = 0;

  for (const [key, summaries] of grouped.entries()) {
    if (summaries.length > 1) {
      duplicateCount++;
      const [episodeId, level] = key.split(':');

      console.log(`📦 Episode ${episodeId.substring(0, 8)}... (${level}):`);
      console.log(`   Found ${summaries.length} summaries:`);

      // Sort by priority (highest first), then by updated_at (newest first)
      summaries.sort((a, b) => {
        const priorityDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      // Keep the first one (best status + newest), delete the rest
      const toKeep = summaries[0];
      const toDeleteForEpisode = summaries.slice(1);

      console.log(`   ✅ KEEP: ${toKeep.status} (updated: ${toKeep.updated_at})`);

      for (const summary of toDeleteForEpisode) {
        console.log(`   ❌ DELETE: ${summary.status} (updated: ${summary.updated_at})`);
        toDelete.push(summary.id);
      }

      console.log('');
    }
  }

  // Also clean up old failed/stuck summaries (older than 24 hours)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const stuckStatuses = ['transcribing', 'summarizing', 'queued', 'failed'];
  const stuckSummaries = allSummaries.filter(s => {
    return stuckStatuses.includes(s.status) &&
           new Date(s.updated_at) < oneDayAgo &&
           !toDelete.includes(s.id); // Don't double-count
  });

  if (stuckSummaries.length > 0) {
    console.log(`🕐 Found ${stuckSummaries.length} stuck/failed summaries (>24h old):\n`);

    for (const summary of stuckSummaries) {
      console.log(`   ❌ DELETE: Episode ${summary.episode_id.substring(0, 8)}... (${summary.level}/${summary.status})`);
      toDelete.push(summary.id);
    }
    console.log('');
  }

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`   Total summaries: ${allSummaries.length}`);
  console.log(`   Episodes with duplicates: ${duplicateCount}`);
  console.log(`   Stuck/failed summaries: ${stuckSummaries.length}`);
  console.log(`   Total to delete: ${toDelete.length}`);
  console.log('═══════════════════════════════════════════════════\n');

  if (toDelete.length === 0) {
    console.log('✅ No cleanup needed! Database is clean.\n');
    return;
  }

  // Delete in batches
  console.log('🗑️  Deleting old summaries...\n');

  const batchSize = 50;
  let deleted = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);

    const { error: deleteError } = await supabase
      .from('summaries')
      .delete()
      .in('id', batch);

    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
    } else {
      deleted += batch.length;
      console.log(`   Deleted ${deleted}/${toDelete.length}...`);
    }
  }

  console.log('');
  console.log('✅ Cleanup complete!');
  console.log(`   Deleted ${deleted} duplicate/failed summaries\n`);
}

// Run cleanup
cleanupSummaries()
  .then(() => {
    console.log('Done! 🎉');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
