#!/usr/bin/env bash
# 43-fetch-blobs.sh: fetch the blobs named in a keys file from the off-site file
# backup bucket into a local folder, for 43-file-store-body-scan.py scan.
#
# Read-only on the bucket (GetObject). Run it yourself: it needs S3 credentials
# in the environment (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) that may read the
# bucket. The blobs are real user content: keep the folder local, never commit it.
#
# usage: 43-fetch-blobs.sh <keys_file> <dest_dir> <bucket> <endpoint_url> [region]
#   keys_file  written by: 43-file-store-body-scan.py keys <keys_file> [db] [all|gap]
#   example (acceptance; bucket and endpoint from the infrastructure-operations
#   acceptance overlay of file-backup-service):
#     ( set -a; . <file with the S3 keys, kept outside the repository>; set +a
#       ./43-fetch-blobs.sh keys.txt blobs/acc <bucket> https://s3.nl-ams.scw.cloud )
# Object key layout: <hash[0:2]>/<hash[2:4]>/<hash>, no prefix, no compression.
# A key the bucket does not hold is counted as missing, not as an error.
# FETCH_JOBS sets the number of parallel downloads (default 8).
set -uo pipefail
keys=${1:?keys file}; dest=${2:?dest dir}; bucket=${3:?bucket}; endpoint=${4:?endpoint url}
# region for request signing: 5th argument, else read from a Scaleway endpoint, else the environment
region=${5:-$(printf '%s' "$endpoint" | sed -nE 's#https?://s3\.([a-z0-9-]+)\.scw\.cloud.*#\1#p')}
mkdir -p "$dest"
jobs=${FETCH_JOBS:-8}
export dest bucket endpoint region
fetch_one() {
  k=$1
  [ -s "$dest/$k" ] && { echo had; return; }
  mkdir -p "$dest/$(dirname "$k")"
  if aws s3api get-object --bucket "$bucket" --key "$k" --endpoint-url "$endpoint" ${region:+--region "$region"} "$dest/$k" >/dev/null 2>>"$dest.errors"; then
    echo ok
  else
    rm -f "$dest/$k"; echo missing
  fi
}
export -f fetch_one
: > "$dest.errors"
grep . "$keys" | xargs -P "$jobs" -I{} bash -c 'fetch_one "$1"' _ {} | sort | uniq -c > "$dest.result"
ok=$(awk '$2=="ok"{print $1}' "$dest.result"); had=$(awk '$2=="had"{print $1}' "$dest.result"); missing=$(awk '$2=="missing"{print $1}' "$dest.result")
echo "fetched=${ok:-0} already_there=${had:-0} not_in_bucket_or_denied=${missing:-0} of $(grep -c . "$keys") keys"
# error kinds only (the messages name no secret; keys are content hashes)
[ -s "$dest.errors" ] && grep -o '(\w*)' "$dest.errors" | sort | uniq -c
du -sh "$dest" | cut -f1
