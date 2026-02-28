# PodCatch

**Your AI-powered podcast and YouTube companion.**

PodCatch helps you stay on top of the content you care about — without spending hours listening. Get instant AI summaries, deep insights, and a personalised discovery feed across podcasts and YouTube channels.

---

## What PodCatch Does

- **AI Summaries** — Get a quick TLDR or a comprehensive deep-dive for any podcast episode in seconds.
- **Episode Insights** — Key concepts, chapter breakdowns, contrarian takes, and actionable takeaways, all AI-generated.
- **Personalised Discovery** — A daily mix of summarised episodes curated to your interests and listening history.
- **Podcast + YouTube in One Place** — Follow podcasts from Apple Podcasts and YouTube channels side by side in a unified feed.
- **Ask AI** — Chat with any episode. Ask follow-up questions, go deeper on a topic, or get a custom brief.
- **Global Summary Cache** — When someone summarises an episode, everyone benefits. No duplicate work.

---

## Screenshots

> Coming soon.

---

## Getting Started

PodCatch is a hosted web application. Visit **[podcatch.app](https://podcatch.app)** to create a free account.

No installation required. Works on any modern browser, desktop and mobile.

---

## For Developers

If you're contributing or running a local instance:

### Prerequisites
- Node.js 18+
- A Supabase project
- Upstash Redis instance
- API keys: Anthropic, Groq, PostHog (analytics)

### Local Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local
# Fill in your API keys and Supabase credentials

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
npm start
```

---

## Tech Stack

Built with Next.js, Supabase, and Tailwind CSS. AI powered by Anthropic Claude and Groq.

---

## License

Copyright © 2026 PodCatch. All rights reserved.

This repository is currently public for transparency. The source code is **not licensed for reuse, redistribution, or commercial use** without explicit written permission from the authors.
