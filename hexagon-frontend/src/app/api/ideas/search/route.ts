import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc, serializeDocs } from '@/lib/db';

// GET /api/ideas/search?q=query
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!q || q.length < 3) {
      return NextResponse.json(
        { detail: 'Search query must be at least 3 characters' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Escape special regex characters to prevent ReDoS attacks
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escaped, $options: 'i' };
    const query = {
      $or: [
        { title: searchRegex },
        { problem_statement: searchRegex },
        { description: searchRegex },
      ],
      status: 'published',
    };

    const ideas = await db.collection('ideas')
      .find(query)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await db.collection('ideas').countDocuments(query);

    // Enrich with author and vote counts
    const enrichedIdeas = await Promise.all(
      ideas.map(async (idea) => {
        const ideaId = idea._id as ObjectId;
        const [upvoteCount, downvoteCount] = await Promise.all([
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'upvote' }),
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'downvote' }),
        ]);
        const author = await db.collection('users').findOne({ _id: idea.user_id as ObjectId });
        const serialized = serializeDoc(idea as unknown as Record<string, unknown>) as Record<string, unknown>;
        return {
          ...serialized,
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
      ideas: enrichedIdeas,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
