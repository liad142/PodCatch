import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

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
  const prompt = `Analyze this podcast transcript and provide:
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
${transcript.substring(0, 100000)}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  try {
    // Extract JSON from response if wrapped in markdown
    let jsonText = text.trim();
    if (!jsonText.startsWith('{')) {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }
    return JSON.parse(jsonText) as SummaryResult;
  } catch {
    // If JSON parsing fails, create a structured response from the text
    return {
      summary: text,
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
