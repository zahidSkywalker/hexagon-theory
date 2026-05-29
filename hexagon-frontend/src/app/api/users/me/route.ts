import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/users/me — Get own profile with stats
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const db = await getDb();

    // Get idea stats
    const ideaCount = await db.collection('ideas').countDocuments({
      user_id: new ObjectId(user.id),
      status: { $in: ['published', 'draft'] },
    });

    const voteCount = await db.collection('votes').countDocuments({
      user_id: new ObjectId(user.id),
    });

    const commentCount = await db.collection('comments').countDocuments({
      user_id: new ObjectId(user.id),
    });

    // Get user's recent ideas
    const recentIdeas = await db.collection('ideas')
      .find({ user_id: new ObjectId(user.id), status: 'published' })
      .sort({ created_at: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      role: user.role,
      email_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      stats: {
        total_ideas: ideaCount,
        total_votes_received: voteCount,
        total_comments: commentCount,
      },
      ideas: recentIdeas.map((idea) => ({
        id: idea._id.toString(),
        slug: idea.slug,
        title: idea.title,
        category: idea.category,
        target_region: idea.target_region || undefined,
        status: idea.status,
        view_count: idea.view_count || 0,
        created_at: idea.created_at,
        author: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
        },
        upvote_count: 0,
        downvote_count: 0,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// PUT /api/users/me — Update own profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { full_name, bio, avatar_url } = body;

    // Build update object with only provided fields
    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updateFields.full_name = full_name;
    if (bio !== undefined) updateFields.bio = bio;
    if (avatar_url !== undefined) updateFields.avatar_url = avatar_url;

    const db = await getDb();
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(user.id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const serialized = serializeDoc(result as unknown as Record<string, unknown>) as Record<string, unknown>;
    return NextResponse.json({
      id: serialized._id,
      email: serialized.email,
      username: serialized.username,
      full_name: serialized.full_name,
      bio: serialized.bio,
      avatar_url: serialized.avatar_url,
      role: serialized.role,
      created_at: serialized.created_at,
      updated_at: serialized.updated_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
