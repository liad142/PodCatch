# PodCatch - סיכום פרויקט מקיף

## 📋 תוכן עניינים
1. [סקירה כללית](#סקירה-כללית)
2. [תכונות עיקריות](#תכונות-עיקריות)
3. [ארכיטקטורה טכנית](#ארכיטקטורה-טכנית)
4. [מבנה תיקיות מפורט](#מבנה-תיקיות-מפורט)
5. [זרימת יצירת סיכום (Summary Flow)](#זרימת-יצירת-סיכום)
6. [מודל הנתונים](#מודל-הנתונים)
7. [API Endpoints](#api-endpoints)
8. [תלויות וטכנולוגיות](#תלויות-וטכנולוגיות)

---

## 🎯 סקירה כללית

**PodCatch** היא אפליקציית Next.js מודרנית לאיסוף והאזנה לפודקאסטים ותוכן YouTube, עם יכולות סיכום מבוססות AI.

### מה האפליקציה עושה?

1. **גילוי תוכן**: מאפשרת למשתמשים לגלות פודקאסטים חדשים דרך Apple Podcasts ו-YouTube
2. **ניהול מנויים**: מעקב אחר ערוצים ופודקאסטים מועדפים
3. **סיכומי AI**: יצירה אוטומטית של סיכומים חכמים לפרקים באמצעות Gemini + Deepgram
4. **נגן אודיו**: נגן מובנה בסגנון Spotify לשמיעת פרקים
5. **Insights Hub**: מרכז תובנות עם מפות מחשבה, מילות מפתח, ציטוטים חשובים ועוד

---

## ✨ תכונות עיקריות

### 1. גילוי פודקאסטים (Apple Podcasts)
- חיפוש פודקאסטים ב-iTunes Search API
- עיון לפי ז'אנרים (18 קטגוריות)
- Top Charts לפי מדינה (15 מדינות)
- שליפת פרקים דרך RSS feeds

### 2. אינטגרציית YouTube (RSSHub)
- מעקב אחר ערוצים לפי URL או @handle
- פיד מאוחד מכל הערוצים
- שמירת סרטונים לצפייה מאוחר יותר
- Caching חכם (30 דקות TTL)

### 3. סיכומי AI (Multi-Level)
- **Quick Summary**: סיכום מהיר ב-30 שניות
  - Hook Headline (כותרת מושכת)
  - Executive Brief (תקציר מנהלים)
  - Golden Nugget (התובנה המרכזית)
  - Perfect For (קהל יעד)
  - Tags (תגיות)
  
- **Deep Summary**: ניתוח מעמיק
  - Comprehensive Overview (סקירה מקיפה)
  - Core Concepts (מושגי ליבה)
  - Chronological Breakdown (פירוט כרונולוגי)
  - Contrarian Views (עמדות שונות)
  - Actionable Takeaways (לקחים מעשיים)

### 4. Insights Hub
- **Keywords**: מילות מפתח עם תדירות
- **Highlights**: ציטוטים ורגעים חשובים
- **Mind Map**: מפת מושגים ויזואלית
- **Show Notes**: סיכום לפי פרקים
- **Transcript**: תמליל מלא עם timestamps

### 5. נגן אודיו (Sticky Player)
- עיצוב Glassmorphic (שקוף עם blur)
- בקרות: Play/Pause, Skip ±15s
- מהירות השמעה (0.5x - 2x)
- שליטה בווליום
- Progress bar אינטראקטיבי

---

## 🏗️ ארכיטקטורה טכנית

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │ Components  │  │       Contexts          │  │
│  │  (App Dir)  │  │  (React)    │  │ (State Management)      │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                          ▼                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Routes (Next.js)                     │ │
│  │  /api/episodes  /api/apple  /api/youtube  /api/summaries   │ │
│  └──────────────────────────┬─────────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │   Deepgram      │  │  Google Gemini  │
│   (Database)    │  │ (Transcription) │  │  (AI Summary)   │
│                 │  │                 │  │                 │
│ • podcasts      │  │ • whisper-large │  │ • gemini-flash  │
│ • episodes      │  │ • diarization   │  │ • gemini-pro    │
│ • transcripts   │  │ • speaker ID    │  │                 │
│ • summaries     │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         │                    ┌─────────────────┐
         │                    │     RSSHub      │
         └────────────────────│   (Self-hosted) │
                              │                 │
                              │ • YouTube RSS   │
                              │ • Apple RSS     │
                              └─────────────────┘
```

---

## 📁 מבנה תיקיות מפורט

### `/src/app` - דפים ו-API Routes

```
app/
├── api/                      # API Endpoints
│   ├── apple/                # Apple Podcasts APIs
│   │   ├── genres/           # GET genres, GET /[id]/podcasts
│   │   ├── podcasts/         # GET /[id], GET /[id]/episodes
│   │   ├── search/           # GET - חיפוש פודקאסטים
│   │   └── top/              # GET - Top Charts לפי מדינה
│   │
│   ├── episodes/             # Episode APIs
│   │   ├── [id]/
│   │   │   ├── summaries/    # GET/POST - ניהול סיכומים
│   │   │   │   └── status/   # GET - סטטוס סיכום
│   │   │   ├── insights/     # POST - יצירת insights
│   │   │   └── route.ts      # GET - פרטי פרק
│   │   ├── import/           # POST - ייבוא פרק חדש
│   │   ├── lookup/           # GET - חיפוש לפי audio_url
│   │   └── batch-lookup/     # POST - חיפוש מרובה
│   │
│   ├── feed/                 # Unified Feed APIs
│   │   ├── [id]/bookmark/    # POST - toggle bookmark
│   │   └── route.ts          # GET - שליפת פיד
│   │
│   ├── youtube/              # YouTube APIs
│   │   ├── channels/         # GET - רשימת ערוצים
│   │   │   ├── follow/       # POST - מעקב אחר ערוץ
│   │   │   └── [id]/unfollow/# DELETE - ביטול מעקב
│   │   ├── followed/         # GET - סרטונים מערוצים נעקבים
│   │   ├── trending/         # GET - סרטונים פופולריים
│   │   ├── refresh/          # POST - רענון ערוצים
│   │   └── save/             # GET/POST - סרטונים שמורים
│   │
│   ├── summaries/            # Summary APIs
│   │   ├── check/            # POST - בדיקת זמינות סיכומים
│   │   └── route.ts          # GET - רשימת סיכומים
│   │
│   ├── podcasts/             # Podcast Management
│   │   ├── [id]/             # GET - פרטי פודקאסט
│   │   ├── add/              # POST - הוספת פודקאסט
│   │   └── lookup/           # GET - חיפוש פודקאסט
│   │
│   └── subscriptions/        # Subscription APIs
│       ├── [podcastId]/      # DELETE - ביטול מנוי
│       ├── check/            # GET - בדיקת מנוי
│       └── route.ts          # GET/POST - ניהול מנויים
│
├── browse/                   # Discovery Pages
│   ├── page.tsx              # דף ראשי - גילוי פודקאסטים
│   ├── genre/[id]/page.tsx   # פודקאסטים לפי ז'אנר
│   └── podcast/[id]/page.tsx # דף פודקאסט עם פרקים
│
├── discover/page.tsx         # דף Discovery מתקדם
├── episode/[id]/
│   ├── page.tsx              # דף פרק בודד
│   └── insights/page.tsx     # Insights Hub מלא
├── feed/page.tsx             # פיד מאוחד
├── my-podcasts/page.tsx      # הפודקאסטים שלי
├── saved/page.tsx            # פריטים שמורים
├── settings/page.tsx         # הגדרות
├── smart-notes/page.tsx      # הערות חכמות
├── summaries/page.tsx        # כל הסיכומים
│
├── layout.tsx                # Layout ראשי + Providers
├── page.tsx                  # דף הבית
└── globals.css               # Tailwind CSS גלובלי
```

### `/src/lib` - Business Logic & Services

| קובץ | תפקיד |
|------|-------|
| `summary-service.ts` | **הליבה של מערכת הסיכומים** - תיאום transcription, זיהוי דוברים, ויצירת סיכומים |
| `insights-service.ts` | יצירת insights (keywords, highlights, mindmap, shownotes) |
| `deepgram.ts` | קליינט Deepgram - transcription עם diarization וזיהוי דוברים |
| `claude.ts` | קליינט Gemini (legacy name) - יצירת סיכומים בסיסיים |
| `apple-podcasts.ts` | אינטגרציה עם iTunes API + RSSHub לפודקאסטים |
| `rsshub.ts` | קליינט RSSHub - שליפת RSS feeds מ-YouTube וכו' |
| `rsshub-db.ts` | פעולות DB עבור YouTube (channels, follows, feed items) |
| `rss.ts` | פרסור RSS feeds כללי |
| `supabase.ts` | Supabase client (browser + server) |
| `utils.ts` | פונקציות עזר (cn, formatDuration, etc.) |

### `/src/components` - React Components

#### קומפוננטות ראשיות

| קומפוננטה | תפקיד |
|-----------|-------|
| `SummaryPanel.tsx` | פאנל סיכום (Quick/Deep) עם UI ליצירה וצפייה |
| `InsightHub.tsx` | מרכז תובנות - tabs לכל סוגי ה-insights |
| `StickyAudioPlayer.tsx` | נגן אודיו קבוע בתחתית המסך |
| `FeedScreen.tsx` | מסך פיד מאוחד עם פילטרים |
| `FeedItemCard.tsx` | כרטיס תוכן גנרי (YouTube/Podcast) |
| `SummarizeButton.tsx` | כפתור יצירת סיכום עם אנימציות |
| `Sidebar.tsx` | תפריט צד עם ניווט |

#### קומפוננטות Insights

```
components/insights/
├── SummaryTabContent.tsx      # תצוגת Quick + Deep summaries
├── TranscriptTabContent.tsx   # תמליל מלא
├── TranscriptAccordion.tsx    # אקורדיון לתמליל ארוך
├── TranscriptMessage.tsx      # הודעת דובר בודד
├── KeywordsTabContent.tsx     # מילות מפתח עם תדירות
├── HighlightsTabContent.tsx   # ציטוטים חשובים
├── HighlightsCarousel.tsx     # קרוסלה של highlights
├── MindmapTabContent.tsx      # מפת מחשבה (Mermaid)
├── MindmapTeaser.tsx          # תצוגה מקדימה של mindmap
├── ShownotesTabContent.tsx    # Show notes מחולקים לפרקים
├── InsightHero.tsx            # Hero section לדף insights
├── QuickNav.tsx               # ניווט מהיר בין sections
├── ActionFooter.tsx           # Footer עם פעולות
└── EpisodeSmartFeed.tsx       # פיד פרקים דומים
```

#### קומפוננטות אנימציה

```
components/animations/
├── GemCompleteAnimation.tsx   # אנימציה בסיום יצירת סיכום
├── ParticleGemAnimation.tsx   # אנימציית חלקיקים
├── SoundWaveAnimation.tsx     # גלי קול (transcribing)
├── MiniLoadingAnimation.tsx   # טעינה קטנה
└── QueuePositionIndicator.tsx # מיקום בתור
```

#### קומפוננטות Discovery

```
components/discovery/
├── SemanticSearchBar.tsx      # חיפוש סמנטי
├── CuriosityFeed.tsx          # פיד תוכן מומלץ
├── DailyMixCarousel.tsx       # קרוסלת Daily Mix
├── DailyMixCard.tsx           # כרטיס Daily Mix
├── BrandShelf.tsx             # מדף ברנדים/ערוצים
├── BrandBubble.tsx            # בועת ברנד
├── InsightCard.tsx            # כרטיס insight לגילוי
└── DiscoverySummarizeButton.tsx # כפתור סיכום ב-Discovery
```

### `/src/contexts` - React Contexts

| Context | תפקיד |
|---------|-------|
| `AudioPlayerContext.tsx` | ניהול מצב נגן (play, pause, seek, volume) |
| `SummarizeQueueContext.tsx` | ניהול תור סיכומים + polling לסטטוס |
| `SubscriptionContext.tsx` | ניהול מנויים לפודקאסטים |
| `EpisodeLookupContext.tsx` | cache לחיפוש פרקים |
| `CountryContext.tsx` | מדינה נבחרת ל-Top Charts |
| `ThemeContext.tsx` | מצב תצוגה (dark/light) |

### `/src/types` - TypeScript Types

| קובץ | מה מכיל |
|------|---------|
| `database.ts` | טיפוסים למודל הנתונים (Episode, Summary, Transcript, Insights) |
| `apple-podcasts.ts` | טיפוסים ל-iTunes API וז'אנרים |
| `rsshub.ts` | טיפוסים ל-YouTube channels, feed items |
| `deepgram.ts` | טיפוסים לתשובות Deepgram (DiarizedTranscript, Utterance) |
| `queue.ts` | טיפוסים לתור הסיכומים |
| `transcript.ts` | טיפוסים נוספים לתמלילים |

### `/src/db/migrations` - Database Migrations

```
migrations/
├── 001_spotify_schema.sql          # סכמה בסיסית (legacy)
├── 002_spotify_cache_update.sql    # עדכוני cache
├── 003_rsshub_youtube.sql          # טבלאות YouTube
├── 004_multi_level_summaries.sql   # טבלאות summaries + transcripts
├── 005_insights_level.sql          # תמיכה ב-insights level
├── 006_podcast_subscriptions.sql   # טבלת מנויים
└── 007_language_aware_transcription.sql # שדות שפה
```

---

## 🔄 זרימת יצירת סיכום

### תהליך מלא - End to End Flow

```
                     משתמש לוחץ "Create Summary"
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    1. Frontend Request                              │
│                                                                     │
│   SummarizeButton.tsx  ──►  SummarizeQueueContext                  │
│         │                        │                                  │
│         │                        │ addToQueue(episodeId)           │
│         │                        ▼                                  │
│         │                   Queue State: 'queued'                  │
│         │                        │                                  │
│         └────────────────────────┼──────────────────────────────── │
│                                  │                                  │
│                                  ▼                                  │
│   POST /api/episodes/{id}/summaries                                │
│   Body: { level: 'deep' }                                          │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    2. API Route Handler                             │
│                    (route.ts)                                       │
│                                                                     │
│   • בדיקת episode קיים ב-DB                                        │
│   • שליפת podcast.language מה-DB (או self-heal מ-RSS)              │
│   • קריאה ל-requestSummary() מ-summary-service.ts                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    3. Summary Service                               │
│                    (summary-service.ts)                             │
│                                                                     │
│   requestSummary(episodeId, level, audioUrl, language)             │
│         │                                                          │
│         ├── בדיקה: האם יש כבר סיכום מוכן? ──► Return cached        │
│         │                                                          │
│         ├── יצירת record ב-summaries (status: 'queued')            │
│         │                                                          │
│         └── קריאה ל-ensureTranscript()                             │
│                      │                                              │
│                      ▼                                              │
│              [TRANSCRIPTION FLOW]                                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    4. Transcription Flow                            │
│                    ensureTranscript()                               │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Priority A: RSS Transcript (FREE!)                          │  │
│   │                                                              │  │
│   │ if (episode.transcript_url) {                               │  │
│   │   // שליפת תמליל מוכן מה-RSS                                │  │
│   │   fetchTranscriptFromUrl(transcript_url)                    │  │
│   │   // Supports: SRT, VTT, JSON, Plain Text                   │  │
│   │   // NO COST!                                               │  │
│   │ }                                                            │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                        │                                            │
│                        ▼ (אם נכשל או לא קיים)                       │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Priority B: Deepgram Transcription                          │  │
│   │                                                              │  │
│   │ 1. resolveAudioUrl() - מעקב אחרי redirects                  │  │
│   │ 2. Deepgram API Call:                                       │  │
│   │    - model: 'whisper-large'                                 │  │
│   │    - language: from RSS (no detection cost!)                │  │
│   │    - diarize: true (זיהוי דוברים)                          │  │
│   │    - utterances: true                                       │  │
│   │                                                              │  │
│   │ 3. parseDeepgramResponse() → DiarizedTranscript             │  │
│   │                                                              │  │
│   │ 4. identifySpeakers() with Gemini Flash                     │  │
│   │    - ניתוח תחילת התמליל לזיהוי שמות                         │  │
│   │    - "Hi, I'm John..." → Speaker 0 = "John"                 │  │
│   │                                                              │  │
│   │ 5. formatTranscriptWithSpeakerNames()                       │  │
│   │    - [00:15] [John] Hello and welcome...                    │  │
│   │                                                              │  │
│   │ 6. Save to DB (transcripts table)                           │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    5. Summary Generation                            │
│                    generateSummaryForLevel()                        │
│                                                                     │
│   Model Selection:                                                  │
│   ├── Quick Summary → gemini-3-flash-preview (fast, cheap)         │
│   └── Deep Summary  → gemini-3-pro-preview (thorough)              │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Quick Summary Prompt                                         │  │
│   │                                                              │  │
│   │ "You are a senior editor..."                                │  │
│   │ Returns JSON:                                                │  │
│   │ {                                                            │  │
│   │   hook_headline: "...",                                      │  │
│   │   executive_brief: "...",                                    │  │
│   │   golden_nugget: "...",                                      │  │
│   │   perfect_for: "...",                                        │  │
│   │   tags: [...]                                                │  │
│   │ }                                                            │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │ Deep Summary Prompt                                          │  │
│   │                                                              │  │
│   │ "You are an expert Ghostwriter..."                          │  │
│   │ Returns JSON:                                                │  │
│   │ {                                                            │  │
│   │   comprehensive_overview: "400-600 words...",                │  │
│   │   core_concepts: [...],                                      │  │
│   │   chronological_breakdown: [...],                            │  │
│   │   contrarian_views: [...],                                   │  │
│   │   actionable_takeaways: [...]                                │  │
│   │ }                                                            │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│   • Parse JSON response                                            │
│   • Save to summaries table (status: 'ready')                      │
│   • Return result                                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    6. Frontend Polling & Display                    │
│                                                                     │
│   SummarizeQueueContext polls GET /api/episodes/{id}/summaries     │
│         │                                                          │
│         │  Status transitions:                                     │
│         │  queued → transcribing → summarizing → ready             │
│         │                                                          │
│         ▼                                                          │
│   SummaryPanel.tsx displays result                                 │
│   InsightHub.tsx shows full analysis                               │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### תרשים סטטוסים

```
           ┌─────────┐
           │ not_ready │
           └────┬────┘
                │ POST /summaries
                ▼
           ┌─────────┐
           │  queued  │
           └────┬────┘
                │ Start processing
                ▼
        ┌──────────────┐
        │ transcribing │ ◄── Deepgram / RSS fetch
        └──────┬───────┘
               │ Transcript ready
               ▼
        ┌─────────────┐
        │ summarizing │ ◄── Gemini API
        └──────┬──────┘
               │
       ┌───────┴───────┐
       ▼               ▼
   ┌───────┐      ┌────────┐
   │ ready │      │ failed │
   └───────┘      └────────┘
```

---

## 💾 מודל הנתונים

### טבלאות עיקריות

```sql
-- פודקאסטים
podcasts (
  id UUID PRIMARY KEY,
  title TEXT,
  author TEXT,
  description TEXT,
  rss_feed_url TEXT,
  image_url TEXT,
  language TEXT,  -- 'he', 'en', etc.
  created_at TIMESTAMP,
  latest_episode_date TIMESTAMP
)

-- פרקים
episodes (
  id UUID PRIMARY KEY,
  podcast_id UUID REFERENCES podcasts,
  title TEXT,
  description TEXT,
  audio_url TEXT UNIQUE,  -- Used for deduplication!
  duration_seconds INTEGER,
  published_at TIMESTAMP,
  transcript_url TEXT,     -- FREE transcript from RSS!
  transcript_language TEXT
)

-- תמלילים (Global - shared across users)
transcripts (
  id UUID PRIMARY KEY,
  episode_id UUID REFERENCES episodes,
  language TEXT,
  status TEXT,  -- queued, transcribing, ready, failed
  full_text TEXT,
  diarized_json JSONB,  -- DiarizedTranscript with speakers
  provider TEXT,  -- 'deepgram', 'rss-transcript'
  UNIQUE(episode_id, language)
)

-- סיכומים (Global - shared across users)
summaries (
  id UUID PRIMARY KEY,
  episode_id UUID REFERENCES episodes,
  level TEXT,  -- 'quick', 'deep', 'insights'
  language TEXT,
  status TEXT,
  content_json JSONB,  -- QuickSummary / DeepSummary / Insights
  error_message TEXT,
  UNIQUE(episode_id, level, language)
)

-- ערוצי YouTube
youtube_channels (
  id TEXT PRIMARY KEY,  -- YouTube channel ID
  name TEXT,
  handle TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP
)

-- מעקב אחרי ערוצים
youtube_channel_follows (
  id UUID PRIMARY KEY,
  user_id UUID,
  channel_id TEXT REFERENCES youtube_channels,
  created_at TIMESTAMP,
  UNIQUE(user_id, channel_id)
)

-- פיד מאוחד
feed_items (
  id UUID PRIMARY KEY,
  source_type TEXT,  -- 'youtube', 'podcast'
  source_id TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP
)

-- Cache ל-RSSHub
rsshub_cache (
  cache_key TEXT PRIMARY KEY,
  response_data JSONB,
  expires_at TIMESTAMP
)

-- מנויים לפודקאסטים
podcast_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID,
  podcast_id UUID REFERENCES podcasts,
  created_at TIMESTAMP,
  last_viewed_at TIMESTAMP
)
```

### יחסים בין טבלאות

```
podcasts ────┬──── episodes ────┬──── transcripts
             │                  │
             │                  └──── summaries (quick, deep, insights)
             │
             └──── podcast_subscriptions


youtube_channels ────┬──── youtube_channel_follows
                     │
                     └──── feed_items
```

---

## 🌐 API Endpoints

### Apple Podcasts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/apple/genres` | רשימת ז'אנרים |
| GET | `/api/apple/genres/[id]/podcasts` | פודקאסטים לפי ז'אנר |
| GET | `/api/apple/top?country=us&limit=30` | Top Charts |
| GET | `/api/apple/search?term=...&country=us` | חיפוש |
| GET | `/api/apple/podcasts/[id]` | פרטי פודקאסט |
| GET | `/api/apple/podcasts/[id]/episodes` | פרקי פודקאסט |

### Episodes & Summaries

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/episodes/import` | ייבוא פרק חדש |
| GET | `/api/episodes/lookup?audio_url=...` | חיפוש לפי URL |
| POST | `/api/episodes/batch-lookup` | חיפוש מרובה |
| GET | `/api/episodes/[id]/summaries` | קבלת סיכומים |
| POST | `/api/episodes/[id]/summaries` | יצירת סיכום `{level: 'quick'|'deep'}` |
| GET | `/api/episodes/[id]/summaries/status` | סטטוס סיכום |
| POST | `/api/episodes/[id]/insights` | יצירת insights |
| POST | `/api/summaries/check` | בדיקת זמינות batch |

### YouTube

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/youtube/channels` | ערוצים נעקבים |
| POST | `/api/youtube/channels/follow` | מעקב `{channelInput: '...'}` |
| DELETE | `/api/youtube/channels/[id]/unfollow` | ביטול מעקב |
| GET | `/api/youtube/trending` | סרטונים פופולריים |
| GET | `/api/youtube/followed` | סרטונים מערוצים נעקבים |
| POST | `/api/youtube/refresh` | רענון כל הערוצים |
| GET/POST | `/api/youtube/save` | ניהול שמורים |

### Feed

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/feed?sourceType=...&mode=...&limit=...` | פיד מאוחד |
| POST | `/api/feed/[id]/bookmark` | Toggle bookmark |

---

## 📦 תלויות וטכנולוגיות

### Core
- **Next.js 16** - Framework (App Router)
- **React 19** - UI Library
- **TypeScript** - Type Safety (strict mode)

### Styling
- **TailwindCSS 4** - Utility-first CSS
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **class-variance-authority** - Component variants

### Database
- **Supabase** - PostgreSQL + Auth + Realtime
- **@supabase/supabase-js** - Client library

### AI & Transcription
- **@google/generative-ai** - Gemini API (summaries)
- **@deepgram/sdk** - Speech-to-Text (transcription)

### RSS & Content
- **rss-parser** - RSS feed parsing
- **RSSHub** - Self-hosted RSS generation (YouTube, Apple)

### Utilities
- **react-use** - React hooks collection
- **clsx + tailwind-merge** - Class name utilities

### Development
- **Vitest** - Testing framework
- **@testing-library/react** - Component testing
- **happy-dom** - DOM simulation

---

## 🔑 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
GOOGLE_GEMINI_API_KEY=     # For summaries
DEEPGRAM_API_KEY=          # For transcription

# RSSHub
RSSHUB_BASE_URL=http://localhost:1200

# Optional
YOUTUBE_API_KEY=           # Better rate limits for RSSHub
```

---

## 📝 סיכום

PodCatch היא אפליקציה מודרנית שמשלבת:

1. **גילוי תוכן** - Apple Podcasts + YouTube
2. **AI מתקדם** - Deepgram לתמלול, Gemini לסיכומים
3. **UX מעולה** - נגן sticky, אנימציות, dark mode
4. **ארכיטקטורה נכונה** - Contexts לניהול state, caching חכם
5. **Global Caching** - סיכום אחד לפרק משרת את כל המשתמשים

הפרויקט בנוי ב-Next.js 16 עם App Router, TypeScript strict, ו-Supabase כ-backend.
