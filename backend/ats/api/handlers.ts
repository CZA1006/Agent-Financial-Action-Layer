import { createSeededInMemoryAtsService } from "../bootstrap";
import type { AtsAdminPort } from "../interfaces";
import type {
  AtsApiFailure,
  AtsApiRequest,
  AtsApiResponse,
  AtsApiSuccess,
  ConsumeMonetaryBudgetRequest,
  ConsumeResourceBudgetRequest,
  ConsumeResourceQuotaRequest,
  FreezeAccountRequest,
  GetAccountStateRequest,
  GetMonetaryBudgetStateRequest,
  GetResourceBudgetStateRequest,
  GetResourceQuotaStateRequest,
  ReleaseMonetaryReservationRequest,
  ReleaseResourceReservationRequest,
  ReserveMonetaryBudgetRequest,
  ReserveResourceCapacityRequest,
  SettleMonetaryReservationRequest,
  SettleResourceReservationRequest,
} from "./types";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ATS API error";
}

function mapFailure(
  capability: AtsApiRequest["capability"],
  requestRef: string,
  error: unknown
): AtsApiFailure {
  const message = toErrorMessage(error);

  if (
    message.includes("Unknown accountRef") ||
    message.includes("Unknown monetary budget") ||
    message.includes("Unknown resource budget") ||
    message.includes("Unknown resource quota")
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

  if (message.includes("budget exceeded") || message.includes("quota exceeded")) {
    return {
      ok: false,
      capability,
      requestRef,
      statusCode: 409,
      error: {
        code: "budget-exceeded",
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

export async function handleGetAccountState(
  request: GetAccountStateRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.getAccountState(request.input.accountRef);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleGetMonetaryBudgetState(
  request: GetMonetaryBudgetStateRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.getMonetaryBudgetState(request.input.budgetRef);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleGetResourceBudgetState(
  request: GetResourceBudgetStateRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.getResourceBudgetState(request.input.budgetRef);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleGetResourceQuotaState(
  request: GetResourceQuotaStateRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.getResourceQuotaState(request.input.quotaRef);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleFreezeAccount(
  request: FreezeAccountRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.freezeAccount(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleConsumeMonetaryBudget(
  request: ConsumeMonetaryBudgetRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.consumeMonetaryBudget(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleReserveMonetaryBudget(
  request: ReserveMonetaryBudgetRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.reserveMonetaryBudget(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleSettleMonetaryReservation(
  request: SettleMonetaryReservationRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.settleMonetaryReservation(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleReleaseMonetaryReservation(
  request: ReleaseMonetaryReservationRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.releaseMonetaryReservation(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleConsumeResourceBudget(
  request: ConsumeResourceBudgetRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.consumeResourceBudget(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleReserveResourceCapacity(
  request: ReserveResourceCapacityRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.reserveResourceCapacity(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleSettleResourceReservation(
  request: SettleResourceReservationRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.settleResourceReservation(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleReleaseResourceReservation(
  request: ReleaseResourceReservationRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.releaseResourceReservation(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export async function handleConsumeResourceQuota(
  request: ConsumeResourceQuotaRequest,
  ats: AtsAdminPort = createSeededInMemoryAtsService()
) {
  try {
    const data = await ats.consumeResourceQuota(request.input);
    const response: AtsApiSuccess<typeof data> = {
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

export function createAtsApiHandlers(ats: AtsAdminPort = createSeededInMemoryAtsService()) {
  return {
    handleGetAccountState: (request: GetAccountStateRequest) => handleGetAccountState(request, ats),
    handleGetMonetaryBudgetState: (request: GetMonetaryBudgetStateRequest) =>
      handleGetMonetaryBudgetState(request, ats),
    handleGetResourceBudgetState: (request: GetResourceBudgetStateRequest) =>
      handleGetResourceBudgetState(request, ats),
    handleGetResourceQuotaState: (request: GetResourceQuotaStateRequest) =>
      handleGetResourceQuotaState(request, ats),
    handleFreezeAccount: (request: FreezeAccountRequest) => handleFreezeAccount(request, ats),
    handleReserveMonetaryBudget: (request: ReserveMonetaryBudgetRequest) =>
      handleReserveMonetaryBudget(request, ats),
    handleSettleMonetaryReservation: (request: SettleMonetaryReservationRequest) =>
      handleSettleMonetaryReservation(request, ats),
    handleReleaseMonetaryReservation: (request: ReleaseMonetaryReservationRequest) =>
      handleReleaseMonetaryReservation(request, ats),
    handleConsumeMonetaryBudget: (request: ConsumeMonetaryBudgetRequest) =>
      handleConsumeMonetaryBudget(request, ats),
    handleReserveResourceCapacity: (request: ReserveResourceCapacityRequest) =>
      handleReserveResourceCapacity(request, ats),
    handleSettleResourceReservation: (request: SettleResourceReservationRequest) =>
      handleSettleResourceReservation(request, ats),
    handleReleaseResourceReservation: (request: ReleaseResourceReservationRequest) =>
      handleReleaseResourceReservation(request, ats),
    handleConsumeResourceBudget: (request: ConsumeResourceBudgetRequest) =>
      handleConsumeResourceBudget(request, ats),
    handleConsumeResourceQuota: (request: ConsumeResourceQuotaRequest) =>
      handleConsumeResourceQuota(request, ats),
    invokeCapability: async (request: AtsApiRequest): Promise<AtsApiResponse> => {
      switch (request.capability) {
        case "getAccountState":
          return handleGetAccountState(request, ats);
        case "getMonetaryBudgetState":
          return handleGetMonetaryBudgetState(request, ats);
        case "getResourceBudgetState":
          return handleGetResourceBudgetState(request, ats);
        case "getResourceQuotaState":
          return handleGetResourceQuotaState(request, ats);
        case "freezeAccount":
          return handleFreezeAccount(request, ats);
        case "reserveMonetaryBudget":
          return handleReserveMonetaryBudget(request, ats);
        case "settleMonetaryReservation":
          return handleSettleMonetaryReservation(request, ats);
        case "releaseMonetaryReservation":
          return handleReleaseMonetaryReservation(request, ats);
        case "consumeMonetaryBudget":
          return handleConsumeMonetaryBudget(request, ats);
        case "reserveResourceCapacity":
          return handleReserveResourceCapacity(request, ats);
        case "settleResourceReservation":
          return handleSettleResourceReservation(request, ats);
        case "releaseResourceReservation":
          return handleReleaseResourceReservation(request, ats);
        case "consumeResourceBudget":
          return handleConsumeResourceBudget(request, ats);
        case "consumeResourceQuota":
          return handleConsumeResourceQuota(request, ats);
      }
    },
  };
}
