import type {
  ApprovalContext,
  ApprovalResult,
  ApprovalSession,
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
  | "finalizeAuthorization"
  | "getApprovalSession"
  | "createApprovalRequest"
  | "applyApprovalResult"
  | "resumeAuthorizationSession";

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

export interface GetApprovalSessionRequest {
  capability: "getApprovalSession";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
  };
}

export interface CreateApprovalRequestRequest {
  capability: "createApprovalRequest";
  requestRef: string;
  input: {
    priorDecision: AuthorizationDecision;
  };
}

export interface ApplyApprovalResultRequest {
  capability: "applyApprovalResult";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
    result: ApprovalResult;
  };
}

export interface ResumeAuthorizationSessionRequest {
  capability: "resumeAuthorizationSession";
  requestRef: string;
  input: {
    approvalSessionRef: IdRef;
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
  | GetApprovalSessionRequest
  | CreateApprovalRequestRequest
  | ApplyApprovalResultRequest
  | ResumeAuthorizationSessionRequest
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
      | ApprovalSession
      | {
          challenge: ChallengeRecord;
          approvalContext: ApprovalContext;
          approvalSession: ApprovalSession;
        }
      | {
          approvalResult: ApprovalResult;
          approvalSession: ApprovalSession;
          challenge: ChallengeRecord;
        }
      | {
          finalDecision: AuthorizationDecision;
          approvalResult: ApprovalResult;
          approvalSession: ApprovalSession;
          challenge: ChallengeRecord;
        }
    >
  | AmnApiFailure;
