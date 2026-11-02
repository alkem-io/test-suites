#!/usr/bin/env bash
#
# One-off Swarmail trial on the shared k8s-hetzner-test cluster
# (.github/workflows/swarmail-trial.yml): install Swarmail beside MailSlurper,
# point the two mail senders at it for one run, and put everything back.
#
# The two senders, as wired in alkem-io/dev-orchestration (test overlay):
#   - Ory Kratos's courier — statefulset/kratos-courier from the ory/kratos
#     Helm chart. Its connection URI comes from the env var
#     COURIER_SMTP_CONNECTION_URI (secretKeyRef kratos/smtpConnectionURI),
#     which overrides courier.smtp.connection_uri in kratos.yaml. The main
#     `kratos` deployment runs `serve all` without --watch-courier, so the
#     courier is the only Kratos pod that sends mail.
#   - the notifications service — deployment/alkemio-notifications-deployment.
#     EMAIL_SMTP_* reach it through `envFrom: configMapRef alkemio-config`;
#     an explicit `env` entry of the same name takes precedence.
#
# What this script changes, and nothing else:
#   - the `env` list of ONE container in each of those two workloads (the
#     shared kratos Secret and alkemio-config ConfigMap are never written —
#     other workloads read them);
#   - a Helm release `swarmail`, and in implicit-tls mode a Service
#     `swarmail-smtps` and a TLS Secret `swarmail-trial-tls`;
#   - the Secret `swarmail-trial-snapshot`, which holds the exact prior env
#     lists and is the ownership token: restore acts only when it exists and
#     belongs to the calling run (or `--any-owner`), and deletes it last, only
#     after every restore step verified.
#
# Usage: swarmail-trial.sh preflight|snapshot|install|probe-shim|repoint
#        swarmail-trial.sh restore [--any-owner]
#        swarmail-trial.sh shim-endpoint
#
# Inputs (env): TRIAL_OWNER (required), SWARMAIL_CHART_VERSION,
#   SWARMAIL_IMAGE_TAG, SMTP_MODE (plain|implicit-tls), SHIM_PORT, SHIM_PATH,
#   SHIM_CONFIG, SMTPS_PORT, SMTPS_CONFIG — see the workflow's inputs.
#
# Secrets: env values are never printed. Logs carry env var NAMES and sha256
# digests only; the snapshot lives in a cluster Secret, never in the log or
# an artifact.
set -euo pipefail

NS="default"
RELEASE="swarmail"   # the chart's fullname is the release name → Service/Deployment "swarmail"
CHART="oci://ghcr.io/feedback-loop-ai/charts/swarmail"
CHART_VERSION="${SWARMAIL_CHART_VERSION:-0.2.0}"
SNAPSHOT="swarmail-trial-snapshot"
TLS_SECRET="swarmail-trial-tls"
SMTPS_SERVICE="swarmail-smtps"
TRIAL_LABEL="app.kubernetes.io/part-of=swarmail-trial"
COURIER="statefulset/kratos-courier"
COURIER_CONTAINER="kratos-courier"
NOTIFICATIONS="deployment/alkemio-notifications-deployment"
NOTIFICATIONS_CONTAINER="alkemio-notifications"
ROLLOUT_TIMEOUT="${ROLLOUT_TIMEOUT:-300s}"
SHIM_LOCAL_PORT="${SHIM_LOCAL_PORT:-4437}"
# Every sender lands in Swarmail's `default` inbox: Kratos cannot AUTH over
# plain SMTP (Go's PLAIN auth refuses an unencrypted non-localhost link), so
# in plain mode it sends without AUTH, which Swarmail files under `default`;
# notifications AUTHs as `default` to match. Whether the MailSlurper shim
# reads `default` or all inboxes merged, it sees both senders.
INBOX="default"

SMTP_MODE="${SMTP_MODE:-plain}"
SWARMAIL_IMAGE_TAG="${SWARMAIL_IMAGE_TAG:-main}"
SHIM_PORT="${SHIM_PORT:-}"
SHIM_PATH="${SHIM_PATH:-}"
SHIM_CONFIG="${SHIM_CONFIG:-}"
SMTPS_PORT="${SMTPS_PORT:-}"
SMTPS_CONFIG="${SMTPS_CONFIG:-}"

