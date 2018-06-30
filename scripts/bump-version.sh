#!/bin/bash
set -eux

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR/..

if [ -z "${1:-}" ]; then
    set -- "patch"
fi

export npm_config_git_tag_version=false
NPM_VERSION=$(npm version $1)
VERSION=${NPM_VERSION:1}

git commit -am "release: $VERSION"
