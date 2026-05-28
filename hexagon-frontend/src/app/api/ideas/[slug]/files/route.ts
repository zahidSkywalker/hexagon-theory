import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDb } from '@/lib/db';
import { getAuthUser, unauthorized, forbidden } from '@/lib/auth';

// POST /api/ideas/[slug]/files — Upload file for an idea
// For Vercel serverless, we skip actual file upload and return success
export async function POST(
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
    const idea = await db.collection('ideas').findOne({ slug });
    if (!idea) {
      return NextResponse.json({ detail: 'Idea not found' }, { status: 404 });
    }

    // Check ownership
    if ((idea.user_id as ObjectId).toString() !== user.id) {
      return forbidden('You can only upload files to your own ideas');
    }

    // For Vercel serverless, accept FormData but don't actually store files
    // In production, you'd use a cloud storage service (S3, Vercel Blob, etc.)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ detail: 'No file provided' }, { status: 400 });
    }

    // Return success — file upload would be handled by a cloud storage service
    return NextResponse.json({
      detail: 'File upload acknowledged. Cloud storage integration required for production.',
      file_info: {
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
