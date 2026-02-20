import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildEpisodeContext } from "@/lib/ask-ai-service";

// In-memory rate limiting: IP -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

// Separate Gemini instance for chat (plain text, not JSON)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const chatModel = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: episodeId } = await params;
    const body = await request.json();
    const { question, history } = body as {
      question: string;
      history?: { role: "user" | "model"; text: string }[];
    };

    // Validate
    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (question.length > 2000) {
      return new Response(JSON.stringify({ error: "Question too long (max 2000 chars)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (history && history.length > 20) {
      return new Response(JSON.stringify({ error: "Conversation too long (max 20 messages)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build context
    const systemPrompt = await buildEpisodeContext(episodeId);
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: "No transcript available for this episode." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build conversation history for Gemini
    const contents = [
      ...(history || []).map((msg) => ({
        role: msg.role === "user" ? ("user" as const) : ("model" as const),
        parts: [{ text: msg.text }],
      })),
      { role: "user" as const, parts: [{ text: question }] },
    ];

    // Stream response
    const result = await chatModel.generateContentStream({
      systemInstruction: systemPrompt,
      contents,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("[AskAI stream error]", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AskAI] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
