/**
 * Console Signal Dispatcher
 * Logs signals to console for development/debugging.
 * Always available, used as fallback when no other dispatchers are configured.
 */

import type {
  ISignalDispatcher,
  Signal,
  SignalDispatchResult,
} from '../../core/interfaces/signal';

export class ConsoleSignalDispatcher implements ISignalDispatcher {
  readonly dispatcherId = 'console';

  isConfigured(): boolean {
    return true; // Always available
  }

  async dispatch(signal: Signal): Promise<SignalDispatchResult> {
    const timestamp = new Date();

    console.log('\n' + '='.repeat(60));
    console.log('SIGNAL TRIGGERED');
    console.log('='.repeat(60));
    console.log(`Type:      ${signal.type}`);
    console.log(`Lead ID:   ${signal.leadId}`);
    console.log(`Signal ID: ${signal.id}`);
    console.log('-'.repeat(60));
    console.log('Payload:');
    console.log(`  Email:   ${signal.payload.leadEmail}`);
    console.log(`  Name:    ${signal.payload.leadName ?? 'Unknown'}`);
    console.log(`  Score:   ${signal.payload.score}`);
    console.log(`  Reason:  ${signal.payload.triggerReason}`);
    console.log('-'.repeat(60));
    console.log(`Time:      ${timestamp.toISOString()}`);
    console.log('='.repeat(60) + '\n');

    return {
      success: true,
      dispatcherId: this.dispatcherId,
      externalId: `console-${timestamp.getTime()}`,
      timestamp,
    };
  }
}
