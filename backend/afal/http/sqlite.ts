import { createAfalApiServiceAdapter } from "../api";
import type { SettlementNotificationPort } from "../interfaces";
import type { PaymentRailAdapter, ResourceProviderAdapter } from "../settlement";
import {
  createSeededSqliteAfalBundle,
  getSeededSqliteAfalPaths,
  type SeededSqliteAfalPaths,
} from "../service";
import type { AfalRuntimeServiceOptions } from "../service";
import { createAfalHttpRouter } from "./router";

export interface SeededSqliteAfalHttpRouter {
  dataDir: string;
  paths: SeededSqliteAfalPaths;
  router: ReturnType<typeof createAfalHttpRouter>;
}

export function createSeededSqliteAfalHttpRouter(
  dataDir: string,
  options?: {
    notifications?: SettlementNotificationPort;
    notificationWorker?: AfalRuntimeServiceOptions["notificationWorker"];
    paymentAdapter?: PaymentRailAdapter;
    resourceAdapter?: ResourceProviderAdapter;
    operatorAuth?: {
      token: string;
      headerName?: string;
    };
    externalClientAuth?: {
      enabled?: boolean;
      maxRequestAgeMs?: number;
      clientIdHeaderName?: string;
      requestTimestampHeaderName?: string;
      signatureHeaderName?: string;
    };
  }
): SeededSqliteAfalHttpRouter {
  const bundle = createSeededSqliteAfalBundle(dataDir, options);
  const handlers = createAfalApiServiceAdapter(bundle.runtime);

  return {
    dataDir,
    paths: getSeededSqliteAfalPaths(dataDir),
    router: createAfalHttpRouter({
      handlers,
      operatorAuth: options?.operatorAuth,
      externalClientAuth:
        options?.externalClientAuth && bundle.externalClientService
          ? {
              service: bundle.externalClientService,
              clientIdHeaderName: options.externalClientAuth.clientIdHeaderName,
              requestTimestampHeaderName:
                options.externalClientAuth.requestTimestampHeaderName,
              signatureHeaderName: options.externalClientAuth.signatureHeaderName,
            }
          : undefined,
    }),
  };
}
