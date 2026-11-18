# Runner image for the Playwright nightly on the ARC e2e lane
# (`arc-e2e-linux-x64`, Scaleway `platform-compute-v3`).
#
# The lane's pods run with `allowPrivilegeEscalation: false`, so a job cannot
# `sudo apt-get` or `playwright install --with-deps`. Everything that needs
# root is therefore installed here, at build time. See README.md.

# Pinned by digest: the 2.338.2 tag is re-published when upstream rebuilds it
# (2.338.2@sha256:759a… is an older build of the same tag). The lane's own
# image in platform:
# github-self-hosted-runners/e2e-privileged-lane/arc-e2e-scale-set-values.yaml
# still pins 759a…; it moves to this image when the lane switches over.
ARG RUNNER_IMAGE=ghcr.io/actions/actions-runner:2.338.2@sha256:6d0b2d80d80f143f77dcb676e50920100bbb547e39e883454d57f45ab8c31300

FROM ${RUNNER_IMAGE}

# Must equal the `playwright` version in pnpm-lock.yaml; the build workflow
# passes it from there. A mismatch is survivable (see README.md), not silent.
ARG PLAYWRIGHT_VERSION

USER root

# Browsers live outside $HOME so the runner's work dir stays disposable, and
# the path is owned by the runner user so a job can top up a browser build
# (no root needed) if the lockfile moves ahead of this image.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN set -eux; \
    test -n "${PLAYWRIGHT_VERSION}"; \
    apt-get update; \
    # poppler-utils: the Memo PDF download suite reads PDFs with pdftotext/pdffonts.
    apt-get install -y --no-install-recommends poppler-utils; \
    # The runner ships Node with npx in externals; use it rather than adding a
    # second Node. The job itself still uses actions/setup-node.
    export PATH="/home/runner/externals/node24/bin:${PATH}"; \
    # chromium (+ headless shell) into PLAYWRIGHT_BROWSERS_PATH, system deps, and
    # branded Chrome (google-chrome-stable via apt) for the `chrome` channel
    # the nightly config uses.
    npx -y "playwright@${PLAYWRIGHT_VERSION}" install --with-deps chromium chrome; \
    chown -R runner:runner "${PLAYWRIGHT_BROWSERS_PATH}"; \
    rm -rf /var/lib/apt/lists/* /root/.npm /tmp/*

USER runner

LABEL org.opencontainers.image.source="https://github.com/alkem-io/test-suites" \
      org.opencontainers.image.description="actions-runner + Playwright browsers, branded Chrome and poppler for the ARC e2e lane" \
      io.alkem.playwright.version="${PLAYWRIGHT_VERSION}"
