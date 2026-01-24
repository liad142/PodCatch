import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface SummaryResult {
  summary: string;
  key_points: string[];
  resources: {
    github_repos: string[];
    books: string[];
    tools: string[];
    links: string[];
  };
}

export async function generateSummary(transcript: string): Promise<SummaryResult> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20250924",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Analyze this podcast transcript and provide:
1. A 200-300 word summary
2. 5-7 key takeaways
3. Extracted resources (GitHub repos, books, tools, websites mentioned)

Return as JSON only, no markdown:
{
  "summary": "...",
  "key_points": ["...", "..."],
  "resources": {
    "github_repos": ["user/repo", ...],
    "books": ["Title by Author", ...],
    "tools": ["Tool name", ...],
    "links": ["https://...", ...]
  }
}

Transcript:
${transcript.substring(0, 100000)}`,
      },
    ],
  });

  const textContent = message.content[0];
  if (textContent.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  try {
    return JSON.parse(textContent.text) as SummaryResult;
  } catch {
    // If JSON parsing fails, create a structured response from the text
    return {
      summary: textContent.text,
      key_points: [],
      resources: {
        github_repos: [],
        books: [],
        tools: [],
        links: [],
      },
    };
  }
}
