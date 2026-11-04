# MailSlurper (Ory's smtps fork) with the connection-pool leak fixed.
#
# Mirrors ory/mailslurper's own Dockerfile-smtps step for step, so the image is
# a drop-in replacement for oryd/mailslurper:latest-smtps (same binary layout,
# same bundled config and certificates, same ports). The only difference is
# the two patches in this directory — see README.md.
FROM golang:1.13-alpine

ENV GO111MODULE=on

RUN apk --no-cache add git libc-dev gcc
# The exact commit oryd/mailslurper:latest-smtps was built from (2020-02-18,
# the fork's last commit). Pinned so a rebuild can never pick up anything else.
ARG MAILSLURPER_COMMIT=4c6aeccddc86834102cf3edee6ad65fdb489456c
RUN git clone https://github.com/ory/mailslurper.git /go/src/github.com/mailslurper/mailslurper \
 && cd /go/src/github.com/mailslurper/mailslurper \
 && git checkout --quiet "${MAILSLURPER_COMMIT}"

COPY 01-connection-pool-leak.patch 02-sqlite-single-connection.patch /tmp/patches/
RUN cd /go/src/github.com/mailslurper/mailslurper \
 && git apply --verbose /tmp/patches/01-connection-pool-leak.patch \
 && git apply --verbose /tmp/patches/02-sqlite-single-connection.patch

# Upstream runs an unpinned, global `go get github.com/mjibson/esc` before copying
# the source. Six years on that resolves to dependencies that no longer compile
# on Go 1.13. MailSlurper's own go.mod/go.sum already pin esc (v0.2.0) and its
# dependencies, so install it from inside the module and get exactly the
# versions the original image was built with.
RUN cd /go/src/github.com/mailslurper/mailslurper && go install github.com/mjibson/esc

WORKDIR /go/src/github.com/mailslurper/mailslurper/cmd/mailslurper

RUN go get
RUN go generate
RUN go build

RUN cp /go/src/github.com/mailslurper/mailslurper/assets/* ./

EXPOSE 8080 8085 2500

ENTRYPOINT ["./mailslurper"]
