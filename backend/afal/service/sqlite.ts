import { join } from "node:path";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  JsonFileAipStore,
  InMemoryAipService,
  createSeededAipRecords,
} from "../../aip";
import {
  InMemoryAtsService,
  SqliteAtsStore,
  createSeededAtsRecords,
} from "../../ats";
import {
  InMemoryAmnService,
  SqliteAmnStore,
  createSeededAmnRecords,
} from "../../amn";
import type {
  AfalOrchestrationPorts,
  PaymentFlowOrchestrator,
  ResourceFlowOrchestrator,
  SettlementNotificationPort,
  TrustedSurfacePort,
} from "../interfaces";
import { SqliteAfalAdminAuditStore } from "../admin-audit";
import { createMockPaymentFlowOrchestrator, createMockResourceFlowOrchestrator } from "../mock";
import { NoopSettlementNotificationPort } from "../notifications";
import { AfalIntentStateService, SqliteAfalIntentStore, createSeededAfalIntentTemplateResolver } from "../state";
import {
  AfalSettlementService,
  createSeededAfalSettlementTemplateResolver,
  type PaymentRailAdapter,
  type ResourceProviderAdapter,
} from "../settlement";
import { JsonFileAfalSettlementStore } from "../settlement/file-store";
import { AfalOutputService, createSeededAfalOutputTemplateResolver } from "../outputs";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { AfalRuntimeService, type AfalRuntimeServiceOptions } from "./runtime";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class SqliteIntegrationTrustedSurfacePort implements TrustedSurfacePort {
  async requestApproval(context: { actionRef: string; challengeRef: string }): Promise<any> {
    const fixtures =
      context.actionRef === paymentFlowFixtures.paymentIntentCreated.intentId
        ? paymentFlowFixtures
        : resourceFlowFixtures;

    return {
      ...clone(fixtures.approvalResult),
      challengeRef: context.challengeRef,
      actionRef: context.actionRef,
    };
  }
}

export interface SeededSqliteAfalPaths {
  aip: string;
  integrationDb: string;
  ats: string;
  amn: string;
  afalIntents: string;
  afalNotificationOutbox: string;
  afalSettlement: string;
  afalOutputs: string;
  afalAdminAudit: string;
}

export function getSeededSqliteAfalPaths(dataDir: string): SeededSqliteAfalPaths {
  const integrationDb = join(dataDir, "afal-integration.sqlite");
  return {
    aip: join(dataDir, "aip-store.json"),
    integrationDb,
    ats: integrationDb,
    amn: integrationDb,
    afalIntents: integrationDb,
    afalNotificationOutbox: integrationDb,
    afalSettlement: join(dataDir, "afal-settlement.json"),
    afalOutputs: join(dataDir, "afal-outputs.json"),
    afalAdminAudit: integrationDb,
  };
}

export interface SeededSqliteAfalBundle {
  paths: SeededSqliteAfalPaths;
  ports: AfalOrchestrationPorts;
  runtime: AfalRuntimeService;
  paymentOrchestrator: PaymentFlowOrchestrator;
  resourceOrchestrator: ResourceFlowOrchestrator;
}

export function createSeededSqliteAfalBundle(
  dataDir: string,
  options?: {
    notifications?: SettlementNotificationPort;
    notificationWorker?: AfalRuntimeServiceOptions["notificationWorker"];
    paymentAdapter?: PaymentRailAdapter;
    resourceAdapter?: ResourceProviderAdapter;
  }
): SeededSqliteAfalBundle {
  const paths = getSeededSqliteAfalPaths(dataDir);
  const aipSeed = createSeededAipRecords();
  const atsSeed = createSeededAtsRecords();
  const amnSeed = createSeededAmnRecords();

  const aip = new InMemoryAipService({
    store: new JsonFileAipStore({
      filePath: paths.aip,
      seed: aipSeed,
    }),
  });
  const ats = new InMemoryAtsService({
    store: new SqliteAtsStore({
      filePath: paths.ats,
      seed: atsSeed,
    }),
  });
  const amn = new InMemoryAmnService({
    store: new SqliteAmnStore({
      filePath: paths.amn,
      seed: {
        mandates: amnSeed.mandates,
        decisions: [],
        challenges: [],
        approvalContexts: [],
        approvalResults: [],
        approvalSessions: [],
      },
    }),
    initialDecisionTemplates: amnSeed.initialDecisionTemplates,
    finalDecisionTemplates: amnSeed.finalDecisionTemplates,
    challengeTemplates: amnSeed.challengeTemplates,
    approvalContextTemplates: amnSeed.approvalContextTemplates,
    approvalResultTemplates: amnSeed.approvalResultTemplates,
  });
  const intents = new AfalIntentStateService({
    store: new SqliteAfalIntentStore({
      filePath: paths.afalIntents,
      seed: {
        paymentIntents: [],
        resourceIntents: [],
        pendingExecutions: [],
      },
    }),
    templateResolver: createSeededAfalIntentTemplateResolver(),
  });
  const settlement = new AfalSettlementService({
    store: new JsonFileAfalSettlementStore({
      filePath: paths.afalSettlement,
      seed: {
        settlements: [],
        usageConfirmations: [],
      },
    }),
    templateResolver: createSeededAfalSettlementTemplateResolver(),
    paymentAdapter: options?.paymentAdapter,
    resourceAdapter: options?.resourceAdapter,
  });
  const outputs = new AfalOutputService({
    store: new JsonFileAfalOutputStore({
      filePath: paths.afalOutputs,
      seed: {
        receipts: [],
        capabilityResponses: [],
      },
    }),
    templateResolver: createSeededAfalOutputTemplateResolver(),
  });

  const ports: AfalOrchestrationPorts = {
    aip,
    ats,
    amn,
    intents,
    trustedSurface: new SqliteIntegrationTrustedSurfacePort(),
    paymentSettlement: settlement,
    resourceSettlement: settlement,
    receipts: outputs,
    capabilityResponses: outputs,
    notifications: options?.notifications ?? new NoopSettlementNotificationPort(),
  };

  const paymentOrchestrator = createMockPaymentFlowOrchestrator(ports);
  const resourceOrchestrator = createMockResourceFlowOrchestrator(ports);
  const runtime = new AfalRuntimeService({
    ports,
    paymentOrchestrator,
    resourceOrchestrator,
    notificationWorker: options?.notificationWorker,
    adminAuditStore: new SqliteAfalAdminAuditStore({
      filePath: paths.afalAdminAudit,
      seed: {
        entries: [],
      },
    }),
  });

  return {
    paths,
    ports,
    runtime,
    paymentOrchestrator,
    resourceOrchestrator,
  };
}

export function createSeededSqliteAfalRuntimeService(
  dataDir: string,
  options?: {
    notifications?: SettlementNotificationPort;
    notificationWorker?: AfalRuntimeServiceOptions["notificationWorker"];
    paymentAdapter?: PaymentRailAdapter;
    resourceAdapter?: ResourceProviderAdapter;
  }
): AfalRuntimeService {
  return createSeededSqliteAfalBundle(dataDir, options).runtime;
}
