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
curl -fsS https://math-edu.hashfront.com/healthz
```

To trigger a check immediately, run `systemctl --user start math-edu-deploy.service`.
The signing private key for app updates is **not** on this server. See
`store/OTA-UPDATES.md` for the separately authorized OTA publishing procedure.
