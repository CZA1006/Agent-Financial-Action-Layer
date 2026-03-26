import type {
  CredentialRecord,
  Did,
  IdentityRecord,
  IdRef,
  Timestamp,
} from "../../sdk/types";

export interface AipIdentityReader {
  resolveIdentity(subjectDid: Did): Promise<IdentityRecord>;
  listIdentities(): Promise<IdentityRecord[]>;
}

export interface AipCredentialReader {
  getCredential(credentialId: IdRef): Promise<CredentialRecord>;
  listCredentials(): Promise<CredentialRecord[]>;
}

export interface AipVerificationPort {
  verifyCredential(credentialId: IdRef): Promise<boolean>;
}

export interface AipLifecyclePort {
  freezeIdentity(subjectDid: Did, updatedAt?: Timestamp): Promise<IdentityRecord>;
  revokeCredential(credentialId: IdRef, revokedAt?: Timestamp): Promise<CredentialRecord>;
}

export interface AipAdminPort
  extends AipIdentityReader,
    AipCredentialReader,
    AipVerificationPort,
    AipLifecyclePort {}
