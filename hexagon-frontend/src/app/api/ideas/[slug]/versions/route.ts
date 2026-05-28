import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDocs } from '@/lib/db';

// GET /api/ideas/[slug]/versions — Get version history for an idea
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const db = await getDb();

    // Find idea by slug
    const idea = await db.collection('ideas').findOne(
      { slug },
      { projection: { versions: 1, title: 1, slug: 1 } }
    );

    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    const versions = (idea.versions || []) as unknown as Record<string, unknown>[];

    // Enrich versions with author info
    const enrichedVersions = await Promise.all(
      versions.map(async (version) => {
        const author = version.changed_by
          ? await db.collection('users').findOne({ _id: new ObjectId(version.changed_by as string) })
          : null;
        return {
          ...version,
          changed_by: author ? {
            id: author._id.toString(),
            username: author.username,
            full_name: author.full_name,
          } : version.changed_by,
        };
      })
    );

    return NextResponse.json({
      idea: {
        title: idea.title,
        slug: idea.slug,
      },
      versions: enrichedVersions,
      total_versions: enrichedVersions.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
