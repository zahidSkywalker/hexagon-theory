import { NextResponse } from 'next/server';

// GET /api/health — Health check endpoint
export async function GET() {
  try {
    // Check if environment variables are set
    const hasMongoUri = !!process.env.MONGODB_URI;
    const hasJwtSecret = !!process.env.JWT_SECRET;

    // Try to connect to MongoDB
    let dbStatus = 'disconnected';
    if (hasMongoUri) {
      try {
        const { getDb } = await import('@/lib/db');
        const db = await getDb();
        await db.command({ ping: 1 });
        dbStatus = 'connected';
      } catch {
        dbStatus = 'error';
      }
    }

    const isHealthy = hasMongoUri && dbStatus === 'connected';

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
          database: dbStatus,
          auth: hasJwtSecret ? 'configured' : 'missing',
        },
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'error',
          auth: 'unknown',
        },
      },
      { status: 503 }
    );
  }
}
