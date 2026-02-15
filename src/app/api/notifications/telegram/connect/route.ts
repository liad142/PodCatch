import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { createAdminClient } from '@/lib/supabase/admin';

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME;

// GET - Check if user has a Telegram connection
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: connection } = await supabase
      .from('telegram_connections')
      .select('telegram_username, connected_at')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      connected: !!connection,
      username: connection?.telegram_username || null,
    });
  } catch (error) {
    console.error('Error checking Telegram connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate a new bot link for connecting
export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!BOT_USERNAME) {
      return NextResponse.json(
        { error: 'Telegram bot not configured' },
        { status: 503 }
      );
    }

    // Generate a token encoding user_id and timestamp
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64url');
    const botLink = `https://t.me/${BOT_USERNAME}?start=${token}`;

    return NextResponse.json({ botLink, token });
  } catch (error) {
    console.error('Error generating Telegram connect link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
