#!/usr/bin/env bash
while true; do
  claude -p "$(cat RESUME.md)" --dangerously-skip-permissions
  sleep 5
done
