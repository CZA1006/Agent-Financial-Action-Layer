import { createSeededInMemoryAipService } from "../bootstrap";
import type { AipAdminPort } from "../interfaces";
import type {
  AipApiFailure,
  AipApiRequest,
  AipApiResponse,
  AipApiSuccess,
  FreezeIdentityRequest,
  FreezeIdentityResponse,
  ResolveIdentityRequest,
  ResolveIdentityResponse,
  RevokeCredentialRequest,
  RevokeCredentialResponse,
  VerifyCredentialRequest,
  VerifyCredentialResponse,
} from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AIP API error";
}

function mapFailure(
  capability: AipApiRequest["capability"],
  requestRef: string,
  error: unknown
): AipApiFailure {
  const message = toErrorMessage(error);

  if (message.includes("Unknown DID") || message.includes("Unknown credential")) {
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

export async function handleResolveIdentity(
  request: ResolveIdentityRequest,
  aip: AipAdminPort = createSeededInMemoryAipService()
): Promise<ResolveIdentityResponse> {
  try {
    const data = await aip.resolveIdentity(request.input.subjectDid);
    const response: AipApiSuccess<typeof data> = {
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

export async function handleVerifyCredential(
  request: VerifyCredentialRequest,
  aip: AipAdminPort = createSeededInMemoryAipService()
): Promise<VerifyCredentialResponse> {
  try {
    const credential = await aip.getCredential(request.input.credentialId);
    const valid = await aip.verifyCredential(request.input.credentialId);
    const data = {
      credentialId: credential.credential.id,
      valid,
      credentialStatus: credential.status,
    };
    const response: AipApiSuccess<typeof data> = {
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

export async function handleFreezeIdentity(
  request: FreezeIdentityRequest,
  aip: AipAdminPort = createSeededInMemoryAipService()
): Promise<FreezeIdentityResponse> {
  try {
    const data = await aip.freezeIdentity(request.input.subjectDid, request.input.updatedAt);
    const response: AipApiSuccess<typeof data> = {
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

export async function handleRevokeCredential(
  request: RevokeCredentialRequest,
  aip: AipAdminPort = createSeededInMemoryAipService()
): Promise<RevokeCredentialResponse> {
  try {
    const data = await aip.revokeCredential(request.input.credentialId, request.input.revokedAt);
    const response: AipApiSuccess<typeof data> = {
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

export function createAipApiHandlers(aip: AipAdminPort = createSeededInMemoryAipService()) {
  return {
    handleResolveIdentity: (request: ResolveIdentityRequest) => handleResolveIdentity(request, aip),
    handleVerifyCredential: (request: VerifyCredentialRequest) => handleVerifyCredential(request, aip),
    handleFreezeIdentity: (request: FreezeIdentityRequest) => handleFreezeIdentity(request, aip),
    handleRevokeCredential: (request: RevokeCredentialRequest) =>
      handleRevokeCredential(request, aip),
    invokeCapability: async (request: AipApiRequest): Promise<AipApiResponse> => {
      switch (request.capability) {
        case "resolveIdentity":
          return handleResolveIdentity(request, aip);
        case "verifyCredential":
          return handleVerifyCredential(request, aip);
        case "freezeIdentity":
          return handleFreezeIdentity(request, aip);
        case "revokeCredential":
          return handleRevokeCredential(request, aip);
      }
    },
  };
}
