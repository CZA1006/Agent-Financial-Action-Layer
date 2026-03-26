import type { CredentialRecord, Did, IdentityRecord, IdRef } from "../../sdk/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface AipStore {
  getIdentity(subjectDid: Did): Promise<IdentityRecord | undefined>;
  putIdentity(identity: IdentityRecord): Promise<void>;
  listIdentities(): Promise<IdentityRecord[]>;
  getCredential(credentialId: IdRef): Promise<CredentialRecord | undefined>;
  putCredential(record: CredentialRecord): Promise<void>;
  listCredentials(): Promise<CredentialRecord[]>;
}

export interface InMemoryAipStoreOptions {
  identities?: IdentityRecord[];
  credentials?: CredentialRecord[];
}

export class InMemoryAipStore implements AipStore {
  private readonly identities = new Map<Did, IdentityRecord>();
  private readonly credentials = new Map<IdRef, CredentialRecord>();

  constructor(options: InMemoryAipStoreOptions = {}) {
    for (const identity of options.identities ?? []) {
      this.identities.set(identity.id, clone(identity));
    }

    for (const record of options.credentials ?? []) {
      this.credentials.set(record.credential.id, clone(record));
    }
  }

  async getIdentity(subjectDid: Did): Promise<IdentityRecord | undefined> {
    const identity = this.identities.get(subjectDid);
    return identity ? clone(identity) : undefined;
  }

  async putIdentity(identity: IdentityRecord): Promise<void> {
    this.identities.set(identity.id, clone(identity));
  }

  async listIdentities(): Promise<IdentityRecord[]> {
    return Array.from(this.identities.values()).map((identity) => clone(identity));
  }

  async getCredential(credentialId: IdRef): Promise<CredentialRecord | undefined> {
    const record = this.credentials.get(credentialId);
    return record ? clone(record) : undefined;
  }

  async putCredential(record: CredentialRecord): Promise<void> {
    this.credentials.set(record.credential.id, clone(record));
  }

  async listCredentials(): Promise<CredentialRecord[]> {
    return Array.from(this.credentials.values()).map((record) => clone(record));
  }
}
