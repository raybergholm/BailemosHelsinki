#!/bin/bash

prod_mode=false
lambda_dir=
package_name=

while :; do
    case $1 in
        -p|--prod)
            prod_mode=true
            lambda_dir=$2
            break
            ;;
        *)
            lambda_dir=$1
            break
    esac

    shift
done

if [ -z "$package_name" ]; then
    package_name=${lambda_dir##*\/}
fi

if [ ! -d "$lambda_dir" ]; then
    echo "[ERROR] directory $lambda_dir does not exist, check input or your current directory location"
    exit 1
fi

cd "$lambda_dir"

lambda_package="$package_name.zip"

if [ -f lambda_package ]; then
    echo "[INFO] Removing existing zip folder"
    rm "$lambda_package"
fi

if [ $prod_mode = true ]; then
    echo "[INFO] Pruning non-production node modules"
    npm prune --production
fi

echo "[INFO] Generating lambda package"
zip -r "$lambda_package" ./index.js modules node_modules

if [ $prod_mode = true ]; then
    echo "[INFO] Reinstalling node modules"
    npm install
fi

echo "[SUCCESS] Lambda package zipped to $lambda_dir/$package_name.zip"