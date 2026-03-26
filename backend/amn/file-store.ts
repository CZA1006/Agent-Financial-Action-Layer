import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type {
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  ChallengeRecord,
  IdRef,
  Mandate,
} from "../../sdk/types";
import type { AmnStore } from "./store";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface AmnStoreSnapshot {
  mandates: Mandate[];
  decisions: AuthorizationDecision[];
  challenges: ChallengeRecord[];
  approvalContexts: ApprovalContext[];
  approvalResults: ApprovalResult[];
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

export interface JsonFileAmnStoreOptions {
  filePath: string;
  seed?: AmnStoreSnapshot;
}

export class JsonFileAmnStore implements AmnStore {
  constructor(private readonly options: JsonFileAmnStoreOptions) {}

  async getMandate(mandateRef: IdRef): Promise<Mandate | undefined> {
    const snapshot = await this.readSnapshot();
    const value = snapshot.mandates.find((entry) => entry.mandateId === mandateRef);
    return value ? clone(value) : undefined;
  }

  async putMandate(mandate: Mandate): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.mandates.filter((entry) => entry.mandateId !== mandate.mandateId);
    next.push(clone(mandate));
    await this.writeSnapshot({ ...snapshot, mandates: next });
  }

  async listMandates(): Promise<Mandate[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.mandates.map((entry) => clone(entry));
  }

  async getDecision(decisionRef: IdRef): Promise<AuthorizationDecision | undefined> {
    const snapshot = await this.readSnapshot();
    const value = snapshot.decisions.find((entry) => entry.decisionId === decisionRef);
    return value ? clone(value) : undefined;
  }

  async putDecision(decision: AuthorizationDecision): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.decisions.filter((entry) => entry.decisionId !== decision.decisionId);
    next.push(clone(decision));
    await this.writeSnapshot({ ...snapshot, decisions: next });
  }

  async listDecisions(): Promise<AuthorizationDecision[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.decisions.map((entry) => clone(entry));
  }

  async getChallenge(challengeRef: IdRef): Promise<ChallengeRecord | undefined> {
    const snapshot = await this.readSnapshot();
    const value = snapshot.challenges.find((entry) => entry.challengeId === challengeRef);
    return value ? clone(value) : undefined;
  }

  async putChallenge(challenge: ChallengeRecord): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.challenges.filter((entry) => entry.challengeId !== challenge.challengeId);
    next.push(clone(challenge));
    await this.writeSnapshot({ ...snapshot, challenges: next });
  }

  async listChallenges(): Promise<ChallengeRecord[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.challenges.map((entry) => clone(entry));
  }

  async getApprovalContext(approvalContextRef: IdRef): Promise<ApprovalContext | undefined> {
    const snapshot = await this.readSnapshot();
    const value = snapshot.approvalContexts.find(
      (entry) => entry.approvalContextId === approvalContextRef
    );
    return value ? clone(value) : undefined;
  }

  async putApprovalContext(context: ApprovalContext): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.approvalContexts.filter(
      (entry) => entry.approvalContextId !== context.approvalContextId
    );
    next.push(clone(context));
    await this.writeSnapshot({ ...snapshot, approvalContexts: next });
  }

  async listApprovalContexts(): Promise<ApprovalContext[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.approvalContexts.map((entry) => clone(entry));
  }

  async getApprovalResult(approvalResultRef: IdRef): Promise<ApprovalResult | undefined> {
    const snapshot = await this.readSnapshot();
    const value = snapshot.approvalResults.find(
      (entry) => entry.approvalResultId === approvalResultRef
    );
    return value ? clone(value) : undefined;
  }

  async putApprovalResult(result: ApprovalResult): Promise<void> {
    const snapshot = await this.readSnapshot();
    const next = snapshot.approvalResults.filter(
      (entry) => entry.approvalResultId !== result.approvalResultId
    );
    next.push(clone(result));
    await this.writeSnapshot({ ...snapshot, approvalResults: next });
  }

  async listApprovalResults(): Promise<ApprovalResult[]> {
    const snapshot = await this.readSnapshot();
    return snapshot.approvalResults.map((entry) => clone(entry));
  }

  private async ensureSnapshotFile(): Promise<void> {
    if (await fileExists(this.options.filePath)) {
      return;
    }

    await mkdir(dirname(this.options.filePath), { recursive: true });
    await this.writeSnapshot({
      mandates: this.options.seed?.mandates.map((entry) => clone(entry)) ?? [],
      decisions: this.options.seed?.decisions.map((entry) => clone(entry)) ?? [],
      challenges: this.options.seed?.challenges.map((entry) => clone(entry)) ?? [],
      approvalContexts:
        this.options.seed?.approvalContexts.map((entry) => clone(entry)) ?? [],
      approvalResults:
        this.options.seed?.approvalResults.map((entry) => clone(entry)) ?? [],
    });
  }

  private async readSnapshot(): Promise<AmnStoreSnapshot> {
    await this.ensureSnapshotFile();
    const contents = await readFile(this.options.filePath, "utf8");
    const parsed = JSON.parse(contents) as AmnStoreSnapshot;

    return {
      mandates: parsed.mandates.map((entry) => clone(entry)),
      decisions: parsed.decisions.map((entry) => clone(entry)),
      challenges: parsed.challenges.map((entry) => clone(entry)),
      approvalContexts: parsed.approvalContexts.map((entry) => clone(entry)),
      approvalResults: parsed.approvalResults.map((entry) => clone(entry)),
    };
  }

  private async writeSnapshot(snapshot: AmnStoreSnapshot): Promise<void> {
    await mkdir(dirname(this.options.filePath), { recursive: true });
    await writeFile(
      this.options.filePath,
      JSON.stringify(
        {
          mandates: snapshot.mandates.map((entry) => clone(entry)),
          decisions: snapshot.decisions.map((entry) => clone(entry)),
          challenges: snapshot.challenges.map((entry) => clone(entry)),
          approvalContexts: snapshot.approvalContexts.map((entry) => clone(entry)),
          approvalResults: snapshot.approvalResults.map((entry) => clone(entry)),
        },
        null,
        2
      ),
      "utf8"
    );
  }
}
