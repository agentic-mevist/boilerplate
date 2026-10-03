#!/bin/bash
# usage: call.sh <label> <model:clef|clef-flash|GET> <payload.json|url-suffix>
# Secrets are passed to curl via a stdin config so they never appear in argv or output.
set -u
D=/tmp/claude-0/-home-user-boilerplate/de044734-8f8a-51fd-9bea-2c273aaa1f9d/scratchpad/clef_test/live
LABEL=$1; MODEL=$2; ARG=$3
CNT=$D/inference_call_count.txt; [ -f $CNT ] || echo 0 > $CNT
B="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID"
FMT='{"http_code":%{http_code},"t_connect":%{time_connect},"t_appconnect":%{time_appconnect},"t_pretransfer":%{time_pretransfer},"t_starttransfer":%{time_starttransfer},"t_total":%{time_total},"bytes_up":%{size_upload},"bytes_down":%{size_download}}'
CFG=$(printf 'header = "X-Auth-Email: %s"\nheader = "X-Auth-Key: %s"\n' "$CLOUDFLARE_EMAIL" "$CLOUDFLARE_API_KEY")
if [ "$MODEL" = "GET" ]; then
  T=$(echo "$CFG" | curl -sS --max-time 120 -K - "$B/$ARG" -D "$D/$LABEL.headers.txt" -o "$D/$LABEL.response.json" -w "$FMT")
else
  N=$(( $(cat $CNT) + 1 )); if [ $N -gt 30 ]; then echo "BUDGET EXCEEDED"; exit 1; fi; echo $N > $CNT
  jq --arg m "$MODEL" '.model=$m' "$ARG" > "$D/$LABEL.request.json"
  T=$(echo "$CFG" | curl -sS --max-time 120 -K - -X POST -H "Content-Type: application/json" --data-binary @"$D/$LABEL.request.json" "$B/ai/run/@cf/cloudflare/$MODEL" -D "$D/$LABEL.headers.txt" -o "$D/$LABEL.response.json" -w "$FMT")
fi
RAY=$(grep -i '^cf-ray:' "$D/$LABEL.headers.txt" | tr -d '\r' | awk '{print $2}')
TS=$(date -u +%H:%M:%S.%3N)
echo "{\"label\":\"$LABEL\",\"model\":\"$MODEL\",\"utc\":\"$TS\",\"cf_ray\":\"$RAY\",\"timing\":$T}" | tee -a "$D/timings.jsonl"
