import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { getDb, serializeDoc } from './db';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'hexagon-jwt-secret-change-in-production';
const JWT_EXPIRY = '24h';

// ─────────────────────────────────────────────
// Password helpers
// ─────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─────────────────────────────────────────────
// JWT helpers
// ─────────────────────────────────────────────
export function generateToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    return decoded;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// Auth user from request
// ─────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.sub) });
  if (!user) {
    return null;
  }

  const serialized = serializeDoc(user as unknown as Record<string, unknown>) as Record<string, unknown>;
  return {
    id: serialized._id as string,
    email: serialized.email as string,
    username: serialized.username as string,
    full_name: (serialized.full_name as string) || null,
    role: (serialized.role as string) || 'user',
    avatar_url: (serialized.avatar_url as string) || null,
  };
}

// ─────────────────────────────────────────────
// Unauthorized response helper
// ─────────────────────────────────────────────
import { NextResponse } from 'next/server';

export function unauthorized(): NextResponse {
  return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
}

export function forbidden(message?: string): NextResponse {
  return NextResponse.json({ detail: message || 'Permission denied' }, { status: 403 });
}
