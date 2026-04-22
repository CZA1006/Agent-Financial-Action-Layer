#!/usr/bin/env bash
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "GITHUB_TOKEN must be set with repo admin permissions" >&2
  exit 1
fi

REPO_OWNER="${REPO_OWNER:-CZA1006}"
REPO_NAME="${REPO_NAME:-Agent-Financial-Action-Layer}"
BRANCH_NAME="${BRANCH_NAME:-main}"
STRICT_STATUS_CHECKS="${STRICT_STATUS_CHECKS:-true}"
ENFORCE_ADMINS="${ENFORCE_ADMINS:-true}"
DISMISS_STALE_REVIEWS="${DISMISS_STALE_REVIEWS:-true}"
REQUIRE_CODE_OWNER_REVIEWS="${REQUIRE_CODE_OWNER_REVIEWS:-false}"
REQUIRED_APPROVING_REVIEW_COUNT="${REQUIRED_APPROVING_REVIEW_COUNT:-0}"
REQUIRE_CONVERSATION_RESOLUTION="${REQUIRE_CONVERSATION_RESOLUTION:-true}"
ALLOW_FORCE_PUSHES="${ALLOW_FORCE_PUSHES:-false}"
ALLOW_DELETIONS="${ALLOW_DELETIONS:-false}"
BLOCK_CREATIONS="${BLOCK_CREATIONS:-false}"
LOCK_BRANCH="${LOCK_BRANCH:-false}"
ALLOW_FORK_SYNCING="${ALLOW_FORK_SYNCING:-false}"
CHECKS_JSON="${CHECKS_JSON:-[\"typecheck\",\"test-mock\",\"external-onboarding\"]}"
RESPONSE_FILE="$(mktemp "${TMPDIR:-/tmp}/afal-branch-protection-response.XXXXXX")"

cleanup() {
  rm -f "$RESPONSE_FILE"
}

trap cleanup EXIT INT TERM

read -r -d '' PAYLOAD <<EOF || true
{
  "required_status_checks": {
    "strict": ${STRICT_STATUS_CHECKS},
    "contexts": ${CHECKS_JSON}
  },
  "enforce_admins": ${ENFORCE_ADMINS},
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": ${DISMISS_STALE_REVIEWS},
    "require_code_owner_reviews": ${REQUIRE_CODE_OWNER_REVIEWS},
    "required_approving_review_count": ${REQUIRED_APPROVING_REVIEW_COUNT}
  },
  "required_conversation_resolution": ${REQUIRE_CONVERSATION_RESOLUTION},
  "restrictions": null,
  "allow_force_pushes": ${ALLOW_FORCE_PUSHES},
  "allow_deletions": ${ALLOW_DELETIONS},
  "block_creations": ${BLOCK_CREATIONS},
  "required_linear_history": false,
  "lock_branch": ${LOCK_BRANCH},
  "allow_fork_syncing": ${ALLOW_FORK_SYNCING}
}
EOF

echo "[branch-protection] repo=${REPO_OWNER}/${REPO_NAME} branch=${BRANCH_NAME}"
echo "[branch-protection] required checks=${CHECKS_JSON}"

if ! curl --silent --show-error \
  --request PUT \
  --url "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/branches/${BRANCH_NAME}/protection" \
  --header "Accept: application/vnd.github+json" \
  --header "Authorization: Bearer ${GITHUB_TOKEN}" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  --output "${RESPONSE_FILE}" \
  --write-out "%{http_code}" \
  --data "${PAYLOAD}" | {
    read -r status_code
    if [ "${status_code}" -lt 200 ] || [ "${status_code}" -ge 300 ]; then
      echo "[branch-protection] request failed with HTTP ${status_code}" >&2
      cat "${RESPONSE_FILE}" >&2
      exit 1
    fi
  }
then
  exit 1
fi

echo
echo "[branch-protection] updated successfully"
