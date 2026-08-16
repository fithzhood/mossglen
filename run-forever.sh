#!/usr/bin/env bash
#
# Mossglen — the infinite development loop.
#
# Each pass starts a fresh headless Claude session with no memory of the last
# one. That is the design, not a limitation: STATE.md is the handover, and it
# is written every cycle for a session that knows nothing.
#
#   bash run-forever.sh
#
# To stop it: Ctrl-C in this window, or delete the file STOP-LOOP next to this
# script — the loop checks for it between passes and exits cleanly rather than
# killing a session mid-cycle.
#
#   touch STOP-LOOP     # stops after the current pass finishes
#
# Every pass is a paid session. Left running overnight this will start a new
# one every time the previous exhausts its context.

set -u
cd "$(dirname "$0")" || exit 1

mkdir -p logs
pass=0

while true; do
  if [ -f STOP-LOOP ]; then
    echo "STOP-LOOP present — stopping cleanly after $pass pass(es)."
    rm -f STOP-LOOP
    exit 0
  fi

  pass=$((pass + 1))
  stamp=$(date +%Y%m%d-%H%M%S)
  log="logs/pass-${stamp}.log"

  echo "── pass $pass · $stamp ─────────────────────────────"
  echo "   log: $log"

  claude -p "$(cat RESUME.md)" --dangerously-skip-permissions 2>&1 | tee "$log"
  code=${PIPESTATUS[0]}

  echo "   pass $pass exited with $code"

  # A pass that dies instantly is a broken setup, not a finished cycle —
  # backing off stops a bad config from burning sessions in a tight loop.
  lines=$(wc -l < "$log" 2>/dev/null || echo 0)
  if [ "$lines" -lt 5 ]; then
    echo "   suspiciously short pass; backing off 60s"
    sleep 60
  else
    sleep 5
  fi
done
