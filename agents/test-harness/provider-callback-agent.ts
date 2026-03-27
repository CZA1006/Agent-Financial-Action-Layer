import { resourceFlowFixtures } from "../../sdk/fixtures";
import type { ResourceSettlementNotification } from "../../backend/afal/interfaces";
import type { SettlementNotificationHeaders } from "./notification-agent";
import { startSettlementNotificationReceiver } from "./notification-agent";

export interface ProviderCallbackAgentSummary {
  agentId: string;
  actionRef: string;
  intentStatus: string;
  usageReceiptRef: string;
  settlementRef: string;
  receiptRef: string;
}

export interface ProviderCallbackAgentResult {
  summary: ProviderCallbackAgentSummary;
  notification: ResourceSettlementNotification;
  delivery: {
    headers: SettlementNotificationHeaders;
    duplicate: boolean;
  };
}

export interface RunningProviderCallbackAgent {
  agentId: string;
  callbackUrl: string;
  waitForNotification(timeoutMs?: number): Promise<ProviderCallbackAgentResult>;
  close(): Promise<void>;
}

export async function startProviderCallbackAgent(args?: {
  failFirstAttempts?: number;
}): Promise<RunningProviderCallbackAgent> {
  const receiver = await startSettlementNotificationReceiver({
    failFirstAttempts: args?.failFirstAttempts,
  });
  const agentId = resourceFlowFixtures.resourceIntentCreated.provider.providerDid;

  return {
    agentId,
    callbackUrl: receiver.url,
    waitForNotification: async (timeoutMs) => {
      const received = await receiver.waitForNotification(timeoutMs);
      if (received.notification.eventType !== "resource.settled") {
        throw new Error(
          `Provider callback agent expected resource.settled, got "${received.notification.eventType}"`
        );
      }

      return {
        summary: {
          agentId,
          actionRef: received.notification.actionRef,
          intentStatus: received.notification.intentStatus,
          usageReceiptRef: received.notification.usageReceiptRef,
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
