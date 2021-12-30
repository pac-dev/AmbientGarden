#!/bin/bash
set -e
cd $(dirname $0)/../
deno run -A ../Teasynth/tools/export.js tracks web/generated/worklets
rsync -av --exclude='_lib' tracks web/generated/
history -c