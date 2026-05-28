import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';

// GET /api/users/[username]
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    const db = await getDb();

    // Find user by username
    const user = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (!user) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const serialized = serializeDoc(user as unknown as Record<string, unknown>) as Record<string, unknown>;

    // Get stats
    const ideaCount = await db.collection('ideas').countDocuments({
      user_id: new ObjectId(serialized._id as string),
      status: { $in: ['published', 'draft'] },
    });

    const voteCount = await db.collection('votes').countDocuments({
      user_id: new ObjectId(serialized._id as string),
    });

    return NextResponse.json({
      id: serialized._id,
      email: serialized.email,
      username: serialized.username,
      full_name: serialized.full_name,
      bio: serialized.bio,
      avatar_url: serialized.avatar_url,
      role: serialized.role,
      created_at: serialized.created_at,
      stats: {
        idea_count: ideaCount,
        vote_count: voteCount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
