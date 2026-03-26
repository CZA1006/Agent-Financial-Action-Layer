import type {
  ApprovalContext,
  ApprovalResult,
  AuthorizationDecision,
  ChallengeRecord,
  Did,
  IdRef,
  Mandate,
} from "../../../sdk/types";

export type AmnCapability =
  | "getMandate"
  | "evaluateAuthorization"
  | "createChallengeRecord"
  | "buildApprovalContext"
  | "recordApprovalResult"
  | "finalizeAuthorization";

export interface GetMandateRequest {
  capability: "getMandate";
  requestRef: string;
  input: {
    mandateRef: IdRef;
  };
}

export interface EvaluateAuthorizationRequest {
  capability: "evaluateAuthorization";
  requestRef: string;
  input: {
    actionRef: IdRef;
    actionType: "payment" | "resource";
    subjectDid: Did;
    mandateRef: IdRef;
    policyRef?: IdRef;
    accountRef: IdRef;
  };
}

export interface CreateChallengeRecordRequest {
  capability: "createChallengeRecord";
  requestRef: string;
  input: {
    decision: AuthorizationDecision;
  };
}

export interface BuildApprovalContextRequest {
  capability: "buildApprovalContext";
  requestRef: string;
  input: {
    challenge: ChallengeRecord;
  };
}

export interface RecordApprovalResultRequest {
  capability: "recordApprovalResult";
  requestRef: string;
  input: {
    result: ApprovalResult;
  };
}

export interface FinalizeAuthorizationRequest {
  capability: "finalizeAuthorization";
  requestRef: string;
  input: {
    priorDecision: AuthorizationDecision;
    approvalResult: ApprovalResult;
  };
}

export type AmnApiRequest =
  | GetMandateRequest
  | EvaluateAuthorizationRequest
  | CreateChallengeRecordRequest
  | BuildApprovalContextRequest
  | RecordApprovalResultRequest
  | FinalizeAuthorizationRequest;

export interface AmnApiError {
  code: "not-found" | "internal-error";
  message: string;
}

export interface AmnApiSuccess<TData> {
  ok: true;
  capability: AmnCapability;
  requestRef: string;
  statusCode: 200;
  data: TData;
}

export interface AmnApiFailure {
  ok: false;
  capability: AmnCapability;
  requestRef: string;
  statusCode: 404 | 500;
  error: AmnApiError;
}

export type AmnApiResponse =
  | AmnApiSuccess<
      Mandate | AuthorizationDecision | ChallengeRecord | ApprovalContext | ApprovalResult
    >
  | AmnApiFailure;
