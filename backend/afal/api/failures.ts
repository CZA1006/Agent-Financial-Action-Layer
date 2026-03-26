import type {
  ApplyApprovalResultRequest,
  GetApprovalSessionRequest,
  RequestPaymentApprovalRequest,
  PaymentCapabilityRequest,
  ResumeApprovedActionRequest,
  RequestResourceApprovalRequest,
  ResumeApprovalSessionRequest,
  ResourceCapabilityRequest,
  AfalApiFailure,
} from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AFAL API error";
}

export function mapAfalFailure(
  capability:
    | PaymentCapabilityRequest["capability"]
    | RequestPaymentApprovalRequest["capability"]
    | ResourceCapabilityRequest["capability"]
    | RequestResourceApprovalRequest["capability"]
    | GetApprovalSessionRequest["capability"]
    | ApplyApprovalResultRequest["capability"]
    | ResumeApprovalSessionRequest["capability"]
    | ResumeApprovedActionRequest["capability"],
  requestRef: string,
  error: unknown
): AfalApiFailure {
  const message = toErrorMessage(error);

  if (
    message.includes("Unknown DID") ||
    message.includes("Unknown accountRef") ||
    message.includes("Unknown resource budget") ||
    message.includes("Unknown resource quota") ||
    message.includes("Unknown monetary budget") ||
    message.includes("Unknown actionRef") ||
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

  if (message.includes("verified") && message.includes("credential")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 403,
      error: {
        code: "credential-verification-failed",
        message,
      },
    };
  }

  if (message.includes('authorization result was "expired"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 409,
      error: {
        code: "authorization-expired",
        message,
      },
    };
  }

  if (message.includes('authorization result was "rejected"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 403,
      error: {
        code: "authorization-rejected",
        message,
      },
    };
  }

  if (message.includes('authorization result was "cancelled"')) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 409,
      error: {
        code: "authorization-cancelled",
        message,
      },
    };
  }

  if (message.includes("Provider usage confirmation failed")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 502,
      error: {
        code: "provider-failure",
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
