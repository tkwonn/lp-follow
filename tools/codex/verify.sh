#!/bin/sh
# Codex（gpt-6-astra）に独立検証を依頼する。
#   sh tools/codex/verify.sh <unit>
# 出力: docs/verify/<unit>/codex.md
# sandbox は danger-full-access（workspace-write では listen EPERM / Chromium 起動拒否で検証できない。2026-09-07 確認）
set -eu
UNIT="${1:?usage: verify.sh <unit>}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
mkdir -p build/codex "docs/verify/$UNIT"
sed "s/{{UNIT}}/$UNIT/g" tools/codex/verify-prompt.md > "build/codex/prompt-$UNIT.md"
codex exec --skip-git-repo-check -s danger-full-access -o "docs/verify/$UNIT/codex.md" - < "build/codex/prompt-$UNIT.md"
echo "-> docs/verify/$UNIT/codex.md"
