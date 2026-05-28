import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

// GET /api/institutional/dashboard — Dashboard for institutional users
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    if (user.role !== 'institution') {
      return forbidden('Only institutional users can access the dashboard');
    }

    const db = await getDb();
    const institutionId = new ObjectId(user.id);

    // Get interests by this institution
    const interests = await db.collection('institutional_interests')
      .find({ institution_id: institutionId })
      .toArray();

    const interestIds = interests.map(i => i.idea_id);

    // Get stats by status
    const statusStats = {
      interested: interests.filter(i => i.status === 'interested').length,
      reviewing: interests.filter(i => i.status === 'reviewing').length,
      implementing: interests.filter(i => i.status === 'implementing').length,
      declined: interests.filter(i => i.status === 'declined').length,
    };

    // Get recent interests with idea details
    const recentInterests = await db.collection('institutional_interests')
      .find({ institution_id: institutionId })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    const enrichedRecent = await Promise.all(
      recentInterests.map(async (interest) => {
        const idea = await db.collection('ideas').findOne({ _id: interest.idea_id });
        const ideaAuthor = idea
          ? await db.collection('users').findOne({ _id: idea.user_id })
          : null;

        return {
          id: interest._id.toString(),
          status: interest.status,
          notes: interest.notes,
          created_at: interest.created_at instanceof Date ? interest.created_at.toISOString() : interest.created_at,
          updated_at: interest.updated_at instanceof Date ? interest.updated_at.toISOString() : interest.updated_at,
          idea: idea ? {
            id: idea._id.toString(),
            title: idea.title,
            slug: idea.slug,
            category: idea.category,
            status: idea.status,
            author: ideaAuthor ? {
              id: ideaAuthor._id.toString(),
              username: ideaAuthor.username,
              full_name: ideaAuthor.full_name,
            } : null,
          } : null,
        };
      })
    );

    return NextResponse.json({
      institution: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
      },
      stats: {
        total_interests: interests.length,
        ...statusStats,
      },
      recent_interests: enrichedRecent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
