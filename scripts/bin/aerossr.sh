#!/usr/bin/env bash

basedir=$(dirname "$(readlink -f "$0")")

exe=""
nodeArgs=()
args=("$@")

if [ "${BASH_VERSINFO:-0}" -lt 4 ]; then
    # Fix case when both the Windows and Linux builds of Node
    # are installed in the same directory
    exe="../dist/cli/bin/index.cjs"
else
    exe="../dist/cli/bin/index.mjs"
fi

"$basedir/$exe" "${nodeArgs[@]}" "${args[@]}"
exit $?