# Production backend deployment

`/fiopower/math-edu` on `r7920.300k.xyz` is the Git checkout of `origin/main`.
The `hall` user's `math-edu-deploy.timer` checks every five minutes and runs
`deploy/auto-deploy.sh`. The script only accepts a clean `main` checkout and a
fast-forward from `origin/main`. It serializes runs, builds a new Docker image
before replacing the running container, waits for `/healthz`, and restores the
previous image if the new container does not become healthy. The mounted
`/fiopower/math-edu/data` directory is outside Git and persists across builds.

The script writes the successfully deployed commit to
`/fiopower/math-edu-deploy.state`; it also checks the running image's commit
label. To inspect the job, run:

```bash
systemctl --user status math-edu-deploy.timer
journalctl --user -u math-edu-deploy.service -n 100 --no-pager
git -C /fiopower/math-edu rev-parse HEAD
curl -fsS http://127.0.0.1:8788/healthz
```

This validates the backend on `r7920.300k.xyz`. The public
`math-edu.hashfront.com` hostname is behind Cloudflare and must separately
route to this host before apps use this deployment. Check its update endpoint
from outside the server; a 404 there while the local endpoint returns 204
means the public hostname is still reaching a different origin.

To trigger a check immediately, run `systemctl --user start math-edu-deploy.service`.
The signing private key for app updates is **not** on this server. See
`store/OTA-UPDATES.md` for the separately authorized OTA publishing procedure.
