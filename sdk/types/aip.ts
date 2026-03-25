import type { Did, IdRef, Timestamp } from "./common";

export type IdentitySubjectType = "owner" | "institution" | "agent";
export type IdentityStatus =
  | "proposed"
  | "created"
  | "active"
  | "restricted"
  | "frozen"
  | "revoked"
  | "retired";

export interface VerificationMethod {
  id: string;
  type: string;
  publicKeyMultibase: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

export interface IdentityRecord {
  id: Did;
  subjectType: IdentitySubjectType;
  status: IdentityStatus;
  controller: Did[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  verificationMethods: VerificationMethod[];
  serviceEndpoints?: ServiceEndpoint[];
  metadata?: Record<string, string>;
}

export interface OwnerAgentBinding {
  bindingId: IdRef;
  ownerDid: Did;
  agentDid: Did;
  institutionDid?: Did;
  relationshipType: "owns" | "controls" | "owns_and_controls" | "governs" | "delegates_to";
  status: "active" | "revoked";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CredentialEnvelope<TSubject> {
  id: IdRef;
  schemaVersion: "0.1";
  type: string[];
  issuer: Did;
  issuanceDate: Timestamp;
  expirationDate?: Timestamp;
  credentialSubject: TSubject;
  credentialStatus?: {
    id: IdRef;
    type: string;
    status: "active" | "suspended" | "expired" | "revoked";
  };
}

export interface OwnershipCredentialSubject {
  id: Did;
  ownerDid: Did;
  institutionDid?: Did;
  relationshipType: string;
  agentType: string;
  environment?: string;
}

export interface KycCredentialSubject {
  id: Did;
  kycStatus?: "passed" | "failed" | "pending";
  kybStatus?: "passed" | "failed" | "pending";
  jurisdiction: string;
  riskTier: string;
  providerRef: IdRef;
}

export interface AuthorityCredentialSubject {
  id: Did;
  authorityClass: string;
  allowedActions: string[];
  scope: Record<string, boolean>;
}

export interface PolicyCredentialSubject {
  id: Did;
  singlePaymentLimit?: string;
  dailyPaymentLimit?: string;
  allowedAssets?: string[];
  allowedCounterparties?: Did[];
  allowedProviders?: Did[];
  allowedChains?: string[];
  challengeThreshold?: string;
}

export type OwnershipCredential = CredentialEnvelope<OwnershipCredentialSubject>;
export type KycCredential = CredentialEnvelope<KycCredentialSubject>;
export type KybCredential = CredentialEnvelope<KycCredentialSubject>;
export type AuthorityCredential = CredentialEnvelope<AuthorityCredentialSubject>;
export type PolicyCredential = CredentialEnvelope<PolicyCredentialSubject>;
