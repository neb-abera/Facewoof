#!/usr/bin/env bash
#
# Branch protection on main requires status checks by name (strict), and
# names live in the workflows. A renamed job, a deleted workflow, or a
# `branches:` filter on pull_request quietly turns a required context into
# one that never reports — and every PR then waits on it forever. This
# asserts the committed list (.github/required-contexts.txt) against the
# PR-gating workflows:
#
#   (a) every listed context matches a job in those workflows, with
#       single-variable matrix names expanded, and
#   (b) every PR-gating workflow triggers on a bare `pull_request:`
#       (no branches / branches-ignore filter).
#
# Needs yq (mikefarah, v4) — preinstalled on the GitHub ubuntu runners.
set -euo pipefail

cd "$(dirname "$0")/.."

contexts_file=.github/required-contexts.txt
workflows=(
  .github/workflows/checks.yml
  .github/workflows/codeql.yml
  .github/workflows/security-scan.yml
)

command -v yq >/dev/null || {
  echo "error: yq (mikefarah v4) is required" >&2
  exit 1
}

# ---- (b) bare pull_request on every PR-gating workflow ----------------------
for wf in "${workflows[@]}"; do
  if [ "$(yq '.on | has("pull_request")' "$wf")" != "true" ]; then
    echo "error: $wf has no pull_request trigger" >&2
    exit 1
  fi
  for key in branches branches-ignore; do
    if [ "$(yq ".on.pull_request | has(\"$key\")" "$wf")" = "true" ]; then
      echo "error: $wf filters pull_request by $key; required contexts must run on every PR regardless of base branch" >&2
      exit 1
    fi
  done
done

# ---- collect the check names the workflows produce --------------------------
# A check's name is the job's `name:` (or its key). A name templated on one
# matrix variable expands to one check per value; nothing here uses more
# than one variable in a name.
names_file="$(mktemp)"
trap 'rm -f "$names_file"' EXIT

for wf in "${workflows[@]}"; do
  while IFS=$'\t' read -r key name; do
    if [[ "$name" =~ \$\{\{[[:space:]]*matrix\.([A-Za-z_-]+)[[:space:]]*\}\} ]]; then
      var="${BASH_REMATCH[1]}"
      while IFS= read -r value; do
        # shellcheck disable=SC2001  # the pattern needs a captured group
        sed "s/\${{ *matrix\.$var *}}/$value/" <<<"$name" >>"$names_file"
      done < <(yq -r ".jobs.[\"$key\"].strategy.matrix.[\"$var\"][]" "$wf")
    else
      printf '%s\n' "$name" >>"$names_file"
    fi
  done < <(yq -r '.jobs | to_entries[] | [.key, (.value.name // .key)] | @tsv' "$wf")
done

# ---- (a) every listed context resolves to a job -----------------------------
status=0
while IFS= read -r context; do
  # Strip comments and surrounding whitespace; skip blanks.
  context="${context%%#*}"
  context="$(sed 's/^ *//; s/ *$//' <<<"$context")"
  [ -n "$context" ] || continue
  if ! grep -Fxq "$context" "$names_file"; then
    echo "error: required context '$context' matches no job in ${workflows[*]}" >&2
    status=1
  fi
done <"$contexts_file"

if [ "$status" -ne 0 ]; then
  echo "the workflows produce these check names:" >&2
  sort -u "$names_file" >&2
  exit "$status"
fi

echo "ok: every required context matches a PR-gating job, and every PR-gating workflow runs on a bare pull_request"
