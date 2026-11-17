# e2e runner image

`ghcr.io/alkem-io/test-suites/e2e-runner:pw<playwright>-runner<runner>`

The runner image for the Playwright nightly on the ARC e2e lane
(`arc-e2e-linux-x64`: Scaleway `platform-compute-v3`, defined in
`alkem-io/platform` › `github-self-hosted-runners/e2e-privileged-lane/`).

## Why it exists

The lane's pods run as uid 1001 with `allowPrivilegeEscalation: false`, so
`sudo` is refused inside a job. On a GitHub-hosted runner the nightly installs
its browsers with `playwright install --with-deps` and poppler with `apt-get`;
both need root. This image does that at build time instead.

It adds to the pinned `actions-runner` image:

| What | Where | Why |
|---|---|---|
| Playwright Chromium + headless shell, at the lockfile's version | `/ms-playwright` (`PLAYWRIGHT_BROWSERS_PATH`) | the browser builds Playwright drives |
| Their system libraries and fonts | apt | `--with-deps` |
| Branded Google Chrome (stable) | `/usr/bin/google-chrome` | the nightly config's `channel: 'chrome'` |
| poppler-utils | apt | Memo PDF download reads PDFs with `pdftotext` / `pdffonts` |

## Tags and versions

The build workflow (`.github/workflows/build-e2e-runner-image.yml`) reads the
Playwright version from `pnpm-lock.yaml` and the runner version from this
Dockerfile, and publishes `pw<playwright>-runner<runner>`. A tag is never
overwritten. A lockfile change that does not move Playwright publishes nothing.

**When Playwright is bumped,** a new tag is published. Until the lane's scale-set
values point at it, the nightly still works: `/ms-playwright` is owned by the
runner user, so the job's `playwright install chromium` downloads the new build
without root. Only the system libraries cannot be topped up that way, so move
the lane to the new tag soon after.

**When the runner is bumped,** change `RUNNER_IMAGE` here (tag and digest)
together with the lane's own pin.

## Local build

```bash
PW=$(grep -oP '^  playwright@\K[0-9.]+(?=:)' pnpm-lock.yaml | sort -u)
docker build --build-arg PLAYWRIGHT_VERSION=$PW -t e2e-runner:local infra/e2e-runner
```

The image is about 3 GB (the base runner is 1.6 GB).