WORK="$(mktemp -d "${RUNNER_TEMP:-/tmp}/swarmail-trial.XXXXXX")"
chmod 700 "$WORK"
PF_PID=""
cleanup() {
  [ -n "$PF_PID" ] && kill "$PF_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

die() { echo "::error::$*" >&2; exit 1; }
k() { kubectl -n "$NS" "$@"; }

# JSON work happens in node (present on every runner this workflow uses; the
# self-hosted runner is not guaranteed to have jq). Reads a workload's JSON on
# stdin; argv: <container> <action> [file].
#   inspect          → {container,index,names,env,envSha,templateSha}
#   override <file>  → JSON patch: env minus the override names, plus overrides
#   restore  <file>  → JSON patch: env set back to the snapshot's exact list
# Every patch starts with a `test` op on the container name, so a reordered
# container list fails the patch instead of editing the wrong container.
# shellcheck disable=SC2016 # single quotes on purpose: this is JavaScript
ENVTOOL_JS='
const fs = require("fs"), crypto = require("crypto");
const [, container, action, file] = process.argv;
const w = JSON.parse(fs.readFileSync(0, "utf8"));
const cs = w.spec.template.spec.containers;
const i = cs.findIndex(c => c.name === container);
if (i < 0) { console.error(`container ${container} not found`); process.exit(3); }
const canon = v => JSON.stringify(v, (_, x) =>
  x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map(k => [k, x[k]])) : x);
const sha = v => crypto.createHash("sha256").update(canon(v)).digest("hex");
const env = cs[i].env ?? null;
const base = `/spec/template/spec/containers/${i}`;
const guard = { op: "test", path: `${base}/name`, value: container };
const out = o => process.stdout.write(JSON.stringify(o));
if (action === "inspect") {
  out({ container, index: i, names: (env ?? []).map(e => e.name), env,
        envSha: sha(env), templateSha: sha(w.spec.template) });
} else if (action === "override") {
  const ov = JSON.parse(fs.readFileSync(file, "utf8"));
  const names = new Set(ov.map(e => e.name));
  const kept = (env ?? []).filter(e => !names.has(e.name));
  out([guard, { op: env === null ? "add" : "replace", path: `${base}/env`, value: kept.concat(ov) }]);
} else if (action === "restore") {
  const saved = JSON.parse(fs.readFileSync(file, "utf8")).env;
  const ops = [guard];
  if (saved === null) { if (env !== null) ops.push({ op: "remove", path: `${base}/env` }); }
  else ops.push({ op: env === null ? "add" : "replace", path: `${base}/env`, value: saved });
  out(ops);
} else { console.error(`unknown action ${action}`); process.exit(2); }
'
# shellcheck disable=SC2016
FIELD_JS='
const o = JSON.parse(require("fs").readFileSync(0, "utf8"));
const v = o[process.argv[1]];
process.stdout.write(typeof v === "string" ? v : JSON.stringify(v));
'

envtool() { # envtool <ref> <container> <action> [file]
  k get "$1" -o json | node -e "$ENVTOOL_JS" "$2" "$3" "${4:-}"
}
field() { node -e "$FIELD_JS" "$1"; }

describe() { # describe <label> <inspect.json> — names and digests only
  echo "$1: env names $(field names < "$2"), env sha256 $(field envSha < "$2"), pod template sha256 $(field templateSha < "$2")"
}

validate_inputs() {
  [ -n "${TRIAL_OWNER:-}" ] || die "TRIAL_OWNER is not set"
  [[ "$SWARMAIL_IMAGE_TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || die "swarmail-image-tag '$SWARMAIL_IMAGE_TAG' is not a valid image tag"
  case "$SMTP_MODE" in plain|implicit-tls) ;; *) die "smtp-mode must be plain or implicit-tls" ;; esac
  local p
  for p in SHIM_PORT SMTPS_PORT; do
    if ! [[ "${!p}" =~ ^[1-9][0-9]{0,4}$ ]] || (( ${!p} > 65535 )); then
      die "$p '${!p}' is not a port number"
    fi
  done
  [[ "$SHIM_PATH" =~ ^/[A-Za-z0-9/_.-]*$ ]] || die "shim-path '$SHIM_PATH' must start with / and use only [A-Za-z0-9/_.-]"
  # KEY=VALUE pairs become `helm --set-string config.KEY=VALUE`: refuse
  # anything Helm would parse as more than one value (commas, brackets, ...).
  local kv
  for kv in $SHIM_CONFIG $SMTPS_CONFIG; do
    [[ "$kv" =~ ^SWARMAIL_[A-Z0-9_]+=[A-Za-z0-9_.:/-]*$ ]] || die "config entry '$kv' must be SWARMAIL_NAME=value (value: [A-Za-z0-9_.:/-])"
  done
}

