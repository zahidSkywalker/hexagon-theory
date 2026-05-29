import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb, serializeDoc, serializeDocs } from '@/lib/db';
import { getAuthUser, unauthorized } from '@/lib/auth';
import { generateSlug } from '@/lib/slugify';

// GET /api/ideas — List ideas with filtering and sorting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'recent';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const db = await getDb();
    const query: Record<string, unknown> = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status — default to published only for public listing
    if (status) {
      query.status = status;
    } else {
      query.status = 'published';
    }

    // Sort configuration
    let sortConfig: { [key: string]: 1 | -1 };
    switch (sort) {
      case 'trending':
        sortConfig = { view_count: -1 };
        break;
      case 'popular':
        sortConfig = { upvotes: -1 }; // We'll use aggregation below for true popular
        break;
      case 'recent':
      default:
        sortConfig = { created_at: -1 };
        break;
    }

    // For "popular" sort, we need aggregation to compute vote scores
    if (sort === 'popular') {
      const pipeline: Record<string, unknown>[] = [
        { $match: query },
        { $lookup: {
            from: 'votes',
            localField: '_id',
            foreignField: 'idea_id',
            as: 'votes_data',
          },
        },
        { $addFields: {
            vote_score: {
              $subtract: [
                { $size: { $filter: { input: '$votes_data', as: 'v', cond: { $eq: ['$$v.vote_type', 'upvote'] } } } },
                { $size: { $filter: { input: '$votes_data', as: 'v', cond: { $eq: ['$$v.vote_type', 'downvote'] } } } },
              ],
            },
          },
        },
        { $sort: { vote_score: -1 } },
        { $skip: offset },
        { $limit: limit },
        { $project: { votes_data: 0 } },
      ];

      const ideas = await db.collection('ideas').aggregate(pipeline).toArray();
      const total = await db.collection('ideas').countDocuments(query);

      return NextResponse.json({
        ideas: serializeDocs(ideas as unknown as Record<string, unknown>[]),
        total,
        limit,
        offset,
      });
    }

    // Standard sort (trending, recent)
    const ideas = await db.collection('ideas')
      .find(query)
      .sort(sortConfig)
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await db.collection('ideas').countDocuments(query);

    // Enrich with vote counts
    const enrichedIdeas = await Promise.all(
      ideas.map(async (idea) => {
        const ideaId = idea._id as ObjectId;
        const [upvoteCount, downvoteCount] = await Promise.all([
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'upvote' }),
          db.collection('votes').countDocuments({ idea_id: ideaId, vote_type: 'downvote' }),
        ]);
        const author = await db.collection('users').findOne({ _id: idea.user_id as ObjectId });
        const serialized = serializeDoc(idea as unknown as Record<string, unknown>) as Record<string, unknown>;
        return {
          ...serialized,
          upvote_count: upvoteCount,
          downvote_count: downvoteCount,
          author: author ? {
            id: author._id.toString(),
            username: author.username,
            full_name: author.full_name,
            avatar_url: author.avatar_url,
            role: author.role,
          } : null,
        };
      })
    );

    return NextResponse.json({
      ideas: enrichedIdeas,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}

// POST /api/ideas — Create a new idea
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorized();
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

    // Validate required fields
    if (!title || !problem_statement || !description) {
      return NextResponse.json(
        { detail: 'Title, problem statement, and description are required' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { detail: 'Category is required' },
        { status: 400 }
      );
    }

    // Generate unique slug
    const slug = await generateSlug(title);

    const now = new Date().toISOString();
    const idea: Record<string, unknown> = {
      user_id: new ObjectId(user.id),
      title,
      slug,
      problem_statement,
      description,
      category,
      target_region: target_region || null,
      target_community: target_community || null,
      expected_impact: expected_impact || null,
      cost_benefit_summary: cost_benefit_summary || null,
      status: status === 'published' ? 'published' : 'draft',
      video_url: video_url || null,
      version: 1,
      view_count: 0,
      files: [],
      versions: [{
        version: 1,
        title,
        description,
        problem_statement,
        changed_by: new ObjectId(user.id),
        change_summary: 'Initial version',
        created_at: now,
      }],
      created_at: now,
      updated_at: now,
      published_at: status === 'published' ? now : null,
    };

    const db = await getDb();
    const result = await db.collection('ideas').insertOne(idea);

    const serialized = serializeDoc({
      ...idea,
      _id: result.insertedId,
    } as unknown as Record<string, unknown>) as Record<string, unknown>;

    return NextResponse.json(serialized, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
