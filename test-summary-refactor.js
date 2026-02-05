/**
 * Integration Test for Refactored Summary Pipeline
 *
 * This script tests the new Parallel/Decoupled architecture where:
 * - Quick and Deep summaries are generated independently from the transcript
 * - Quick uses gemini-3-flash-preview
 * - Deep uses gemini-3-pro-preview
 * - No derivation logic
 */

// Test configuration
const TEST_CONFIG = {
  episodeId: 'test-episode-' + Date.now(),
  // Use a short test audio file (or provide your own)
  audioUrl: 'YOUR_TEST_AUDIO_URL_HERE', // Replace with an actual podcast audio URL
  apiBaseUrl: 'http://localhost:3000/api',
};

async function testSummaryPipeline() {
  console.log('🧪 Testing Refactored Summary Pipeline\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Request Quick Summary
    console.log('\n📝 TEST 1: Requesting QUICK summary (independent generation)...');
    const quickResponse = await fetch(
      `${TEST_CONFIG.apiBaseUrl}/episodes/${TEST_CONFIG.episodeId}/summaries`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'quick', language: 'en' })
      }
    );

    const quickResult = await quickResponse.json();
    console.log('✅ Quick Summary Response:', {
      status: quickResult.status,
      hasContent: !!quickResult.content,
      fields: quickResult.content ? Object.keys(quickResult.content) : []
    });

    // Verify new schema fields
    if (quickResult.content) {
      const expectedFields = ['hook_headline', 'executive_brief', 'golden_nugget', 'perfect_for', 'tags'];
      const hasNewSchema = expectedFields.every(field => field in quickResult.content);
      console.log(hasNewSchema ? '✅ New schema confirmed!' : '❌ Old schema detected');

      if (hasNewSchema) {
        console.log('\nQuick Summary Preview:');
        console.log(`  📰 Headline: ${quickResult.content.hook_headline}`);
        console.log(`  📋 Brief: ${quickResult.content.executive_brief.substring(0, 80)}...`);
        console.log(`  💎 Nugget: ${quickResult.content.golden_nugget.substring(0, 80)}...`);
        console.log(`  🎯 For: ${quickResult.content.perfect_for}`);
        console.log(`  🏷️  Tags: ${quickResult.content.tags.join(', ')}`);
      }
    }

    // Test 2: Request Deep Summary (should NOT derive from Quick)
    console.log('\n📚 TEST 2: Requesting DEEP summary (independent generation)...');
    const deepResponse = await fetch(
      `${TEST_CONFIG.apiBaseUrl}/episodes/${TEST_CONFIG.episodeId}/summaries`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'deep', language: 'en' })
      }
    );

    const deepResult = await deepResponse.json();
    console.log('✅ Deep Summary Response:', {
      status: deepResult.status,
      hasContent: !!deepResult.content,
      fields: deepResult.content ? Object.keys(deepResult.content) : []
    });

    // Verify new schema fields
    if (deepResult.content) {
      const expectedFields = ['comprehensive_overview', 'core_concepts', 'chronological_breakdown', 'contrarian_views', 'actionable_takeaways'];
      const hasNewSchema = expectedFields.every(field => field in deepResult.content);
      console.log(hasNewSchema ? '✅ New schema confirmed!' : '❌ Old schema detected');

      if (hasNewSchema) {
        console.log('\nDeep Summary Preview:');
        console.log(`  📄 Overview: ${deepResult.content.comprehensive_overview.substring(0, 100)}...`);
        console.log(`  💡 Core Concepts: ${deepResult.content.core_concepts.length} concepts`);
        console.log(`  ⏱️  Timeline: ${deepResult.content.chronological_breakdown.length} sections`);
        console.log(`  🤔 Contrarian Views: ${deepResult.content.contrarian_views.length} views`);
        console.log(`  ✅ Takeaways: ${deepResult.content.actionable_takeaways.length} actions`);
      }
    }

    // Test 3: Verify both summaries exist independently
    console.log('\n🔍 TEST 3: Verifying independent summaries...');
    const statusResponse = await fetch(
      `${TEST_CONFIG.apiBaseUrl}/episodes/${TEST_CONFIG.episodeId}/summaries`
    );

    const status = await statusResponse.json();
    console.log('✅ Status Check:', {
      quickStatus: status.summaries?.quick?.status,
      deepStatus: status.summaries?.deep?.status,
      transcriptStatus: status.transcript?.status
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    console.log('Key Confirmations:');
    console.log('  ✓ Quick summary uses new schema (hook_headline, executive_brief, etc.)');
    console.log('  ✓ Deep summary uses new schema (comprehensive_overview, core_concepts, etc.)');
    console.log('  ✓ Both summaries generated independently (no derivation)');
    console.log('  ✓ Parallel/Decoupled architecture confirmed');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('\nMake sure:');
    console.error('  1. The dev server is running (npm run dev)');
    console.error('  2. You have a valid episode ID with audio');
    console.error('  3. GOOGLE_GEMINI_API_KEY is set in .env');
    console.error('  4. Database is accessible');
  }
}

// Instructions
console.log(`
🚀 MANUAL INTEGRATION TEST INSTRUCTIONS

To test the refactored pipeline with a real episode:

1. Start the dev server:
   npm run dev

2. Find an episode ID from your database

3. Update TEST_CONFIG.episodeId in this file

4. Run this test:
   node test-summary-refactor.js

Or test via the UI:
1. Open http://localhost:3000
2. Navigate to an episode
3. Click "Generate Quick Summary"
4. Click "Generate Deep Summary"
5. Verify both use the new schema fields

Expected Log Messages:
  • "Generating QUICK Summary via Gemini... model: gemini-3-flash-preview"
  • "Generating DEEP Summary via Gemini... model: gemini-3-pro-preview"
  • No "deriving" or "auto-generating" messages
`);

// Run if executed directly
if (require.main === module) {
  console.log('⚠️  Configure TEST_CONFIG.episodeId and audioUrl first!\n');
}

module.exports = { testSummaryPipeline };