# exists <kind/name>: true/false, and on an API error the whole script exits —
# explicitly, because set -e is suspended inside `if`/`||` conditions and an
# unreadable cluster must never read as "nothing there".
exists() {
  local out
  if ! out="$(k get "$1" --ignore-not-found -o name 2>"$WORK/get.err")"; then
    cat "$WORK/get.err" >&2
    die "could not read $1 from the cluster"
  fi
  [ -n "$out" ]
}

snapshot_owner() { k get secret "$SNAPSHOT" -o jsonpath='{.data.owner}' | base64 -d; }

snapshot_file() { # snapshot_file <key> <dest>
  local key="${1//./\\.}"
  k get secret "$SNAPSHOT" -o jsonpath="{.data.$key}" | base64 -d > "$2"
  [ -s "$2" ] || die "snapshot key $1 is empty"
}

preflight() {
  validate_inputs
  exists "$COURIER" || die "$COURIER not found in namespace $NS"
  exists "$NOTIFICATIONS" || die "$NOTIFICATIONS not found in namespace $NS"
  if exists "secret/$SNAPSHOT"; then
    die "secret/$SNAPSHOT exists: run '$(snapshot_owner)' never finished its restore. Dispatch this workflow with mode=restore-only first."
  fi
  if helm status "$RELEASE" -n "$NS" >/dev/null 2>&1; then
    die "a Helm release '$RELEASE' already exists in $NS; this trial will not adopt or replace it"
  fi
  local r
  for r in "deployment/$RELEASE" "service/$RELEASE" "service/$SMTPS_SERVICE" "secret/$TLS_SECRET"; do
    if exists "$r"; then die "$r already exists in $NS; this trial will not adopt or replace it"; fi
  done
  envtool "$COURIER" "$COURIER_CONTAINER" inspect > "$WORK/courier.json"
  envtool "$NOTIFICATIONS" "$NOTIFICATIONS_CONTAINER" inspect > "$WORK/notifications.json"
  describe "$COURIER" "$WORK/courier.json"
  describe "$NOTIFICATIONS" "$WORK/notifications.json"
  echo "preflight ok: chart $CHART:$CHART_VERSION, image tag $SWARMAIL_IMAGE_TAG, smtp-mode $SMTP_MODE"
}

snapshot() {
  validate_inputs
  envtool "$COURIER" "$COURIER_CONTAINER" inspect > "$WORK/courier.json"
  envtool "$NOTIFICATIONS" "$NOTIFICATIONS_CONTAINER" inspect > "$WORK/notifications.json"
  # `create` is atomic: it fails if a snapshot already exists, so a second
  # trial can never overwrite the first one's way back.
  k create secret generic "$SNAPSHOT" \
    --from-file=courier.json="$WORK/courier.json" \
    --from-file=notifications.json="$WORK/notifications.json" \
    --from-literal=owner="$TRIAL_OWNER" >/dev/null
  k label secret "$SNAPSHOT" "$TRIAL_LABEL" >/dev/null
  # Read it back and compare digests: never repoint on a snapshot we cannot read.
  local f
  for f in courier notifications; do
    snapshot_file "$f.json" "$WORK/check-$f.json"
    [ "$(field envSha < "$WORK/check-$f.json")" = "$(field envSha < "$WORK/$f.json")" ] \
      || die "snapshot of $f does not read back identically"
  done
  describe "snapshot $COURIER" "$WORK/courier.json"
  describe "snapshot $NOTIFICATIONS" "$WORK/notifications.json"
  echo "snapshot stored in secret/$SNAPSHOT (owner $TRIAL_OWNER)"
}

