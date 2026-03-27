import assert from "node:assert/strict";
import { test } from "node:test";

import { createAfalRuntimeService } from "../../backend/afal/service";
import { paymentFlowFixtures } from "../../sdk/fixtures";
import { createTrustedSurfaceServiceClient } from "./stub";
import {
  TRUSTED_SURFACE_SERVICE_ROUTES,
  handleTrustedSurfaceNodeHttpRequest,
} from "./server";

test("trusted-surface service exposes a health route", async () => {
  const response = await handleTrustedSurfaceNodeHttpRequest(createTrustedSurfaceServiceClient(createAfalRuntimeService()), {
    method: "GET",
    url: TRUSTED_SURFACE_SERVICE_ROUTES.health,
  });

  assert.equal(response.statusCode, 200);
  assert.match(response.bodyText, /trusted-surface-stub/);
});

test("trusted-surface service reviews a persisted payment approval session and resumes it", async () => {
  const service = createAfalRuntimeService();
  const pending = await service.requestPaymentApproval({
    capability: "requestPaymentApproval",
    requestRef: "req-trusted-surface-service-pending-001",
    input: {
      requestRef: paymentFlowFixtures.capabilityResponse.requestRef,
      intent: paymentFlowFixtures.paymentIntentCreated,
      monetaryBudgetRef: paymentFlowFixtures.monetaryBudgetInitial.budgetId,
    },
  });

  const response = await handleTrustedSurfaceNodeHttpRequest(
    createTrustedSurfaceServiceClient(service),
    {
      method: "POST",
      url: TRUSTED_SURFACE_SERVICE_ROUTES.reviewApprovalSession,
      bodyText: JSON.stringify({
        requestRef: "req-trusted-surface-service-review-001",
        input: {
          approvalSessionRef: pending.approvalSession.approvalSessionId,
          requestRefPrefix: "req-trusted-surface-service-review",
          decidedAt: paymentFlowFixtures.approvalResult.decidedAt,
          comment: paymentFlowFixtures.approvalResult.comment,
        },
      }),
    }
  );

  assert.equal(response.statusCode, 200);

  const body = JSON.parse(response.bodyText) as {
    ok: true;
    requestRef: string;
    data: {
      summary: {
        result: string;
        finalIntentStatus?: string;
        settlementRef?: string;
        receiptRef?: string;
      };
    };
  };

  assert.equal(body.ok, true);
  assert.equal(body.requestRef, "req-trusted-surface-service-review-001");
  assert.equal(body.data.summary.result, "approved");
  assert.equal(body.data.summary.finalIntentStatus, "settled");
  assert.equal(body.data.summary.settlementRef, paymentFlowFixtures.settlementRecord.settlementId);
  assert.equal(body.data.summary.receiptRef, paymentFlowFixtures.paymentReceipt.receiptId);
});
