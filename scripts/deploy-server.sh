#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/docker/quinzy}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

if [ -n "$(git status --porcelain)" ]; then
  echo "Deployment stopped: the server copy has uncommitted changes."
  echo "Commit, stash, or remove those server-side changes before deploying."
  exit 1
fi

git fetch origin "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose up -d --build
docker image prune -f

docker compose ps
