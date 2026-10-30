#!/usr/bin/env bash
# usage: run.sh <db> <sqlfile> ; one port-forward session per file
db=$1; f=$2
kubectl port-forward pod/<postgres-pod> 15433:5432 >>pf.log 2>&1 &
pf=$!
sleep 4
psql -h 127.0.0.1 -p 15433 -U synapse-db -d "$db" -w -X -A -f "$f" > "${f%.sql}.out" 2>&1
rc=$?
kill $pf 2>/dev/null; wait $pf 2>/dev/null
echo "rc=$rc lines=$(wc -l < "${f%.sql}.out")"
