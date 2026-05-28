import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const db = await getDb();
    const fullUser = await db.collection('users').findOne({ _id: new ObjectId(user.id) });

    if (!fullUser) {
      return NextResponse.json({ detail: 'User not found' }, { status: 404 });
    }

    const serialized = serializeDoc(fullUser as unknown as Record<string, unknown>) as Record<string, unknown>;
    return NextResponse.json({
      id: serialized._id,
      email: serialized.email,
      username: serialized.username,
      full_name: serialized.full_name,
      bio: serialized.bio,
      avatar_url: serialized.avatar_url,
      role: serialized.role,
      email_verified: serialized.email_verified,
      is_active: serialized.is_active,
      created_at: serialized.created_at,
      updated_at: serialized.updated_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
