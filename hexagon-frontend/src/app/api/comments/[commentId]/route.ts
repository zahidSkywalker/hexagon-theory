import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

// PUT /api/comments/[commentId] — Edit a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { commentId } = params;
    const db = await getDb();

    // Find the comment
    const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return NextResponse.json({ detail: 'Comment not found' }, { status: 404 });
    }

    // Check ownership
    if ((comment.user_id as ObjectId).toString() !== user.id) {
      return forbidden('You can only edit your own comments');
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { detail: 'Comment content cannot be empty' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const result = await db.collection('comments').findOneAndUpdate(
      { _id: new ObjectId(commentId) },
      {
        $set: {
          content: content.trim(),
          is_edited: true,
          updated_at: now,
        },
      },
      { returnDocument: 'after' }
    );

    const serialized = serializeDoc(result as unknown as Record<string, unknown>);
    return NextResponse.json(serialized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// DELETE /api/comments/[commentId] — Delete a comment (cascade delete replies)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { commentId } = params;
    const db = await getDb();

    // Find the comment
    const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId) });
    if (!comment) {
      return NextResponse.json({ detail: 'Comment not found' }, { status: 404 });
    }

    // Check ownership
    if ((comment.user_id as ObjectId).toString() !== user.id) {
      return forbidden('You can only delete your own comments');
    }

    // Recursively find all descendant comment IDs
    const idsToDelete: ObjectId[] = [new ObjectId(commentId)];
    let currentIds = [new ObjectId(commentId)];

    while (currentIds.length > 0) {
      const children = await db.collection('comments')
        .find({ parent_id: { $in: currentIds } })
        .toArray();
      currentIds = children.map(c => c._id);
      idsToDelete.push(...currentIds);
    }

    // Delete all comments in the thread
    await db.collection('comments').deleteMany({
      _id: { $in: idsToDelete },
    });

    return NextResponse.json({
      detail: 'Comment deleted',
      deleted_count: idsToDelete.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
