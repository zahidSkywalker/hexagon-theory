import { NextRequest, NextResponse } from 'next/server';
import { getDb, serializeDoc } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password, full_name } = body;

    // Validate required fields
    if (!email || !username || !password) {
      return NextResponse.json(
        { detail: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { detail: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate username: 3-30 chars alphanumeric + underscore
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { detail: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Validate password min 8 chars
    if (password.length < 8) {
      return NextResponse.json(
        { detail: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Check if email already exists
    const existingEmail = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { detail: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsername = await db.collection('users').findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { detail: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const now = new Date().toISOString();
    const result = await db.collection('users').insertOne({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password_hash,
      full_name: full_name || null,
      bio: null,
      avatar_url: null,
      role: 'user',
      email_verified: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    const user = {
      id: result.insertedId.toString(),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      full_name: full_name || null,
      role: 'user',
    };

    const token = generateToken(result.insertedId.toString());

    return NextResponse.json({ user, token }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    // Handle duplicate key errors
    if (message.includes('duplicate key') || message.includes('E11000')) {
      return NextResponse.json(
        { detail: 'Email or username already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
