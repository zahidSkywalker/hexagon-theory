import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc, serializeDocs } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';

// GET /api/institutional/interests?idea_id=xxx — List institutional interests for an idea
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id query parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const interests = await db.collection('institutional_interests')
      .find({ idea_id: new ObjectId(idea_id) })
      .sort({ created_at: -1 })
      .toArray();

    // Enrich with institution info
    const enrichedInterests = await Promise.all(
      interests.map(async (interest) => {
        const serialized = serializeDoc(interest as unknown as Record<string, unknown>) as Record<string, unknown>;
        const institution = await db.collection('users').findOne({
          _id: new ObjectId(serialized.institution_id as string),
        });
        return {
          ...serialized,
          institution: institution ? {
            id: institution._id.toString(),
            username: institution.username,
            full_name: institution.full_name,
            avatar_url: institution.avatar_url,
          } : null,
        };
      })
    );

    return NextResponse.json({
      interests: enrichedInterests,
      total: enrichedInterests.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// POST /api/institutional/interests — Create institutional interest
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    // Only institutional users can mark interest
    if (user.role !== 'institution') {
      return NextResponse.json(
        { detail: 'Only institutional users can mark interest' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { idea_id, status, notes } = body;

    if (!idea_id || !status) {
      return NextResponse.json(
        { detail: 'idea_id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['interested', 'reviewing', 'implementing', 'declined'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { detail: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Verify idea exists
    const idea = await db.collection('ideas').findOne({ _id: new ObjectId(idea_id) });
    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const interest = {
      institution_id: new ObjectId(user.id),
      idea_id: new ObjectId(idea_id),
      status,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };

    const result = await db.collection('institutional_interests').insertOne(interest);
    const serialized = serializeDoc({
      ...interest,
      _id: result.insertedId,
    } as unknown as Record<string, unknown>);

    return NextResponse.json(serialized, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message.includes('duplicate key') || message.includes('E11000')) {
      return NextResponse.json(
        { detail: 'You have already marked interest in this idea' },
        { status: 409 }
      );
    }
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// PUT /api/institutional/interests — Update institutional interest
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { idea_id, status, notes } = body;

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status !== undefined) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;

    const result = await db.collection('institutional_interests').findOneAndUpdate(
      {
        institution_id: new ObjectId(user.id),
        idea_id: new ObjectId(idea_id),
      },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ detail: 'Interest record not found' }, { status: 404 });
    }

    const serialized = serializeDoc(result as unknown as Record<string, unknown>);
    return NextResponse.json(serialized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// DELETE /api/institutional/interests — Remove institutional interest
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const body = await request.json();
    const { idea_id } = body;

    if (!idea_id) {
      return NextResponse.json(
        { detail: 'idea_id is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const result = await db.collection('institutional_interests').deleteOne({
      institution_id: new ObjectId(user.id),
      idea_id: new ObjectId(idea_id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ detail: 'Interest record not found' }, { status: 404 });
    }

    return NextResponse.json({ detail: 'Interest removed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
