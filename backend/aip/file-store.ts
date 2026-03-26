import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { CredentialRecord, Did, IdentityRecord, IdRef } from "../../sdk/types";
import type { AipStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AipStoreSnapshot {
  identities: IdentityRecord[];
  credentials: CredentialRecord[];
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export interface JsonFileAipStoreOptions {
  filePath: string;
  seed?: AipStoreSnapshot;
}

export class JsonFileAipStore implements AipStore {
  constructor(private readonly options: JsonFileAipStoreOptions) {}

  async getIdentity(subjectDid: Did): Promise<IdentityRecord | undefined> {
    const snapshot = await this.readSnapshot();
    const identity = snapshot.identities.find((entry) => entry.id === subjectDid);
    return identity ? clone(identity) : undefined;
  }

  async putIdentity(identity: IdentityRecord): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.identities.filter((entry) => entry.id !== identity.id);
    next.push(clone(identity));
    await this.writeSnapshot({
      ...snapshot,
      identities: next,
    });
  }

  async listIdentities(): Promise<IdentityRecord[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.identities.map((identity) => clone(identity));
  }

  async getCredential(credentialId: IdRef): Promise<CredentialRecord | undefined> {
    const snapshot = await this.readSnapshot();
    const record = snapshot.credentials.find((entry) => entry.credential.id === credentialId);
    return record ? clone(record) : undefined;
  }

  async putCredential(record: CredentialRecord): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.credentials.filter(
      (entry) => entry.credential.id !== record.credential.id
    );
    next.push(clone(record));
    await this.writeSnapshot({
      ...snapshot,
      credentials: next,
    });
  }

  async listCredentials(): Promise<CredentialRecord[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.credentials.map((record) => clone(record));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      identities: this.options.seed?.identities.map((identity) => clone(identity)) ?? [],
      credentials: this.options.seed?.credentials.map((record) => clone(record)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AipStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AipStoreSnapshot;

    return {
      identities: parsed.identities.map((identity) => clone(identity)),
      credentials: parsed.credentials.map((record) => clone(record)),
    };
  }

  private async writeSnapshot(snapshot: AipStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          identities: snapshot.identities.map((identity) => clone(identity)),
          credentials: snapshot.credentials.map((record) => clone(record)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
