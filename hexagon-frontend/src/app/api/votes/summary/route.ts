import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/votes/summary?idea_id=xxx — Get vote summary for an idea
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify idea exists
    const idea = await db.collection('ideas').findOne({ _id: new ObjectId(idea_id) });
    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // Count votes
    const upvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'upvote',
    });
    const downvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'downvote',
    });

    // Check current user's vote if authenticated
    let user_vote = null;
    const authUser = await getAuthUser(request);
    if (authUser) {
      const vote = await db.collection('votes').findOne({
        idea_id: new ObjectId(idea_id),
        user_id: new ObjectId(authUser.id),
      });
      if (vote) {
        user_vote = (vote as unknown as Record<string, unknown>).vote_type as string;
      }
    }

    return NextResponse.json({
      idea_id,
      upvotes,
      downvotes,
      user_vote,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
