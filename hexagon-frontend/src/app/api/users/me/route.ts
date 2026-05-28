import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

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
