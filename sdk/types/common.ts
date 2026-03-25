export type Did = `did:afal:${string}:${string}`;
export type IdRef = string;
export type Timestamp = string;
export type DecimalString = string;

export type AuthorizationResult =
  | "approved"
  | "rejected"
  | "challenge-required"
  | "pending-approval"
  | "suspended"
  | "expired";

export type ChallengeState =
  | "not-required"
  | "required"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export type CommonActionStatus =
  | "created"
  | "evaluating"
  | "challenge-required"
  | "pending-approval"
  | "approved"
  | "rejected"
  | "executing"
  | "executed"
  | "settled"
  | "failed"
  | "expired"
  | "cancelled";

export interface AgentActorRef {
  agentDid: Did;
  accountId: IdRef;
}

export interface CounterpartyRef {
  payeeDid: Did;
  settlementAddress?: string;
}

export interface ProviderRef {
  providerId: string;
  providerDid: Did;
}
