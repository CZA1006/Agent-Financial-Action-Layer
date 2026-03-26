import { paymentFlowFixtures, resourceFlowFixtures } from "../../sdk/fixtures";
import type { CredentialRecord, IdentityRecord } from "../../sdk/types";
import { createCredentialRecord, InMemoryAipService } from "./service";
import { InMemoryAipStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface SeededAipRecords {
  identities: IdentityRecord[];
  credentials: CredentialRecord[];
}

export function createSeededAipRecords(): SeededAipRecords {
  const identities = dedupeIdentities([
    paymentFlowFixtures.ownerDid,
    paymentFlowFixtures.institutionDid,
    paymentFlowFixtures.agentDid,
    resourceFlowFixtures.ownerDid,
    resourceFlowFixtures.institutionDid,
    resourceFlowFixtures.agentDid,
  ]);
  const credentials = dedupeCredentialRecords([
    createCredentialRecord(paymentFlowFixtures.ownershipCredential),
    createCredentialRecord(paymentFlowFixtures.kycCredential),
    createCredentialRecord(paymentFlowFixtures.kybCredential),
    createCredentialRecord(paymentFlowFixtures.authorityCredential),
    createCredentialRecord(paymentFlowFixtures.policyCredential),
    createCredentialRecord(resourceFlowFixtures.ownershipCredential),
    createCredentialRecord(resourceFlowFixtures.kycCredential),
    createCredentialRecord(resourceFlowFixtures.kybCredential),
    createCredentialRecord(resourceFlowFixtures.authorityCredential),
    createCredentialRecord(resourceFlowFixtures.policyCredential),
  ]);

  return {
    identities,
    credentials,
  };
}

export function createSeededInMemoryAipStore(): InMemoryAipStore {
  const records = createSeededAipRecords();
  return new InMemoryAipStore(records);
}

export function createSeededInMemoryAipService(): InMemoryAipService {
  return new InMemoryAipService({
    store: createSeededInMemoryAipStore(),
  });
}

function dedupeIdentities(identities: IdentityRecord[]): IdentityRecord[] {
  return Array.from(new Map(identities.map((identity) => [identity.id, identity])).values()).map((identity) =>
    clone(identity)
  );
}

function dedupeCredentialRecords(records: CredentialRecord[]): CredentialRecord[] {
  return Array.from(
    new Map(records.map((record) => [record.credential.id, record])).values()
  ).map((record) => clone(record));
}
