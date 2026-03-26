import type { CredentialRecord, Did, IdentityRecord, IdRef, Timestamp } from "../../../sdk/types";

export type AipCapability =
  | "resolveIdentity"
  | "verifyCredential"
  | "freezeIdentity"
  | "revokeCredential";

export interface ResolveIdentityRequest {
  capability: "resolveIdentity";
  requestRef: string;
  input: {
    subjectDid: Did;
  };
}

export interface VerifyCredentialRequest {
  capability: "verifyCredential";
  requestRef: string;
  input: {
    credentialId: IdRef;
  };
}

export interface FreezeIdentityRequest {
  capability: "freezeIdentity";
  requestRef: string;
  input: {
    subjectDid: Did;
    updatedAt?: Timestamp;
  };
}

export interface RevokeCredentialRequest {
  capability: "revokeCredential";
  requestRef: string;
  input: {
    credentialId: IdRef;
    revokedAt?: Timestamp;
  };
}

export type AipApiRequest =
  | ResolveIdentityRequest
  | VerifyCredentialRequest
  | FreezeIdentityRequest
  | RevokeCredentialRequest;

export interface CredentialVerificationResponse {
  credentialId: IdRef;
  valid: boolean;
  credentialStatus: CredentialRecord["status"];
}

export interface AipApiError {
  code: "not-found" | "internal-error";
  message: string;
}

export interface AipApiSuccess<TData> {
  ok: true;
  capability: AipCapability;
  requestRef: string;
  statusCode: 200;
  data: TData;
}

export interface AipApiFailure {
  ok: false;
  capability: AipCapability;
  requestRef: string;
  statusCode: 404 | 500;
  error: AipApiError;
}

export type ResolveIdentityResponse = AipApiSuccess<IdentityRecord> | AipApiFailure;
export type VerifyCredentialResponse = AipApiSuccess<CredentialVerificationResponse> | AipApiFailure;
export type FreezeIdentityResponse = AipApiSuccess<IdentityRecord> | AipApiFailure;
export type RevokeCredentialResponse = AipApiSuccess<CredentialRecord> | AipApiFailure;
export type AipApiResponse =
  | AipApiSuccess<IdentityRecord | CredentialVerificationResponse | CredentialRecord>
  | AipApiFailure;
