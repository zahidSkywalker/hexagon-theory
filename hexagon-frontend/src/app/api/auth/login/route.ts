import { NextRequest, NextResponse } from 'next/server';
import { getDb, serializeDoc } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Find user by email
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { detail: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Verify password
    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { detail: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const serialized = serializeDoc(user as unknown as Record<string, unknown>) as Record<string, unknown>;
    const token = generateToken(serialized._id as string);

    
    return NextResponse.json({
      user: {
        id: serialized._id,
        email: serialized.email,
        username: serialized.username,
        full_name: serialized.full_name,
        role: serialized.role,
        avatar_url: serialized.avatar_url,
      },
      access_token: token,
      token: token,
      token_type: "bearer",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
