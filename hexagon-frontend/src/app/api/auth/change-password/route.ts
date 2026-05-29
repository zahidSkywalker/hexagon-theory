import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { hashPassword, comparePassword } from '@/lib/auth';
import { getDb } from '@/lib/db';

// POST /api/auth/change-password
// Requires current password + new password
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { detail: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { detail: 'New password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const { ObjectId } = await import('mongodb');

    // Fetch user with password hash
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(authUser.id) },
      { projection: { password_hash: 1 } }
    );

    if (!user || !user.password_hash) {
      return NextResponse.json(
        { detail: 'User account not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { detail: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash and update new password
    const new_hash = await hashPassword(new_password);
    await db.collection('users').updateOne(
      { _id: new ObjectId(authUser.id) },
      {
        $set: {
          password_hash: new_hash,
          updated_at: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({ detail: 'Password updated successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
