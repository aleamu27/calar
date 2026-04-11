/**
 * Signal Interfaces
 * Contracts for automation signal dispatching.
 */

import type { SignalType, SignalPayload } from '../../infrastructure/db/schema';

/**
 * Signal to be dispatched.
 */
export interface Signal {
  id: string;
  leadId: string;
  type: SignalType;
  payload: SignalPayload;
}

/**
 * Result of signal dispatch attempt.
 */
export interface SignalDispatchResult {
  success: boolean;
  dispatcherId: string;
  externalId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Strategy interface for signal dispatchers.
 * Implementations handle different notification channels (email, Slack, webhook, etc.)
 */
export interface ISignalDispatcher {
  readonly dispatcherId: string;

  /**
   * Dispatches a signal notification.
   * Should never throw - returns success: false on errors.
   */
  dispatch(signal: Signal): Promise<SignalDispatchResult>;

  /**
   * Checks if this dispatcher is properly configured.
   */
  isConfigured(): boolean;
}

/**
 * Threshold configuration for automatic signal triggering.
 */
export interface ThresholdConfig {
  scoreThreshold: number;
  highIntentPages: string[];
  repeatedVisitCount: number;
  enabled: boolean;
}
