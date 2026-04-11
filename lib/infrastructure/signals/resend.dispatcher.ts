/**
 * Resend Email Dispatcher
 * Sends signal notifications via Resend email API.
 * Requires RESEND_API_KEY environment variable.
 */

import type {
  ISignalDispatcher,
  Signal,
  SignalDispatchResult,
} from '../../core/interfaces/signal';

interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

interface ResendSuccessResponse {
  id: string;
}

interface ResendErrorResponse {
  message: string;
  name: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  toEmail: string;
}

export class ResendSignalDispatcher implements ISignalDispatcher {
  readonly dispatcherId = 'resend';
  private readonly config: ResendConfig | null;
  private readonly baseUrl = 'https://api.resend.com/emails';

  constructor(config?: Partial<ResendConfig>) {
    const apiKey = config?.apiKey ?? process.env.RESEND_API_KEY;
    const fromEmail = config?.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? 'signals@hepta.io';
    const toEmail = config?.toEmail ?? process.env.RESEND_TO_EMAIL;

    if (apiKey && toEmail) {
      this.config = { apiKey, fromEmail, toEmail };
    } else {
      this.config = null;
    }
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  async dispatch(signal: Signal): Promise<SignalDispatchResult> {
    const timestamp = new Date();

    if (!this.config) {
      return {
        success: false,
        dispatcherId: this.dispatcherId,
        error: 'Resend not configured (missing API key or recipient email)',
        timestamp,
      };
    }

    try {
      const emailPayload = this.buildEmailPayload(signal);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData: ResendErrorResponse = await response.json();
        return {
          success: false,
          dispatcherId: this.dispatcherId,
          error: `Resend API error: ${errorData.message}`,
          timestamp,
        };
      }

      const data: ResendSuccessResponse = await response.json();

      return {
        success: true,
        dispatcherId: this.dispatcherId,
        externalId: data.id,
        timestamp,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        dispatcherId: this.dispatcherId,
        error: `Resend request failed: ${message}`,
        timestamp,
      };
    }
  }

  private buildEmailPayload(signal: Signal): ResendEmailPayload {
    const { leadEmail, leadName, score, triggerReason } = signal.payload;

    const subject = `High-Intent Lead Alert: ${leadName ?? leadEmail} (Score: ${score})`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px 32px;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: white;">
        New High-Intent Lead
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">

      <!-- Score Badge -->
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; background-color: #10b981; color: white; font-size: 32px; font-weight: 700; padding: 16px 32px; border-radius: 8px;">
          Score: ${score}
        </span>
      </div>

      <!-- Lead Info -->
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8; width: 120px;">Email</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9; font-weight: 500;">${leadEmail}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Name</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${leadName ?? 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #94a3b8;">Trigger</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #334155; color: #f1f5f9;">${triggerReason}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: #94a3b8;">Signal Type</td>
          <td style="padding: 12px 0; color: #f1f5f9;">${signal.type}</td>
        </tr>
      </table>

      <!-- CTA -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.hepta.io'}/dashboard"
           style="display: inline-block; background-color: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500;">
          View in Dashboard
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="padding: 16px 32px; background-color: #0f172a; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        Sent by Hepta Analytics • Signal ID: ${signal.id}
      </p>
    </div>

  </div>
</body>
</html>
    `.trim();

    return {
      from: this.config!.fromEmail,
      to: [this.config!.toEmail],
      subject,
      html,
    };
  }
}
