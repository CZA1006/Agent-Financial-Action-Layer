import { paymentFlowFixtures } from "../../sdk/fixtures";
import type { PaymentSettlementNotification } from "../../backend/afal/interfaces";
import type { SettlementNotificationHeaders } from "./notification-agent";
import { startSettlementNotificationReceiver } from "./notification-agent";

export interface PayeeCallbackAgentSummary {
  agentId: string;
  actionRef: string;
  intentStatus: string;
  settlementRef: string;
  receiptRef: string;
}

export interface PayeeCallbackAgentResult {
  summary: PayeeCallbackAgentSummary;
  notification: PaymentSettlementNotification;
  delivery: {
    headers: SettlementNotificationHeaders;
    duplicate: boolean;
  };
}

export interface RunningPayeeCallbackAgent {
  agentId: string;
  callbackUrl: string;
  waitForNotification(timeoutMs?: number): Promise<PayeeCallbackAgentResult>;
  close(): Promise<void>;
}

export async function startPayeeCallbackAgent(args?: {
  failFirstAttempts?: number;
}): Promise<RunningPayeeCallbackAgent> {
  const receiver = await startSettlementNotificationReceiver({
    failFirstAttempts: args?.failFirstAttempts,
  });
  const agentId = paymentFlowFixtures.paymentIntentCreated.payee.payeeDid;

  return {
    agentId,
    callbackUrl: receiver.url,
    waitForNotification: async (timeoutMs) => {
      const received = await receiver.waitForNotification(timeoutMs);
      if (received.notification.eventType !== "payment.settled") {
        throw new Error(
          `Payee callback agent expected payment.settled, got "${received.notification.eventType}"`
        );
      }

      return {
        summary: {
          agentId,
          actionRef: received.notification.actionRef,
          intentStatus: received.notification.intentStatus,
          settlementRef: received.notification.settlementRef,
          receiptRef: received.notification.receiptRef,
        },
        notification: received.notification,
        delivery: {
          headers: received.headers,
          duplicate: received.duplicate,
        },
      };
    },
    close: receiver.close,
  };
}
