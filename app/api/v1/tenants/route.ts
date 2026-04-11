/**
 * Tenant Management API
 * POST /api/v1/tenants - Create tenant
 * GET /api/v1/tenants - List tenants (admin only)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/infrastructure/db/client';
import { tenants } from '@/lib/infrastructure/db/schema';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Creates a new tenant.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify admin key for tenant creation
  const apiKey = request.headers.get('x-api-key');
  if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { success: false, error: 'name and slug are required' },
        { status: 400 }
      );
    }

    const [tenant] = await db
      .insert(tenants)
      .values({
        name: body.name,
        slug: body.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        domain: body.domain ?? null,
        plan: body.plan ?? 'free',
        settings: body.settings ?? null,
        isActive: true,
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          domain: tenant.domain,
          plan: tenant.plan,
          createdAt: tenant.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tenant creation error:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'Tenant slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