require_own_snapshot() {
  exists "secret/$SNAPSHOT" || die "no secret/$SNAPSHOT: refusing to change the cluster without a recorded way back"
  [ "$(snapshot_owner)" = "$TRIAL_OWNER" ] || die "secret/$SNAPSHOT belongs to '$(snapshot_owner)', not '$TRIAL_OWNER'"
}

install() {
  validate_inputs
  require_own_snapshot
  local args=(install "$RELEASE" "$CHART" --version "$CHART_VERSION" -n "$NS"
    --set-string "image.tag=$SWARMAIL_IMAGE_TAG"
    --set-string image.pullPolicy=Always
    --wait --timeout 5m)
  local kv pairs=()
  read -r -a pairs <<< "$SHIM_CONFIG"
  for kv in "${pairs[@]}"; do args+=(--set-string "config.$kv"); done
  if [ "$SMTP_MODE" = "implicit-tls" ]; then
    command -v openssl >/dev/null || die "implicit-tls mode needs openssl on the runner"
    # Throwaway self-signed pair, lives as long as the trial. Both clients
    # skip verification against MailSlurper today (skip_ssl_verify=true,
    # rejectUnauthorized=false) and keep doing so here.
    openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=$SMTPS_SERVICE" \
      -addext "subjectAltName=DNS:$SMTPS_SERVICE,DNS:$SMTPS_SERVICE.$NS.svc,DNS:$RELEASE,DNS:$RELEASE.$NS.svc" \
      -keyout "$WORK/tls.key" -out "$WORK/tls.crt" 2>/dev/null
    k create secret tls "$TLS_SECRET" --cert="$WORK/tls.crt" --key="$WORK/tls.key" >/dev/null
    k label secret "$TLS_SECRET" "$TRIAL_LABEL" >/dev/null
    args+=(--set tls.enabled=true --set-string "tls.secretName=$TLS_SECRET")
    read -r -a pairs <<< "$SMTPS_CONFIG"
    for kv in "${pairs[@]}"; do args+=(--set-string "config.$kv"); done
  fi
  helm "${args[@]}"
  if [ "$SMTP_MODE" = "implicit-tls" ]; then
    # The 0.2.0 chart's Service carries 1025/1110/8025 only; the implicit-TLS
    # listener gets its own Service, owned and removed by this trial.
    k expose "deployment/$RELEASE" --name "$SMTPS_SERVICE" \
      --port "$SMTPS_PORT" --target-port "$SMTPS_PORT" --labels "$TRIAL_LABEL"
  fi
  k rollout status "deployment/$RELEASE" --timeout="$ROLLOUT_TIMEOUT"
  echo "swarmail running image $(k get "deployment/$RELEASE" -o jsonpath='{.spec.template.spec.containers[0].image}')"
}

start_shim_forward() {
  # kubectl itself, not the k() wrapper: backgrounding a function forks a
  # subshell, and killing that would leave the port-forward holding the port
  # the test step forwards next.
  kubectl -n "$NS" port-forward "deployment/$RELEASE" "$SHIM_LOCAL_PORT:$SHIM_PORT" > "$WORK/pf.log" 2>&1 &
  PF_PID=$!
  local _
  for _ in $(seq 1 20); do
    grep -q "Forwarding from" "$WORK/pf.log" && return 0
    sleep 1
  done
  cat "$WORK/pf.log" >&2
  die "port-forward to deployment/$RELEASE:$SHIM_PORT did not come up"
}

# Before anything is repointed: the suite cannot read mail without the shim,
# so a missing shim (Swarmail #314 not on the image yet, or a wrong
# shim-port/shim-path) stops the run here, with Kratos and notifications
# untouched.
probe_shim() {
  validate_inputs
  start_shim_forward
  # shellcheck disable=SC2016
  node -e '
    const url = process.argv[1];
    fetch(url).then(async r => {
      const t = await r.text();
      if (!r.ok) { console.error(`${url} answered HTTP ${r.status}`); process.exit(1); }
      let b;
      try { b = JSON.parse(t); } catch { console.error(`${url} answered non-JSON`); process.exit(1); }
      if (b === null || typeof b !== "object" || Array.isArray(b)) { console.error(`${url} answered JSON that is not an object`); process.exit(1); }
      if (!("mailItems" in b) && !("totalRecords" in b))
        console.log(`::warning::${url} answered an object without mailItems/totalRecords — check that the shim returns MailSlurper JSON`);
      console.log(`shim ok at ${url}: totalRecords=${b.totalRecords ?? "absent"}`);
    }).catch(e => { console.error(`${url}: ${e.message}`); process.exit(1); });
  ' "http://localhost:$SHIM_LOCAL_PORT$SHIM_PATH" \
    || die "the MailSlurper shim is not answering on container port $SHIM_PORT path $SHIM_PATH (pending feedback-loop-ai/swarmail#314?)"
}

