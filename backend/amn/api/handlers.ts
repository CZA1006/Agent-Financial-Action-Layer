import { createSeededInMemoryAmnService } from "../bootstrap";
import type { AmnAdminPort } from "../interfaces";
import type {
  ApplyApprovalResultRequest,
  AmnApiFailure,
  AmnApiRequest,
  AmnApiResponse,
  AmnApiSuccess,
  BuildApprovalContextRequest,
  CreateApprovalRequestRequest,
  CreateChallengeRecordRequest,
  EvaluateAuthorizationRequest,
  FinalizeAuthorizationRequest,
  GetApprovalSessionRequest,
  GetMandateRequest,
  RecordApprovalResultRequest,
  ResumeAuthorizationSessionRequest,
} from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AMN API error";
}

function mapFailure(
  capability: AmnApiRequest["capability"],
  requestRef: string,
  error: unknown
): AmnApiFailure {
  const message = toErrorMessage(error);

  if (
    message.includes("Unknown mandateRef") ||
    message.includes("Unknown actionRef") ||
    message.includes("Unknown decisionRef") ||
    message.includes("Unknown challengeRef") ||
    message.includes("Unknown approvalContextRef") ||
    message.includes("Unknown approvalResultRef") ||
    message.includes("Unknown approvalSessionRef")
  ) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 404,
      error: {
        code: "not-found",
        message,
      },
    };
  }

  return {
    ok: false,
    capability,
    requestRef,
    statusCode: 500,
    error: {
      code: "internal-error",
      message,
    },
  };
}

export async function handleGetMandate(
  request: GetMandateRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.getMandate(request.input.mandateRef);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleEvaluateAuthorization(
  request: EvaluateAuthorizationRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.evaluateAuthorization(request.input);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleCreateChallengeRecord(
  request: CreateChallengeRecordRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.createChallengeRecord(request.input.decision);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleBuildApprovalContext(
  request: BuildApprovalContextRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.buildApprovalContext(request.input.challenge);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleRecordApprovalResult(
  request: RecordApprovalResultRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.recordApprovalResult(request.input.result);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleGetApprovalSession(
  request: GetApprovalSessionRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.getApprovalSession(request.input.approvalSessionRef);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleCreateApprovalRequest(
  request: CreateApprovalRequestRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.createApprovalRequest(request.input.priorDecision);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleApplyApprovalResult(
  request: ApplyApprovalResultRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.applyApprovalResult(request.input);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleResumeAuthorizationSession(
  request: ResumeAuthorizationSessionRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.resumeAuthorizationSession(request.input.approvalSessionRef);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export async function handleFinalizeAuthorization(
  request: FinalizeAuthorizationRequest,
  amn: AmnAdminPort = createSeededInMemoryAmnService()
) {
  try {
    const data = await amn.finalizeAuthorization(request.input);
    const response: AmnApiSuccess<typeof data> = {
      ok: true,
      capability: request.capability,
      requestRef: request.requestRef,
      statusCode: 200,
      data,
    };
    return response;
  } catch (error) {
    return mapFailure(request.capability, request.requestRef, error);
  }
}

export function createAmnApiHandlers(amn: AmnAdminPort = createSeededInMemoryAmnService()) {
  return {
    handleGetMandate: (request: GetMandateRequest) => handleGetMandate(request, amn),
    handleEvaluateAuthorization: (request: EvaluateAuthorizationRequest) =>
      handleEvaluateAuthorization(request, amn),
    handleCreateChallengeRecord: (request: CreateChallengeRecordRequest) =>
      handleCreateChallengeRecord(request, amn),
    handleBuildApprovalContext: (request: BuildApprovalContextRequest) =>
      handleBuildApprovalContext(request, amn),
    handleRecordApprovalResult: (request: RecordApprovalResultRequest) =>
      handleRecordApprovalResult(request, amn),
    handleGetApprovalSession: (request: GetApprovalSessionRequest) =>
      handleGetApprovalSession(request, amn),
    handleCreateApprovalRequest: (request: CreateApprovalRequestRequest) =>
      handleCreateApprovalRequest(request, amn),
    handleApplyApprovalResult: (request: ApplyApprovalResultRequest) =>
      handleApplyApprovalResult(request, amn),
    handleResumeAuthorizationSession: (request: ResumeAuthorizationSessionRequest) =>
      handleResumeAuthorizationSession(request, amn),
    handleFinalizeAuthorization: (request: FinalizeAuthorizationRequest) =>
      handleFinalizeAuthorization(request, amn),
    invokeCapability: async (request: AmnApiRequest): Promise<AmnApiResponse> => {
      switch (request.capability) {
        case "getMandate":
          return handleGetMandate(request, amn);
        case "evaluateAuthorization":
          return handleEvaluateAuthorization(request, amn);
        case "createChallengeRecord":
          return handleCreateChallengeRecord(request, amn);
        case "buildApprovalContext":
          return handleBuildApprovalContext(request, amn);
        case "recordApprovalResult":
          return handleRecordApprovalResult(request, amn);
        case "getApprovalSession":
          return handleGetApprovalSession(request, amn);
        case "createApprovalRequest":
          return handleCreateApprovalRequest(request, amn);
        case "applyApprovalResult":
          return handleApplyApprovalResult(request, amn);
        case "resumeAuthorizationSession":
          return handleResumeAuthorizationSession(request, amn);
        case "finalizeAuthorization":
          return handleFinalizeAuthorization(request, amn);
      }
    },
  };
}
