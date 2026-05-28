import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

// POST /api/votes — Cast or update a vote (idea_id + vote_type in body)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { idea_id, vote_type } = body;

    if (!idea_id || !vote_type) {
      return NextResponse.json(
        { detail: 'idea_id and vote_type are required' },
        { status: 400 }
      );
    }

    if (!['upvote', 'downvote'].includes(vote_type)) {
      return NextResponse.json(
        { detail: 'vote_type must be "upvote" or "downvote"' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify idea exists
    const idea = await db.collection('ideas').findOne({ _id: new ObjectId(idea_id) });
    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // Upsert vote
    const now = new Date().toISOString();
    await db.collection('votes').updateOne(
      { user_id: new ObjectId(user.id), idea_id: new ObjectId(idea_id) },
      {
        $set: {
          vote_type,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );

    // Get updated summary
    const upvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'upvote',
    });
    const downvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'downvote',
    });

    return NextResponse.json({
      detail: 'Vote recorded',
      vote_type,
      summary: { upvotes, downvotes },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('duplicate key') || message.includes('E11000')) {
      return NextResponse.json({ detail: 'You have already voted on this idea' }, { status: 409 });
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// DELETE /api/votes — Remove vote (idea_id in body)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { idea_id } = body;

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db.collection('votes').deleteOne({
      user_id: new ObjectId(user.id),
      idea_id: new ObjectId(idea_id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ detail: 'Vote not found' }, { status: 404 });
    }

    // Get updated summary
    const upvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'upvote',
    });
    const downvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(idea_id),
      vote_type: 'downvote',
    });

    return NextResponse.json({
      detail: 'Vote removed',
      summary: { upvotes, downvotes },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
