#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

branch="${DEPLOY_BRANCH:-deploy}"

if [[ ! -f packages/mdat-wasm/wasm/mdat_wasm_bg.wasm ]]; then
  echo "Missing vendored wasm. Run: bun run sync:mdat-wasm" >&2
  exit 1
fi

bun install
bun run build

if ! git diff --quiet -- packages/mdat-wasm/wasm; then
  echo "Commit updated wasm artifacts on main before publishing deploy." >&2
  exit 1
fi

worktree_dir="$(mktemp -d)"
cleanup() {
  git worktree remove "$worktree_dir" --force 2>/dev/null || true
  rm -rf "$worktree_dir"
}
trap cleanup EXIT

if git show-ref --verify --quiet "refs/heads/$branch"; then
  git worktree add -B "$branch" "$worktree_dir" "$branch"
else
  git worktree add -B "$branch" "$worktree_dir" HEAD
fi

rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude apps/web/dist \
  "$root/" "$worktree_dir/"

mkdir -p "$worktree_dir/apps/web/dist"
rsync -a --delete "$root/apps/web/dist/" "$worktree_dir/apps/web/dist/"

cd "$worktree_dir"
git add -A
git add -f apps/web/dist
if git diff --cached --quiet; then
  echo "Deploy branch is already up to date."
  exit 0
fi

git commit -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Updated local branch '$branch'. Push with: git push origin $branch"
