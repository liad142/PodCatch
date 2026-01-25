import { NextResponse } from 'next/server';
import { getGenres } from '@/lib/apple-podcasts';

export async function GET() {
  try {
    const genres = getGenres();

    return NextResponse.json({
      genres,
      count: genres.length,
    });
  } catch (error) {
    console.error('Apple genres error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch genres' },
      { status: 500 }
    );
  }
}
