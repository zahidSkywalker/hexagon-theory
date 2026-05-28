import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';
import { generateSlug } from '@/lib/slugify';

// GET /api/ideas/[slug] — Get single idea
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const db = await getDb();

    // Find idea by slug and increment view_count
    const idea = await db.collection('ideas').findOneAndUpdate(
      { slug },
      { $inc: { view_count: 1 } },
      { returnDocument: 'after' }
    );

    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    const serialized = serializeDoc(idea as unknown as Record<string, unknown>) as Record<string, unknown>;

    // Get author info
    const author = await db.collection('users').findOne({ _id: new ObjectId(serialized.user_id as string) });
    const authorSerialized = author ? serializeDoc(author as unknown as Record<string, unknown>) as Record<string, unknown> : null;

    // Get vote summary
    const upvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(serialized._id as string),
      vote_type: 'upvote',
    });
    const downvotes = await db.collection('votes').countDocuments({
      idea_id: new ObjectId(serialized._id as string),
      vote_type: 'downvote',
    });

    // Get user's vote if authenticated
    let userVote = null;
    const authUser = await getAuthUser(request);
    if (authUser) {
      const vote = await db.collection('votes').findOne({
        idea_id: new ObjectId(serialized._id as string),
        user_id: new ObjectId(authUser.id),
      });
      if (vote) {
        userVote = (vote as unknown as Record<string, unknown>).vote_type;
      }
    }

    // Get comment count
    const commentCount = await db.collection('comments').countDocuments({
      idea_id: new ObjectId(serialized._id as string),
    });

    return NextResponse.json({
      ...serialized,
      author: authorSerialized ? {
        id: authorSerialized._id,
        username: authorSerialized.username,
        full_name: authorSerialized.full_name,
        avatar_url: authorSerialized.avatar_url,
      } : null,
      votes: {
        upvotes,
        downvotes,
        user_vote: userVote,
      },
      comment_count: commentCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// PUT /api/ideas/[slug] — Update idea
export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { slug } = params;
    const db = await getDb();

    // Find the idea
    const existing = await db.collection('ideas').findOne({ slug });
    if (!existing) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // Check ownership
    if ((existing.user_id as ObjectId).toString() !== user.id) {
      return forbidden('You can only edit your own ideas');
    }

    const body = await request.json();
    const {
      title,
      problem_statement,
      description,
      category,
      target_region,
      target_community,
      expected_impact,
      cost_benefit_summary,
      video_url,
      status,
    } = body;

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = { updated_at: now };

    // Track changes for version entry
    const changes: string[] = [];
    const old = existing as unknown as Record<string, unknown>;

    if (title !== undefined) {
      updateFields.title = title;
      changes.push('title');
    }
    if (problem_statement !== undefined) {
      updateFields.problem_statement = problem_statement;
      changes.push('problem_statement');
    }
    if (description !== undefined) {
      updateFields.description = description;
      changes.push('description');
    }
    if (category !== undefined) {
      updateFields.category = category;
    }
    if (target_region !== undefined) {
      updateFields.target_region = target_region;
    }
    if (target_community !== undefined) {
      updateFields.target_community = target_community;
    }
    if (expected_impact !== undefined) {
      updateFields.expected_impact = expected_impact;
    }
    if (cost_benefit_summary !== undefined) {
      updateFields.cost_benefit_summary = cost_benefit_summary;
    }
    if (video_url !== undefined) {
      updateFields.video_url = video_url;
    }
    if (status !== undefined) {
      updateFields.status = status;
      // Set published_at when first publishing
      if (status === 'published' && !existing.published_at) {
        updateFields.published_at = now;
      }
    }

    // If slug needs updating (title changed), generate new slug
    if (title !== undefined && title !== existing.title) {
      updateFields.slug = await generateSlug(title);
    }

    // Increment version and create version entry if key fields changed
    if (changes.length > 0) {
      const newVersion = (existing.version || 1) + 1;
      updateFields.version = newVersion;

      const versionEntry = {
        version: newVersion,
        title: title || existing.title,
        description: description || existing.description,
        problem_statement: problem_statement || existing.problem_statement,
        changed_by: new ObjectId(user.id),
        change_summary: changes.join(', '),
        created_at: now,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateOp: any = {
        $set: updateFields,
        $push: { versions: versionEntry },
      };
      await db.collection('ideas').updateOne({ slug }, updateOp);
    } else {
      await db.collection('ideas').updateOne({ slug }, { $set: updateFields });
    }

    // Return updated idea
    const updated = await db.collection('ideas').findOne({ slug: updateFields.slug || slug });
    const serialized = serializeDoc(updated as unknown as Record<string, unknown>);

    return NextResponse.json(serialized);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// DELETE /api/ideas/[slug] — Delete idea
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
    }

    const { slug } = params;
    const db = await getDb();

    // Find the idea
    const existing = await db.collection('ideas').findOne({ slug });
    if (!existing) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // Check ownership
    if ((existing.user_id as ObjectId).toString() !== user.id) {
      return forbidden('You can only delete your own ideas');
    }

    const ideaId = existing._id;

    // Delete associated data
    await db.collection('votes').deleteMany({ idea_id: ideaId });
    await db.collection('comments').deleteMany({ idea_id: ideaId });
    await db.collection('institutional_interests').deleteMany({ idea_id: ideaId });

    // Delete the idea
    await db.collection('ideas').deleteOne({ _id: ideaId });

    return NextResponse.json({ detail: 'Idea deleted successfully' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
