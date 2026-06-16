#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out_dir="$root/packages/mdat-wasm/wasm"
local_mdat="$root/../mdat"

if [[ -f "$local_mdat/scripts/build-wasm.sh" ]]; then
  echo "Building mdat wasm from local checkout: $local_mdat"
  "$local_mdat/scripts/build-wasm.sh"
  pkg_dir="$local_mdat/rust/mdat-wasm/pkg"
  printf "path=%s\n" "$local_mdat" > "$out_dir/.source-ref"
else
  repo_url="${MDAT_GIT_URL:-https://github.com/keejkrej/mdat.git}"
  repo_ref="${MDAT_GIT_REF:-main}"
  work_dir="$(mktemp -d)"

  cleanup() {
    rm -rf "$work_dir"
  }
  trap cleanup EXIT

  echo "Syncing mdat wasm from $repo_url @ $repo_ref"
  git clone --depth 1 --branch "$repo_ref" "$repo_url" "$work_dir/mdat"
  "$work_dir/mdat/scripts/build-wasm.sh"
  pkg_dir="$work_dir/mdat/rust/mdat-wasm/pkg"
  printf "url=%s\nref=%s\n" "$repo_url" "$repo_ref" > "$out_dir/.source-ref"
fi

mkdir -p "$out_dir"
cp "$pkg_dir/mdat_wasm.js" \
  "$pkg_dir/mdat_wasm.d.ts" \
  "$pkg_dir/mdat_wasm_bg.wasm" \
  "$pkg_dir/mdat_wasm_bg.wasm.d.ts" \
  "$out_dir/"

echo "Wrote wasm artifacts to packages/mdat-wasm/wasm"
