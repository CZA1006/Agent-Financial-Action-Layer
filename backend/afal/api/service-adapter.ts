import type { AfalModuleService } from "../service";
import { createAfalRuntimeService } from "../service";
import type {
  AfalApiSuccess,
  AfalCapabilityRequest,
  AfalCapabilityResponse,
  PaymentCapabilityRequest,
  PaymentCapabilityResponse,
  ResourceCapabilityRequest,
  ResourceCapabilityResponse,
} from "./types";
import { mapAfalFailure } from "./failures";

export interface AfalApiServiceAdapter {
  handleExecutePayment(request: PaymentCapabilityRequest): Promise<PaymentCapabilityResponse>;
  handleSettleResourceUsage(
    request: ResourceCapabilityRequest
  ): Promise<ResourceCapabilityResponse>;
  invokeCapability(request: AfalCapabilityRequest): Promise<AfalCapabilityResponse>;
}

export function createAfalApiServiceAdapter(
  service: AfalModuleService = createAfalRuntimeService()
): AfalApiServiceAdapter {
  return {
    handleExecutePayment: async (request) => {
      try {
        const data = await service.executePayment({
          capability: request.capability,
          requestRef: request.requestRef,
          input: request.input,
        });
        const response: AfalApiSuccess<typeof data> = {
          ok: true,
          capability: request.capability,
          requestRef: request.requestRef,
          statusCode: 200,
          data,
        };
        return response;
      } catch (error) {
        return mapAfalFailure(request.capability, request.requestRef, error);
      }
    },
    handleSettleResourceUsage: async (request) => {
      try {
        const data = await service.settleResourceUsage({
          capability: request.capability,
          requestRef: request.requestRef,
          input: request.input,
        });
        const response: AfalApiSuccess<typeof data> = {
          ok: true,
          capability: request.capability,
          requestRef: request.requestRef,
          statusCode: 200,
          data,
        };
        return response;
      } catch (error) {
        return mapAfalFailure(request.capability, request.requestRef, error);
      }
    },
    invokeCapability: async (request) => {
      try {
        const data =
          request.capability === "executePayment"
            ? await service.executePayment({
                capability: request.capability,
                requestRef: request.requestRef,
                input: request.input,
              })
            : await service.settleResourceUsage({
                capability: request.capability,
                requestRef: request.requestRef,
                input: request.input,
              });

        const response: AfalApiSuccess<typeof data> = {
          ok: true,
          capability: request.capability,
          requestRef: request.requestRef,
          statusCode: 200,
          data,
        };
        return response;
      } catch (error) {
        return mapAfalFailure(request.capability, request.requestRef, error);
      }
    },
  };
}
