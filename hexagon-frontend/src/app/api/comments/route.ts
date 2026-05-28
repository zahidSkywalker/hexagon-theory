import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc, serializeDocs } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/comments?idea_id=xxx&is_suggestion=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');
    const isSuggestion = searchParams.get('is_suggestion');

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const query: Record<string, unknown> = { idea_id: new ObjectId(idea_id) };
    if (isSuggestion !== null) {
      query.is_suggestion = isSuggestion === 'true';
    }

    // Fetch all comments for the idea
    const comments = await db.collection('comments')
      .find(query)
      .sort({ created_at: 1 })
      .toArray();

    // Build comment tree
    const commentMap = new Map<string, Record<string, unknown>>();
    const topLevelComments: Record<string, unknown>[] = [];

    // Enrich comments with author info
    type EnrichedComment = Record<string, unknown> & {
      author: { id: string; username: string; full_name: string; avatar_url: string } | null;
      replies: EnrichedComment[];
    };

    const enrichedComments: EnrichedComment[] = await Promise.all(
      comments.map(async (comment) => {
        const serialized = serializeDoc(comment as unknown as Record<string, unknown>);
        const author = await db.collection('users').findOne({
          _id: new ObjectId(serialized.user_id as string),
        });
        return {
          ...serialized,
          author: author ? {
            id: author._id.toString(),
            username: author.username,
            full_name: author.full_name,
            avatar_url: author.avatar_url,
          } : null,
          replies: [] as EnrichedComment[],
        };
      })
    );

    // Build tree structure
    for (const comment of enrichedComments) {
      const parentId = comment.parent_id as string | null;
      commentMap.set(comment._id as string, comment);
      if (parentId && commentMap.has(parentId)) {
        (commentMap.get(parentId)!.replies as EnrichedComment[]).push(comment);
      } else if (!parentId) {
        topLevelComments.push(comment);
      }
    }

    return NextResponse.json({
      comments: topLevelComments,
      total: comments.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// POST /api/comments — Create a new comment
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { idea_id, content, parent_id, is_suggestion } = body;

    if (!idea_id || !content) {
      return NextResponse.json(
        { detail: 'idea_id and content are required' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { detail: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify idea exists
    const idea = await db.collection('ideas').findOne({ _id: new ObjectId(idea_id) });
    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // If parent_id, verify parent comment exists
    if (parent_id) {
      const parentComment = await db.collection('comments').findOne({
        _id: new ObjectId(parent_id),
      });
      if (!parentComment) {
        return NextResponse.json({ detail: 'Parent comment not found' }, { status: 404 });
      }
    }

    const now = new Date().toISOString();
    const comment = {
      user_id: new ObjectId(user.id),
      idea_id: new ObjectId(idea_id),
      parent_id: parent_id ? new ObjectId(parent_id) : null,
      content: content.trim(),
      is_suggestion: is_suggestion || false,
      is_edited: false,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('comments').insertOne(comment);
    const serialized = serializeDoc({
      ...comment,
      _id: result.insertedId,
    } as unknown as Record<string, unknown>);

    // Include author info in response
    return NextResponse.json({
      ...serialized,
      author: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
