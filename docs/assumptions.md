# Design Assumptions

This document captures assumptions and design decisions made during the implementation of all PodCatch features.

---

# Feature #4: Multi-Level Summaries

## Architecture Decisions

### 1. Synchronous Processing
**Decision**: Summary generation is synchronous within the API request.

**Rationale**: Simpler implementation without requiring a separate job queue system. For MVP, this is acceptable since:
- Claude API response times are typically < 10 seconds
- Groq transcription is fast for most episodes
- Users can see progress via polling

**Future**: Could migrate to async job queue (e.g., Supabase Edge Functions, Trigger.dev) for better scalability.

### 2. Global Summaries (Not Per-User)
**Decision**: One shared summary per episode for all users.

**Rationale**:
- Reduces API costs (Claude, Groq)
- Faster subsequent requests
- Episode content is objective, not user-specific

**Trade-off**: No personalization based on user interests.

### 3. Quick Summary as Default
**Decision**: Clicking "Summarize" in episode list generates Quick summary by default.

**Rationale**:
- Faster to generate
- Covers most use cases (quick decision: "Should I listen?")
- Deep summary available as opt-in for users who want more

### 4. Transcript Reuse
**Decision**: Single transcript shared by both Quick and Deep summaries.

**Rationale**:
- Transcription is the most expensive operation (time + cost)
- Same transcript serves both summary levels
- Transcript can be used for future "Chat with Episode" feature

### 5. English-Only Launch
**Decision**: Default language is 'en', no UI for language selection.

**Rationale**:
- Simplifies MVP
- Schema supports multiple languages for future expansion
- Can add language detection later

## Data Model Decisions

### 6. Episode ID as TEXT (Not UUID)
**Decision**: `episode_id` is TEXT, not a foreign key.

**Rationale**:
- Episodes may come from external sources (Apple Podcasts, RSS)
- IDs might be strings like "abc123" or URLs
- Avoids tight coupling with episode table structure

### 7. JSONB for Summary Content
**Decision**: Store summary as JSONB instead of separate columns.

**Rationale**:
- Flexible schema evolution
- Can add new fields without migrations
- Easy to query specific fields if needed

### 8. Status in Summary Table (Not Separate Jobs Table)
**Decision**: Status tracking is directly in the summaries table.

**Rationale**:
- Simpler queries (one table instead of joins)
- Natural fit since status is per-summary
- No need for complex job management

## UI/UX Decisions

### 9. Polling for Progress (Not WebSockets)
**Decision**: Frontend polls status every 2.5 seconds.

**Rationale**:
- Works with serverless deployment
- No WebSocket infrastructure needed
- Acceptable UX for operations that take 20-60 seconds

**Trade-off**: Slightly higher server load, but negligible for expected traffic.

### 10. Panel vs Modal
**Decision**: Side panel on desktop, full-screen on mobile.

**Rationale**:
- Desktop: Side panel keeps context visible
- Mobile: Full screen maximizes content readability

### 11. Button Labeling
**Decision**: Use "View Summary" when ready, "Summarize" when not.

**Rationale**:
- Honest about what happens on click
- "Generate" implies work even when cached
- Clear distinction between viewing and creating

## Error Handling Decisions

### 12. Retry on Failure
**Decision**: Failed summaries can be retried by clicking again.

**Rationale**:
- Simple recovery mechanism
- Status is updated to show failure
- No automatic retry to avoid infinite loops

### 13. Partial Success
**Decision**: If Quick succeeds but Deep fails, Quick is still usable.

**Rationale**:
- Independent operations
- Users get value from Quick even if Deep fails
- Can retry Deep separately

## Security & Privacy

### 14. No User Ownership
**Decision**: Summaries are not tied to specific users.

**Rationale**:
- Global cache benefits all users
- No need for RLS complexity
- Episode content is public anyway

**Note**: RLS is enabled with permissive policies for future flexibility.

## Performance Considerations

### 15. Transcript Size Limit
**Decision**: Transcript is truncated to 100,000 characters for Claude.

**Rationale**:
- Fits within Claude context window
- Covers most podcasts (100k chars is approximately 2-3 hours of speech)
- Prevents token limit errors

### 16. No Caching at API Level
**Decision**: Rely on database for caching, no HTTP cache headers.

**Rationale**:
- Status changes require fresh data
- Database is source of truth
- Could add cache headers for ready summaries later

## API Design Decisions

### 17. RESTful Endpoints
**Decision**: Use REST-style endpoints rather than GraphQL or RPC.

**Rationale**:
- Familiar pattern for most developers
- Easy to test with curl/Postman
- Matches existing API patterns in the codebase

### 18. Idempotent POST
**Decision**: POST /summaries is idempotent - returns existing if ready.

**Rationale**:
- Safe to retry on network errors
- Simplifies frontend logic
- Prevents accidental duplicate processing

### 19. Combined Status Endpoint
**Decision**: GET /summaries returns both Quick and Deep statuses.

**Rationale**:
- Single request for full picture
- Reduces polling requests
- Easier state management in frontend

## Technology Choices

### 20. Groq for Transcription
**Decision**: Use Groq's Whisper API for transcription.

**Rationale**:
- Very fast transcription (near real-time)
- Cost-effective
- Good accuracy for English content

### 21. Claude for Summarization
**Decision**: Use Anthropic's Claude API for generating summaries.

**Rationale**:
- High quality structured output
- Reliable JSON generation
- Good at following specific format requirements

### 22. Supabase for Storage
**Decision**: Use Supabase PostgreSQL for transcript and summary storage.

**Rationale**:
- Already used in the project
- Good JSONB support
- Built-in RLS for future auth needs

## Future Considerations (Not in MVP)

- Chat with Episode feature (mentioned as future, not implemented)
- Multi-language support (schema ready, UI not)
- User-specific preferences
- Summary regeneration/refresh
- Export functionality from summary panel
- Saving summaries to user's library
- Batch processing multiple episodes
- Summary quality feedback/rating
- Custom summary templates
- Podcast-level summaries (aggregating episodes)

---

# Feature #2: RSSHub YouTube Integration