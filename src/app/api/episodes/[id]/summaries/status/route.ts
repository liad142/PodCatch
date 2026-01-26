import { NextRequest, NextResponse } from "next/server";
import { getSummariesStatus } from "@/lib/summary-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/episodes/:id/summaries/status - Polling endpoint for status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'en';
    
    const result = await getSummariesStatus(id, language);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