shim_endpoint() { echo "http://localhost:$SHIM_LOCAL_PORT$SHIM_PATH"; }

repoint() {
  validate_inputs
  require_own_snapshot
  local uri
  if [ "$SMTP_MODE" = "plain" ]; then
    # Kratos enforces STARTTLS on smtp:// unless disable_starttls=true, and the
    # trial runs Swarmail without a certificate. No userinfo: see INBOX above.
    uri="smtp://$RELEASE:1025/?disable_starttls=true"
    cat > "$WORK/notifications-ov.json" <<EOF
[{"name":"EMAIL_SMTP_HOST","value":"$RELEASE"},
 {"name":"EMAIL_SMTP_PORT","value":"1025"},
 {"name":"EMAIL_SMTP_SECURE","value":"false"},
 {"name":"EMAIL_SMTP_USER","value":"$INBOX"},
 {"name":"EMAIL_SMTP_PASSWORD","value":"x"}]
EOF
  else
    # Mirrors MailSlurper's own URI shape (smtps + legacy_ssl = implicit TLS).
    uri="smtps://$INBOX:x@$SMTPS_SERVICE:$SMTPS_PORT/?skip_ssl_verify=true&legacy_ssl=true"
    cat > "$WORK/notifications-ov.json" <<EOF
[{"name":"EMAIL_SMTP_HOST","value":"$SMTPS_SERVICE"},
 {"name":"EMAIL_SMTP_PORT","value":"$SMTPS_PORT"},
 {"name":"EMAIL_SMTP_SECURE","value":"true"},
 {"name":"EMAIL_SMTP_USER","value":"$INBOX"},
 {"name":"EMAIL_SMTP_PASSWORD","value":"x"},
 {"name":"EMAIL_SMTP_REJECT_UNAUTHORIZED","value":"false"}]
EOF
  fi
  printf '[{"name":"COURIER_SMTP_CONNECTION_URI","value":"%s"}]\n' "$uri" > "$WORK/courier-ov.json"

  echo "kratos courier → $uri"
  envtool "$COURIER" "$COURIER_CONTAINER" override "$WORK/courier-ov.json" > "$WORK/courier.patch"
  k patch "$COURIER" --type=json --patch-file "$WORK/courier.patch"
  # The override values are the trial's own non-secret constants.
  echo "notifications → $(tr -d '\n' < "$WORK/notifications-ov.json")"
  envtool "$NOTIFICATIONS" "$NOTIFICATIONS_CONTAINER" override "$WORK/notifications-ov.json" > "$WORK/notifications.patch"
  k patch "$NOTIFICATIONS" --type=json --patch-file "$WORK/notifications.patch"

  k rollout status "$COURIER" --timeout="$ROLLOUT_TIMEOUT"
  k rollout status "$NOTIFICATIONS" --timeout="$ROLLOUT_TIMEOUT"
}

