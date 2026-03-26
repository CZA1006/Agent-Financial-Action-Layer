import type {
  AccountRecord,
  Did,
  IdRef,
  MonetaryBudget,
  MonetaryReservation,
  ResourceBudget,
  ResourceReservation,
  ResourceQuota,
  Timestamp,
} from "../../../sdk/types";

export type AtsCapability =
  | "getAccountState"
  | "getMonetaryBudgetState"
  | "getResourceBudgetState"
  | "getResourceQuotaState"
  | "freezeAccount"
  | "reserveMonetaryBudget"
  | "settleMonetaryReservation"
  | "releaseMonetaryReservation"
  | "consumeMonetaryBudget"
  | "reserveResourceCapacity"
  | "settleResourceReservation"
  | "releaseResourceReservation"
  | "consumeResourceBudget"
  | "consumeResourceQuota";

export interface GetAccountStateRequest {
  capability: "getAccountState";
  requestRef: string;
  input: {
    accountRef: IdRef;
  };
}

export interface GetMonetaryBudgetStateRequest {
  capability: "getMonetaryBudgetState";
  requestRef: string;
  input: {
    budgetRef: IdRef;
  };
}

export interface GetResourceBudgetStateRequest {
  capability: "getResourceBudgetState";
  requestRef: string;
  input: {
    budgetRef: IdRef;
  };
}

export interface GetResourceQuotaStateRequest {
  capability: "getResourceQuotaState";
  requestRef: string;
  input: {
    quotaRef: IdRef;
  };
}

export interface FreezeAccountRequest {
  capability: "freezeAccount";
  requestRef: string;
  input: {
    accountRef: IdRef;
    reasonCode?: string;
    frozenBy?: Did;
    frozenAt?: Timestamp;
  };
}

export interface ConsumeMonetaryBudgetRequest {
  capability: "consumeMonetaryBudget";
  requestRef: string;
  input: {
    budgetRef: IdRef;
    amount: string;
    updatedAt?: Timestamp;
  };
}

export interface ReserveMonetaryBudgetRequest {
  capability: "reserveMonetaryBudget";
  requestRef: string;
  input: {
    reservationId: IdRef;
    budgetRef: IdRef;
    accountRef: IdRef;
    actionRef: IdRef;
    amount: string;
    createdAt?: Timestamp;
  };
}

export interface SettleMonetaryReservationRequest {
  capability: "settleMonetaryReservation";
  requestRef: string;
  input: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  };
}

export interface ReleaseMonetaryReservationRequest {
  capability: "releaseMonetaryReservation";
  requestRef: string;
  input: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  };
}

export interface ConsumeResourceBudgetRequest {
  capability: "consumeResourceBudget";
  requestRef: string;
  input: {
    budgetRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  };
}

export interface ReserveResourceCapacityRequest {
  capability: "reserveResourceCapacity";
  requestRef: string;
  input: {
    reservationId: IdRef;
    budgetRef: IdRef;
    quotaRef: IdRef;
    accountRef: IdRef;
    actionRef: IdRef;
    quantity: number;
    createdAt?: Timestamp;
  };
}

export interface SettleResourceReservationRequest {
  capability: "settleResourceReservation";
  requestRef: string;
  input: {
    reservationRef: IdRef;
    settledAt?: Timestamp;
  };
}

export interface ReleaseResourceReservationRequest {
  capability: "releaseResourceReservation";
  requestRef: string;
  input: {
    reservationRef: IdRef;
    releasedAt?: Timestamp;
    reasonCode?: string;
  };
}

export interface ConsumeResourceQuotaRequest {
  capability: "consumeResourceQuota";
  requestRef: string;
  input: {
    quotaRef: IdRef;
    quantity: number;
    updatedAt?: Timestamp;
  };
}

export type AtsApiRequest =
  | GetAccountStateRequest
  | GetMonetaryBudgetStateRequest
  | GetResourceBudgetStateRequest
  | GetResourceQuotaStateRequest
  | FreezeAccountRequest
  | ReserveMonetaryBudgetRequest
  | SettleMonetaryReservationRequest
  | ReleaseMonetaryReservationRequest
  | ConsumeMonetaryBudgetRequest
  | ReserveResourceCapacityRequest
  | SettleResourceReservationRequest
  | ReleaseResourceReservationRequest
  | ConsumeResourceBudgetRequest
  | ConsumeResourceQuotaRequest;

export interface AtsApiError {
  code: "not-found" | "budget-exceeded" | "internal-error";
  message: string;
}

export interface AtsApiSuccess<TData> {
  ok: true;
  capability: AtsCapability;
  requestRef: string;
  statusCode: 200;
  data: TData;
}

export interface AtsApiFailure {
  ok: false;
  capability: AtsCapability;
  requestRef: string;
  statusCode: 404 | 409 | 500;
  error: AtsApiError;
}

export type AtsApiResponse =
  | AtsApiSuccess<
      | AccountRecord
      | MonetaryBudget
      | ResourceBudget
      | ResourceQuota
      | { reservation: MonetaryReservation; budget: MonetaryBudget }
      | { reservation: ResourceReservation; budget: ResourceBudget; quota: ResourceQuota }
    >
  | AtsApiFailure;
