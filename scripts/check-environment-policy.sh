#!/usr/bin/env bash
#
# check-environment-policy.sh: a GitHub environment deploys from one branch
# and nothing else.
#
# An environment with no deployment branch policy accepts a job from any
# branch. The job then reads the environment's secrets and gets an OIDC token
# whose subject names the environment, which is what Azure trusts for the
# deploy. Facewoof's `production` environment was in that state until
# 2026-09-26.
#
#   scripts/check-environment-policy.sh <owner/repo> <environment> <branch>
#   scripts/check-environment-policy.sh --self-test
#
# The first form reads the live settings with `gh api` and fails unless the
# environment takes custom branch policies (not "protected branches") and
# its only policy is the named branch. --self-test feeds the judgement
# planted settings, the defect among them, and must see each one refused
# and the correct one pass.

set -euo pipefail

# judge <environment json> <policies json> <branch>: prints what is wrong,
# returns 1 when anything is.
judge() {
  local env_json=$1 policies_json=$2 branch=$3 problems
  problems=$(jq -rn --argjson env "$env_json" --argjson pol "$policies_json" --arg b "$branch" '
    [
      (if $env.deployment_branch_policy == null
        then "no deployment branch policy: any branch can deploy" else empty end),
      (if $env.deployment_branch_policy != null
          and $env.deployment_branch_policy.protected_branches != false
        then "protected_branches is on: every protected branch can deploy" else empty end),
      (if $env.deployment_branch_policy != null
          and $env.deployment_branch_policy.custom_branch_policies != true
        then "custom_branch_policies is off" else empty end),
      (if $env.deployment_branch_policy != null
          and ([$pol.branch_policies[]? | {name, type}] != [{name: $b, type: "branch"}])
        then "branch policies are \([$pol.branch_policies[]? | "\(.type):\(.name)"] | join(", ") | if . == "" then "none" else . end), not branch:\($b) alone"
        else empty end)
    ] | .[]')
  if [ -n "$problems" ]; then
    printf '%s\n' "$problems"
    return 1
  fi
}

self_test() {
  local ok='{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}'
  local main='{"branch_policies":[{"name":"main","type":"branch"}]}'
  local failed=0 name env pol want out rc
  while IFS='|' read -r name env pol want; do
    rc=0
    out=$(judge "$env" "$pol" main) || rc=$?
    if { [ "$want" = pass ] && [ "$rc" -ne 0 ]; } || { [ "$want" = fail ] && [ "$rc" -eq 0 ]; }; then
      echo "self-test FAILED: $name: wanted $want, got exit $rc ${out:+($out)}" >&2
      failed=1
    else
      echo "self-test ok: $name: $want${out:+ ($out)}"
    fi
  done <<CASES
main alone|$ok|$main|pass
no policy at all|{"deployment_branch_policy":null}|{"branch_policies":[]}|fail
protected branches|{"deployment_branch_policy":{"protected_branches":true,"custom_branch_policies":false}}|{"branch_policies":[]}|fail
custom but empty|$ok|{"branch_policies":[]}|fail
a wildcard beside main|$ok|{"branch_policies":[{"name":"main","type":"branch"},{"name":"*","type":"branch"}]}|fail
a tag named main|$ok|{"branch_policies":[{"name":"main","type":"tag"}]}|fail
another branch|$ok|{"branch_policies":[{"name":"dev","type":"branch"}]}|fail
CASES
  return "$failed"
}

if [ "${1:-}" = --self-test ]; then
  self_test
  exit
fi

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <owner/repo> <environment> <branch> | --self-test" >&2
  exit 2
fi
repo=$1 environment=$2 branch=$3

env_json=$(gh api "repos/$repo/environments/$environment")
policies='{"branch_policies":[]}'
if [ "$(jq -r '.deployment_branch_policy.custom_branch_policies // false' <<<"$env_json")" = true ]; then
  policies=$(gh api "repos/$repo/environments/$environment/deployment-branch-policies")
fi

if problems=$(judge "$env_json" "$policies" "$branch"); then
  echo "ok: $repo environment $environment deploys from branch $branch alone"
else
  while IFS= read -r line; do
    echo "::error::$repo environment $environment: $line"
  done <<<"$problems"
  echo "Fix: see docs/DEPLOY.md, section 5." >&2
  exit 1
fi
