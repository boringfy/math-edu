#!/usr/bin/env bash
# Poll origin/main, build the backend image, and switch only after a good build.
set -Eeuo pipefail

REPO=${MATH_EDU_REPO:-/fiopower/math-edu}
STATE=${MATH_EDU_DEPLOY_STATE:-/fiopower/math-edu-deploy.state}
LOCK=${MATH_EDU_DEPLOY_LOCK:-/fiopower/math-edu-deploy.lock}
HEALTH_URL=${MATH_EDU_HEALTH_URL:-http://127.0.0.1:8788/healthz}

exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO"
[[ $(git branch --show-current) == main ]] || { echo 'Deployment checkout must be on main' >&2; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo 'Deployment checkout has local changes; refusing to overwrite them' >&2; exit 1; }
[[ -f backend/.env ]] || { echo 'backend/.env is missing; create it before deploying' >&2; exit 1; }

git fetch --quiet origin main
target=$(git rev-parse origin/main)
head=$(git rev-parse HEAD)
git merge-base --is-ancestor "$head" "$target" || { echo 'origin/main is not a fast-forward; refusing to deploy' >&2; exit 1; }

if [[ $head != "$target" ]]; then
  git merge --ff-only "$target"
fi

deployed=$(test -f "$STATE" && cat "$STATE" || true)
running=$(docker inspect math-edu-content --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' 2>/dev/null || true)
if [[ $deployed == "$target" && $running == "$target" ]] && curl --fail --silent --show-error "$HEALTH_URL" >/dev/null; then
  echo "Already deployed $target"
  exit 0
fi

previous_image=$(docker image inspect math-edu-content --format '{{.Id}}' 2>/dev/null || true)
echo "Building $target"
GIT_COMMIT="$target" docker compose build content

rollback() {
  if [[ -n $previous_image ]]; then
    echo "Deployment failed; restoring previous image $previous_image" >&2
    docker tag "$previous_image" math-edu-content:latest
    docker compose up -d --no-build --force-recreate content
  fi
}

if ! GIT_COMMIT="$target" docker compose up -d --no-build content; then
  rollback
  exit 1
fi

healthy=0
for _ in {1..30}; do
  if curl --fail --silent --show-error "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ $healthy != 1 ]]; then
  rollback
  echo "New deployment $target did not become healthy" >&2
  exit 1
fi

printf '%s\n' "$target" >"${STATE}.tmp"
mv "${STATE}.tmp" "$STATE"
echo "Deployed $target"
