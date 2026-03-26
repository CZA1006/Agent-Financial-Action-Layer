import { join } from "node:path";

import { paymentFlowFixtures, resourceFlowFixtures } from "../../../sdk/fixtures";
import {
  JsonFileAipStore,
  InMemoryAipService,
  createSeededAipRecords,
} from "../../aip";
import {
  JsonFileAtsStore,
  InMemoryAtsService,
  createSeededAtsRecords,
} from "../../ats";
import {
  JsonFileAmnStore,
  InMemoryAmnService,
  createSeededAmnRecords,
} from "../../amn";
import type {
  AfalOrchestrationPorts,
  PaymentFlowOrchestrator,
  ResourceFlowOrchestrator,
  TrustedSurfacePort,
} from "../interfaces";
import { createMockPaymentFlowOrchestrator, createMockResourceFlowOrchestrator } from "../mock";
import { AfalIntentStateService, createSeededAfalIntentTemplateResolver } from "../state";
import { JsonFileAfalIntentStore } from "../state/file-store";
import {
  AfalSettlementService,
  createSeededAfalSettlementTemplateResolver,
} from "../settlement";
import { JsonFileAfalSettlementStore } from "../settlement/file-store";
import { AfalOutputService, createSeededAfalOutputTemplateResolver } from "../outputs";
import { JsonFileAfalOutputStore } from "../outputs/file-store";
import { AfalRuntimeService } from "./runtime";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class DurableTrustedSurfacePort implements TrustedSurfacePort {
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

export interface SeededDurableAfalPaths {
  aip: string;
  ats: string;
  amn: string;
  afalIntents: string;
  afalSettlement: string;
  afalOutputs: string;
}

export function getSeededDurableAfalPaths(dataDir: string): SeededDurableAfalPaths {
  return {
    aip: join(dataDir, "aip-store.json"),
    ats: join(dataDir, "ats-store.json"),
    amn: join(dataDir, "amn-store.json"),
    afalIntents: join(dataDir, "afal-intents.json"),
    afalSettlement: join(dataDir, "afal-settlement.json"),
    afalOutputs: join(dataDir, "afal-outputs.json"),
  };
}

export interface SeededDurableAfalBundle {
  paths: SeededDurableAfalPaths;
  ports: AfalOrchestrationPorts;
  runtime: AfalRuntimeService;
  paymentOrchestrator: PaymentFlowOrchestrator;
  resourceOrchestrator: ResourceFlowOrchestrator;
}

export function createSeededDurableAfalBundle(dataDir: string): SeededDurableAfalBundle {
  const paths = getSeededDurableAfalPaths(dataDir);
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
    store: new JsonFileAtsStore({
      filePath: paths.ats,
      seed: atsSeed,
    }),
  });
  const amn = new InMemoryAmnService({
    store: new JsonFileAmnStore({
      filePath: paths.amn,
      seed: {
        mandates: amnSeed.mandates,
        decisions: [],
        challenges: [],
        approvalContexts: [],
        approvalResults: [],
      },
    }),
    initialDecisionTemplates: amnSeed.initialDecisionTemplates,
    finalDecisionTemplates: amnSeed.finalDecisionTemplates,
    challengeTemplates: amnSeed.challengeTemplates,
    approvalContextTemplates: amnSeed.approvalContextTemplates,
    approvalResultTemplates: amnSeed.approvalResultTemplates,
  });
  const intents = new AfalIntentStateService({
    store: new JsonFileAfalIntentStore({
      filePath: paths.afalIntents,
      seed: {
        paymentIntents: [],
        resourceIntents: [],
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
    trustedSurface: new DurableTrustedSurfacePort(),
    paymentSettlement: settlement,
    resourceSettlement: settlement,
    receipts: outputs,
    capabilityResponses: outputs,
  };

  const paymentOrchestrator = createMockPaymentFlowOrchestrator(ports);
  const resourceOrchestrator = createMockResourceFlowOrchestrator(ports);
  const runtime = new AfalRuntimeService({
    ports,
    paymentOrchestrator,
    resourceOrchestrator,
  });

  return {
    paths,
    ports,
    runtime,
    paymentOrchestrator,
    resourceOrchestrator,
  };
}

export function createSeededDurableAfalRuntimeService(dataDir: string): AfalRuntimeService {
  return createSeededDurableAfalBundle(dataDir).runtime;
}
