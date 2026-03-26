import type {
  CredentialEnvelope,
  CredentialLifecycleStatus,
  CredentialRecord,
  Did,
  IdentityRecord,
  IdentityStatus,
  IdRef,
  Timestamp,
} from "../../sdk/types";
import type { AipPort } from "../afal/interfaces";
import type { AipAdminPort } from "./interfaces";
import { InMemoryAipStore, type AipStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertFound<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }

  return value;
}

function isCredentialExpired(credential: CredentialEnvelope<unknown>, now: Date): boolean {
  return Boolean(credential.expirationDate && Date.parse(credential.expirationDate) <= now.getTime());
}

function isIdentityUsable(status: IdentityStatus): boolean {
  return status !== "frozen" && status !== "revoked" && status !== "retired";
}

export interface InMemoryAipServiceOptions {
  identities?: IdentityRecord[];
  credentials?: CredentialRecord[];
  store?: AipStore;
}

export class InMemoryAipService implements AipPort, AipAdminPort {
  private readonly store: AipStore;

  constructor(options: InMemoryAipServiceOptions = {}) {
    this.store =
      options.store ??
      new InMemoryAipStore({
        identities: options.identities,
        credentials: options.credentials,
      });
  }

  async resolveIdentity(subjectDid: Did): Promise<IdentityRecord> {
    return clone(assertFound(await this.store.getIdentity(subjectDid), `Unknown DID "${subjectDid}"`));
  }

  async getCredential(credentialId: IdRef): Promise<CredentialRecord> {
    return clone(assertFound(await this.store.getCredential(credentialId), `Unknown credential "${credentialId}"`));
  }

  async verifyCredential(credentialId: IdRef): Promise<boolean> {
    const record = await this.store.getCredential(credentialId);
    if (!record) {
      return false;
    }

    const now = new Date();
    if (record.status === "revoked" || record.status === "suspended") {
      return false;
    }

    if (record.status === "expired" || isCredentialExpired(record.credential, now)) {
      return false;
    }

    const subject = record.credential.credentialSubject as { id?: Did } | undefined;
    const subjectDid = subject?.id;
    if (!subjectDid) {
      return false;
    }

    const subjectIdentity = await this.store.getIdentity(subjectDid);
    if (!subjectIdentity) {
      return false;
    }

    return isIdentityUsable(subjectIdentity.status);
  }

  async freezeIdentity(subjectDid: Did, updatedAt: Timestamp = new Date().toISOString()): Promise<IdentityRecord> {
    const identity = assertFound(await this.store.getIdentity(subjectDid), `Unknown DID "${subjectDid}"`);
    const updated: IdentityRecord = {
      ...identity,
      status: "frozen",
      updatedAt,
    };
    await this.store.putIdentity(updated);
    return clone(updated);
  }

  async revokeCredential(
    credentialId: IdRef,
    revokedAt: Timestamp = new Date().toISOString()
  ): Promise<CredentialRecord> {
    const record = assertFound(await this.store.getCredential(credentialId), `Unknown credential "${credentialId}"`);
    const updated: CredentialRecord = {
      ...record,
      status: "revoked",
      updatedAt: revokedAt,
      revokedAt,
      credential: {
        ...record.credential,
        credentialStatus: {
          id: record.credential.credentialStatus?.id ?? `${record.credential.id}#status`,
          type: record.credential.credentialStatus?.type ?? "StatusList2021Entry",
          status: "revoked",
        },
      },
    };
    await this.store.putCredential(updated);
    return clone(updated);
  }

  async listIdentities(): Promise<IdentityRecord[]> {
    return this.store.listIdentities();
  }

  async listCredentials(): Promise<CredentialRecord[]> {
    return this.store.listCredentials();
  }
}

export function createCredentialRecord<TSubject>(
  credential: CredentialEnvelope<TSubject>,
  status: CredentialLifecycleStatus = "active",
  updatedAt: Timestamp = credential.issuanceDate
): CredentialRecord<TSubject> {
  return {
    credential: clone(credential),
    status,
    updatedAt,
  };
}
