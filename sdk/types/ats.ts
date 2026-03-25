import type { DecimalString, Did, IdRef, Timestamp } from "./common";

export type AccountType = "treasury" | "operating" | "settlement";
export type AccountStatus =
  | "proposed"
  | "pending-funding"
  | "active"
  | "restricted"
  | "frozen"
  | "closed"
  | "revoked";

export interface FreezeState {
  isFrozen: boolean;
  reasonCode?: string | null;
  frozenBy?: Did;
  frozenAt?: Timestamp | null;
  reviewRef?: IdRef;
}

export interface AccountRecord {
  accountId: IdRef;
  schemaVersion: "0.1";
  accountType: AccountType;
  status: AccountStatus;
  ownerDid?: Did;
  institutionDid?: Did;
  agentDid?: Did;
  parentAccountRef?: IdRef;
  chain?: string;
  settlementAsset?: string;
  accountAddress?: string;
  smartAccount?: {
    standard: string;
    factoryRef: IdRef;
  };
  freezeState?: FreezeState;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MonetaryBudget {
  budgetId: IdRef;
  budgetType: "monetary";
  subjectDid: Did;
  accountRef: IdRef;
  asset: string;
  period: string;
  limitAmount: DecimalString;
  consumedAmount: DecimalString;
  availableAmount: DecimalString;
  status: "active" | "restricted" | "exhausted" | "revoked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResourceBudget {
  budgetId: IdRef;
  budgetType: "resource";
  subjectDid: Did;
  accountRef: IdRef;
  resourceClass: string;
  resourceUnit: string;
  period: string;
  limitQuantity: number;
  consumedQuantity: number;
  availableQuantity: number;
  maxSpendAmount?: DecimalString;
  pricingAsset?: string;
  status: "active" | "restricted" | "exhausted" | "revoked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ResourceQuota {
  quotaId: IdRef;
  subjectDid: Did;
  providerId: string;
  providerDid: Did;
  resourceClass: string;
  resourceUnit: string;
  period: string;
  maxQuantity: number;
  usedQuantity: number;
  status: "active" | "restricted" | "exhausted" | "revoked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReplenishmentPolicy {
  replenishmentPolicyId: IdRef;
  budgetRef: IdRef;
  mode: "manual-only" | "threshold-auto" | "policy-gated-auto" | "disabled";
  triggerThreshold?: number;
  topUpAmount?: number;
  requiresChallenge: boolean;
  status: "active" | "disabled" | "revoked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
