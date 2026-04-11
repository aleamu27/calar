/**
 * Signal Service
 * Manages signal creation and dispatch to notification channels.
 */

import { eq } from 'drizzle-orm';
import type {
  ISignalDispatcher,
  Signal,
  SignalDispatchResult,
  ThresholdConfig,
} from '../../core/interfaces/signal';
import type { SignalType, SignalPayload } from '../../infrastructure/db/schema';
import { db } from '../../infrastructure/db/client';
import { signals, leads } from '../../infrastructure/db/schema';
import {
  ConsoleSignalDispatcher,
  ResendSignalDispatcher,
} from '../../infrastructure/signals';

const DEFAULT_THRESHOLD_CONFIG: ThresholdConfig = {
  scoreThreshold: 50,
  highIntentPages: ['/pricing', '/demo', '/contact', '/request-demo', '/book-demo'],
  repeatedVisitCount: 3,
  enabled: true,
};

export class SignalService {
  private readonly dispatchers: ISignalDispatcher[];
  private readonly thresholdConfig: ThresholdConfig;

  constructor(
    dispatchers?: ISignalDispatcher[],
    thresholdConfig?: Partial<ThresholdConfig>
  ) {
    this.thresholdConfig = { ...DEFAULT_THRESHOLD_CONFIG, ...thresholdConfig };

    if (dispatchers && dispatchers.length > 0) {
      this.dispatchers = dispatchers;
    } else {
      // Default dispatchers: Console always, Resend if configured
      this.dispatchers = [
        new ConsoleSignalDispatcher(),
        new ResendSignalDispatcher(),
      ];
    }
  }

  /**
   * Checks if a signal should be triggered for the given score.
   */
  shouldTriggerScoreThreshold(score: number): boolean {
    return this.thresholdConfig.enabled && score > this.thresholdConfig.scoreThreshold;
  }

  /**
   * Checks if a page path is considered high-intent.
   */
  isHighIntentPage(path: string): boolean {
    const normalizedPath = path.toLowerCase().split('?')[0];
    return this.thresholdConfig.highIntentPages.some(
      (p) => normalizedPath === p || normalizedPath.startsWith(p + '/')
    );
  }

  /**
   * Creates and persists a new signal.
   */
  async createSignal(
    leadId: string,
    type: SignalType,
    payload: SignalPayload
  ): Promise<string> {
    const [signal] = await db
      .insert(signals)
      .values({
        leadId,
        type,
        payload,
        status: 'pending',
      })
      .returning({ id: signals.id });

    return signal.id;
  }

  /**
   * Dispatches a signal to all configured notification channels.
   * Updates signal status based on dispatch results.
   */
  async dispatchSignal(signalId: string): Promise<SignalDispatchResult[]> {
    // Fetch the signal
    const [signalRecord] = await db
      .select()
      .from(signals)
      .where(eq(signals.id, signalId))
      .limit(1);

    if (!signalRecord) {
      throw new Error(`Signal not found: ${signalId}`);
    }

    // Mark as processing
    await db
      .update(signals)
      .set({ status: 'processing' })
      .where(eq(signals.id, signalId));

    const signal: Signal = {
      id: signalRecord.id,
      leadId: signalRecord.leadId,
      type: signalRecord.type,
      payload: signalRecord.payload!,
    };

    // Dispatch to all configured channels
    const results: SignalDispatchResult[] = [];

    for (const dispatcher of this.dispatchers) {
      if (!dispatcher.isConfigured()) {
        continue;
      }

      const result = await dispatcher.dispatch(signal);
      results.push(result);

      // If at least one dispatcher succeeds, consider it delivered
      if (result.success) {
        await db
          .update(signals)
          .set({
            status: 'delivered',
            deliveredAt: new Date(),
            payload: {
              ...signal.payload,
              notificationSent: true,
              notificationId: result.externalId,
            },
          })
          .where(eq(signals.id, signalId));
      }
    }

    // If all dispatchers failed, mark as failed
    const anySuccess = results.some((r) => r.success);
    if (!anySuccess && results.length > 0) {
      const errors = results.map((r) => r.error).filter(Boolean).join('; ');
      await db
        .update(signals)
        .set({
          status: 'failed',
          error: errors,
        })
        .where(eq(signals.id, signalId));
    }

    return results;
  }

  /**
   * Triggers a score threshold signal for a lead.
   * Creates the signal and dispatches immediately.
   */
  async triggerScoreThreshold(
    leadId: string,
    score: number
  ): Promise<{ signalId: string; results: SignalDispatchResult[] }> {
    // Fetch lead info for the payload
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const payload: SignalPayload = {
      leadEmail: lead.email,
      leadName: lead.name ?? undefined,
      score,
      triggerReason: `Score exceeded threshold (${score} > ${this.thresholdConfig.scoreThreshold})`,
    };

    const signalId = await this.createSignal(leadId, 'score_threshold', payload);
    const results = await this.dispatchSignal(signalId);

    return { signalId, results };
  }

  /**
   * Returns the current threshold configuration.
   */
  getThresholdConfig(): ThresholdConfig {
    return { ...this.thresholdConfig };
  }
}

/**
 * Default service instance.
 */
export const signalService = new SignalService();
