import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function transcribeAudio(audioData: ArrayBuffer, filename: string): Promise<string> {
  // Create a Blob first, then a File object
  const blob = new Blob([audioData], { type: "audio/mpeg" });
  const file = new File([blob], filename, { type: "audio/mpeg" });

  const transcription = await groq.audio.transcriptions.create({
    file: file,
    model: "whisper-large-v3-turbo",
    language: "en",
    response_format: "json",
  });

  return transcription.text;
}

export async function transcribeFromUrl(audioUrl: string): Promise<string> {
  // Fetch the audio file
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // Extract filename from URL
  const filename = audioUrl.split("/").pop()?.split("?")[0] || "audio.mp3";

  return transcribeAudio(arrayBuffer, filename);
}
