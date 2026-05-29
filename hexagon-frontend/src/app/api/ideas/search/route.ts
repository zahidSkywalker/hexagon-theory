import { NextRequest, NextResponse } from 'next/server';
import { getDb, serializeDocs } from '@/lib/db';

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

    return NextResponse.json({
      ideas: serializeDocs(ideas as unknown as Record<string, unknown>[]),
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
