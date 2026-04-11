/**
 * API Key Management
 * POST /api/v1/api-keys - Create API key
 * GET /api/v1/api-keys - List API keys
 */

import { NextResponse, type NextRequest } from 'next/server';
import { apiKeyService } from '@/lib/application/services';
import { withApiKeyAuth } from '@/lib/application/middleware';

/**
 * Creates a new API key for the authenticated tenant.
 */
export const POST = withApiKeyAuth(async (request: NextRequest, tenantId: string) => {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      );
    }

    const result = await apiKeyService.createKey({
      tenantId,
      name: body.name,
      scopes: body.scopes ?? ['*'],
      expiresInDays: body.expiresInDays,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result.id,
          key: result.key, // Only shown once!
          keyPrefix: result.keyPrefix,
          name: result.name,
          scopes: result.scopes,
          expiresAt: result.expiresAt,
        },
        warning: 'Store this API key securely. It will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API key creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Lists API keys for the authenticated tenant.
 */
export const GET = withApiKeyAuth(async (_request: NextRequest, tenantId: string) => {
  try {
    const keys = await apiKeyService.listKeys(tenantId);

    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (error) {
    console.error('API key list error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
});
