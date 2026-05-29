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

    // Count votes RECEIVED on user's ideas
    const userIdeaIds = await db.collection('ideas')
      .find({ user_id: new ObjectId(serialized._id as string) }, { projection: { _id: 1 } })
      .toArray();
    const userIdeaObjectIds = userIdeaIds.map(doc => doc._id);
    const voteCount = userIdeaObjectIds.length > 0
      ? await db.collection('votes').countDocuments({ idea_id: { $in: userIdeaObjectIds } })
      : 0;

    const commentCount = await db.collection('comments').countDocuments({
      user_id: new ObjectId(serialized._id as string),
    });

    // Get user's recent published ideas
    const recentIdeas = await db.collection('ideas')
      .find({ user_id: new ObjectId(serialized._id as string), status: 'published' })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    const enrichedIdeas = await Promise.all(
      recentIdeas.map(async (idea) => {
        const ideaId = idea._id as ObjectId;
        const [upvoteCount, downvoteCount] = await Promise.all([
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'upvote' }),
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'downvote' }),
        ]);
        const author = await db.collection('users').findOne({ _id: idea.user_id as ObjectId });
        const serializedIdea = serializeDoc(idea as unknown as Record<string, unknown>) as Record<string, unknown>;
        return {
          ...serializedIdea,
          upvote_count: upvoteCount,
          downvote_count: downvoteCount,
          author: author ? {
            id: author._id.toString(),
            username: author.username,
            full_name: author.full_name,
            avatar_url: author.avatar_url,
            role: author.role,
          } : null,
        };
      })
    );

    return NextResponse.json({
      id: serialized._id,
      username: serialized.username,
      full_name: serialized.full_name,
      bio: serialized.bio,
      avatar_url: serialized.avatar_url,
      role: serialized.role,
      created_at: serialized.created_at,
      stats: {
        total_ideas: ideaCount,
        total_votes_received: voteCount,
        total_comments: commentCount,
      },
      ideas: enrichedIdeas,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