# Called as `restore_workload ... || rc=1`, where set -e does not apply, so
# every step checks its own status: one workload failing must not stop the
# other from being restored, and must never read as success.
restore_workload() { # restore_workload <ref> <container> <snapshot.json>
  local ref="$1" container="$2" snap="$3" tag="${1##*/}" want now after
  fail() { echo "::error::$ref: $*" >&2; return 1; }
  want="$(field envSha < "$snap")" || { fail "unreadable snapshot"; return 1; }
  envtool "$ref" "$container" inspect > "$WORK/now-$tag.json" || { fail "could not read the workload"; return 1; }
  now="$(field envSha < "$WORK/now-$tag.json")" || { fail "could not read the workload"; return 1; }
  if [ "$now" != "$want" ]; then
    envtool "$ref" "$container" restore "$snap" > "$WORK/restore-$tag.patch" || { fail "could not build the restore patch"; return 1; }
    k patch "$ref" --type=json --patch-file "$WORK/restore-$tag.patch" || { fail "restore patch rejected"; return 1; }
    k rollout status "$ref" --timeout="$ROLLOUT_TIMEOUT" || { fail "did not finish rolling back to its recorded env"; return 1; }
  else
    echo "$ref: env already matches the snapshot"
  fi
  envtool "$ref" "$container" inspect > "$WORK/after-$tag.json" || { fail "could not re-read the workload"; return 1; }
  after="$(field envSha < "$WORK/after-$tag.json")" || { fail "could not re-read the workload"; return 1; }
  [ "$after" = "$want" ] || { fail "env does not match the snapshot after restore"; return 1; }
  if [ "$(field templateSha < "$WORK/after-$tag.json")" != "$(field templateSha < "$snap")" ]; then
    # The env is exactly back; something else (an unlocked deploy during the
    # run?) changed another part of the pod template. Not ours to revert.
    echo "::warning::$ref env restored, but its pod template differs from the snapshot outside env — changed by someone else during the run; left as found"
  fi
  describe "$ref restored" "$WORK/after-$tag.json"
}

restore() {
  local any_owner="${1:-}" rc=0 owner
  [ -n "${TRIAL_OWNER:-}" ] || die "TRIAL_OWNER is not set"
  if ! exists "secret/$SNAPSHOT"; then
    # No snapshot ⇒ this trial never repointed or installed anything (the
    # snapshot is taken before both and deleted only after a verified restore).
    echo "no secret/$SNAPSHOT: nothing to restore"
    return 0
  fi
  owner="$(snapshot_owner)"
  if [ "$owner" != "$TRIAL_OWNER" ] && [ "$any_owner" != "--any-owner" ]; then
    echo "::warning::secret/$SNAPSHOT belongs to '$owner', not this run; leaving it. Dispatch mode=restore-only to restore it."
    return 0
  fi
  echo "restoring from the snapshot of '$owner'"
  snapshot_file courier.json "$WORK/snap-courier.json"
  snapshot_file notifications.json "$WORK/snap-notifications.json"
  restore_workload "$COURIER" "$COURIER_CONTAINER" "$WORK/snap-courier.json" || rc=1
  restore_workload "$NOTIFICATIONS" "$NOTIFICATIONS_CONTAINER" "$WORK/snap-notifications.json" || rc=1

  if [ "$rc" -ne 0 ]; then
    # A sender still points at Swarmail: keep it running so mail keeps
    # landing somewhere, rather than strand the sender on a removed host.
    echo "::error::restore incomplete; Swarmail left installed and secret/$SNAPSHOT kept. Re-run with mode=restore-only." >&2
    return 1
  fi

  if helm status "$RELEASE" -n "$NS" >/dev/null 2>&1; then
    helm uninstall "$RELEASE" -n "$NS" --wait --timeout 5m || rc=1
  else
    echo "no Helm release $RELEASE"
  fi
  k delete "service/$SMTPS_SERVICE" "secret/$TLS_SECRET" --ignore-not-found || rc=1
  local r
  for r in "deployment/$RELEASE" "service/$RELEASE" "service/$SMTPS_SERVICE" "secret/$TLS_SECRET"; do
    if exists "$r"; then echo "::error::$r still exists after restore" >&2; rc=1; fi
  done

  if [ "$rc" -ne 0 ]; then
    echo "::error::restore incomplete; secret/$SNAPSHOT kept. Re-run with mode=restore-only." >&2
    return 1
  fi
  k delete secret "$SNAPSHOT"
  echo "restore complete: courier and notifications env exactly as recorded, Swarmail removed"
}

cmd="${1:-}"; shift || true
case "$cmd" in
  preflight) preflight ;;
  snapshot) snapshot ;;
  install) install ;;
  probe-shim) probe_shim ;;
  repoint) repoint ;;
  restore) restore "$@" ;;
  shim-endpoint) validate_inputs >/dev/null; shim_endpoint ;;
  *) echo "usage: $0 {preflight|snapshot|install|probe-shim|repoint|restore [--any-owner]|shim-endpoint}" >&2; exit 2 ;;
esac
