# Smart YouTube Channel Filtering in Onboarding

## Problem

Users with 100+ YouTube subscriptions across many categories (tech, music, comedy, etc.) are overwhelmed during onboarding. All channels are pre-selected and users must manually deselect irrelevant ones. A user who only wants tech/business content on PodCatch shouldn't have to sift through singers and comedians.

## Solution

Swap the onboarding step order so genre preferences are collected first, then use those preferences to intelligently pre-select only relevant YouTube channels.

## Updated Onboarding Flow

**Current:** Welcome → YouTube (all channels, all selected) → Genres → Done

**New:** Welcome → Genres → YouTube (AI-filtered, smart pre-selection) → Done

## YouTube Step UX

After the user picks genres (e.g., Technology, Business), the YouTube step shows:

- **Top section:** Matched channels — pre-selected, tagged by AI as matching at least one of the user's chosen genres
- **Divider:** "Other channels (not matched to your interests)"
- **Bottom section:** Unmatched channels — deselected but fully visible and toggleable

Select All / Deselect All and channel count ("X of Y selected") work as before.

## Channel Classification Strategy

### Primary: YouTube Topics API

1. Fetch all user subscriptions (existing `GET /api/youtube/subscriptions`)
2. Batch-fetch `channels.list?part=topicDetails&id={ids}` from YouTube API (up to 50 per request)
3. Map YouTube topic IDs to Apple Podcast genre IDs using a static mapping table

**YouTube Topic → Genre mapping:**

| YouTube Topic ID | Topic | Our Genre ID | Our Genre |
|---|---|---|---|
| `/m/07c1v` | Technology | `1318` | Technology |
| `/m/09s1f` | Business | `1321` | Business |
| `/m/04rlf` | Music | `1309` | Music |
| `/m/02jjt` | Entertainment | `1310` | TV & Film |
| `/m/019_rr` | Lifestyle | `1305` | Health & Fitness |
| `/m/01k8wb` | Knowledge | `1304` | Education |
| `/m/098wr` | Society | `1324` | Society & Culture |
| `/m/0kt51` | Health | `1305` | Health & Fitness |
| `/m/06ntj` | Sports | `1545` | Sports |
| `/m/05qt0` | Science | `1533` | Science |
| `/m/02mscn` | Christian music | `1314` | Religion & Spirituality |
| `/m/0410tth` | Humor | `1303` | Comedy |
| `/m/06bvp` | Religion | `1314` | Religion & Spirituality |
| `/m/03glg` | Hobby | `1324` | Society & Culture |
| `/m/017rf` | Acting | `1301` | Arts |
| `/m/0bzvm2` | Gaming | `1310` | TV & Film |
| `/m/01mw1` | Children | `1307` | Kids & Family |
| `/m/0glt670` | Politics | `1511` | Government |

### Fallback: Gemini Flash (for unclassified channels)

For channels with no `topicDetails` (rare for high-volume channels), send just those to Gemini 2.5 Flash for classification.

- **API:** Google AI SDK (`@google/generative-ai`)
- **Key:** `GOOGLE_GEMINI_API_KEY` env var
- **Prompt:** Provide the 18 genre names/IDs, user's selected genres, and unclassified channel titles + descriptions. Ask for JSON mapping channelId → matched genre IDs.
- **Response format:** `responseMimeType: "application/json"` for structured output

### Error Handling

If classification fails entirely (API errors, timeouts), fall back to current behavior: all channels pre-selected. Onboarding is never blocked by classification failure.

## New API Endpoint

### `POST /api/youtube/classify`

**Input:**
```json
{
  "channels": [
    { "channelId": "UC...", "title": "Fireship", "description": "High-intensity..." }
  ],
  "genres": ["1318", "1321"]
}
```

**Processing:**
1. Extract channel IDs from input
2. Batch-fetch `topicDetails` from YouTube API (ceil(n/50) requests)
3. Map YouTube topics to Apple Podcast genres using static mapping
4. Filter: channel matches if any of its mapped genres are in the user's selected genres
5. For unclassified channels (no topics), call Gemini Flash
6. Return classification map

**Output:**
```json
{
  "classifications": {
    "UC2WHjPDvbE6O328n17ZGcfg": ["1318"],
    "UCother123": [],
    "UCbiz456": ["1318", "1321"]
  }
}
```

## Frontend Changes

### `src/app/onboarding/page.tsx`

1. **Step order:** `welcome → genres → youtube → done`
2. **New state:** `classifications: Record<string, string[]>` — populated after classify call
3. **YouTube step fetch:** When entering YouTube step, fetch subscriptions then classify them
4. **Channel rendering:** Split into `matchedChannels` (pre-selected, top) and `otherChannels` (deselected, bottom) with a divider
5. **Finishing logic:** Genres step "Continue" advances to YouTube step (no longer saves profile). YouTube step "Continue" saves genres + imports channels + marks onboarding complete

### `src/components/onboarding/YouTubeChannelCard.tsx`

No changes needed.

### `src/components/onboarding/GenreCard.tsx`

No changes needed.

## Performance

- YouTube topics API: ~200-400ms (1-2 batch calls)
- Gemini Flash (if needed): ~500-1000ms (only for unclassified channels)
- Total YouTube step load: < 1-2 seconds
- No classification results are persisted — ephemeral, used only for UI pre-selection

## Dependencies

- `@google/generative-ai` npm package (for Gemini Flash fallback)
- `GOOGLE_GEMINI_API_KEY` environment variable
- YouTube API quota: additional `channels.list` calls (2 per onboarding for 100 channels)
