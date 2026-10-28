#!/usr/bin/env bash
# Updates kcpersonal on the server to the latest commit on main.
# Run as the site user from anywhere: ~/domains/kcpersonal.npk.nu/app/scripts/deploy.sh
#
# Requires a sudoers rule that lets the site user restart the service, see
# docs/drift.md.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env in $(pwd). Copy .env.example and fill it in first." >&2
  exit 1
fi

echo "==> Fetching latest code"
git pull --ff-only

echo "==> Installing dependencies"
npm ci --no-audit --no-fund

echo "==> Building"
npm run build

echo "==> Applying database migrations"
npm run db:migrate

echo "==> Restarting service"
sudo /usr/bin/systemctl restart kcpersonal

sleep 2
if systemctl is-active --quiet kcpersonal; then
  echo "kcpersonal is running."
else
  echo "kcpersonal failed to start. Check: journalctl -u kcpersonal -n 50" >&2
  exit 1
fi
