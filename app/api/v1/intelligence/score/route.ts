/**
 * Score Calculation API
 * POST /api/v1/intelligence/score
 *
 * Calculates score for given inputs without persisting.
 * Useful for testing scoring rules or preview calculations.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { ScoreService } from '@/lib/application/services/score.service';
import type { ScoringInput } from '@/lib/core/interfaces/scoring';

interface ScoreRequestBody {
  email: string;
  pageViewCount?: number;
  highValuePageCount?: number;
  uniqueVisitDays?: number;
  hasEnrichedCompany?: boolean;
  customFactors?: Record<string, number>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await parseRequestBody(request);
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. "email" is required.' },
        { status: 400 }
      );
    }

    const scoreService = new ScoreService();

    const input: ScoringInput = {
      email: body.email,
      pageViewCount: body.pageViewCount ?? 0,
      highValuePageCount: body.highValuePageCount ?? 0,
      uniqueVisitDays: body.uniqueVisitDays ?? 1,
      hasEnrichedCompany: body.hasEnrichedCompany ?? false,
      customFactors: body.customFactors,
    };

    const result = scoreService.calculate(input);

    return NextResponse.json({
      success: true,
      data: {
        totalScore: result.totalScore,
        breakdown: result.breakdown,
        rules: result.rules,
        weights: scoreService.getWeights(),
        calculatedAt: result.calculatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Score calculation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function parseRequestBody(
  request: NextRequest
): Promise<ScoreRequestBody | null> {
  try {
    const body = await request.json();

    if (typeof body !== 'object' || body === null) {
      return null;
    }

    if (typeof body.email !== 'string') {
      return null;
    }

    return body as ScoreRequestBody;
  } catch {
    return null;
  }
}
