/**
 * API Key Operations
 * DELETE /api/v1/api-keys/[keyId] - Revoke API key
 */

import { NextResponse, type NextRequest } from 'next/server';
import { apiKeyService } from '@/lib/application/services';
import { withApiKeyAuth } from '@/lib/application/middleware';

interface RouteParams {
  params: Promise<{ keyId: string }>;
}

/**
 * Revokes an API key.
 */
export const DELETE = withApiKeyAuth(
  async (request: NextRequest, tenantId: string) => {
    try {
      // Extract keyId from URL
      const url = new URL(request.url);
      const keyId = url.pathname.split('/').pop();

      if (!keyId) {
        return NextResponse.json(
          { success: false, error: 'Key ID required' },
          { status: 400 }
        );
      }

      const revoked = await apiKeyService.revokeKey(keyId, tenantId);

      if (!revoked) {
        return NextResponse.json(
          { success: false, error: 'API key not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'API key revoked',
      });
    } catch (error) {
      console.error('API key revocation error:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);
