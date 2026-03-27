import { createAfalApiServiceAdapter } from "../api";
import type { SettlementNotificationPort } from "../interfaces";
import type { PaymentRailAdapter, ResourceProviderAdapter } from "../settlement";
import {
  createSeededSqliteAfalRuntimeService,
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
  }
): SeededSqliteAfalHttpRouter {
  const runtime = createSeededSqliteAfalRuntimeService(dataDir, options);
  const handlers = createAfalApiServiceAdapter(runtime);

  return {
    dataDir,
    paths: getSeededSqliteAfalPaths(dataDir),
    router: createAfalHttpRouter({ handlers, operatorAuth: options?.operatorAuth }),
  };
}
