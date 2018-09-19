#!/bin/bash

prod_mode=false
lambda_dir=
package_name=
main_handler=

while getopts ":pn:m:" opt; do
    case ${opt} in
        p )
            prod_mode=true
            ;;
        n )
            package_name=$OPTARG
            ;;
        m )
            main_handler=$OPTARG
            ;;
        \? ) 
            echo "Invalid option: ${opt}" 1>&2
            ;;
        : )
            echo "Invalid option: $OPTARG requires an argument" 1>&2
            ;;
    esac
done
shift $((OPTIND -1))

lambda_dir=$1

if [ -z "$package_name" ]; then
    package_name=${lambda_dir##*\/}
fi

if [ -z "$main_handler" ]; then
    main_handler="index"
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
zip -r "$lambda_package" "./$main_handler.js" modules node_modules

if [ $prod_mode = true ]; then
    echo "[INFO] Reinstalling node modules"
    npm install
fi

echo "[SUCCESS] Lambda package zipped to $lambda_dir/$package_name.zip"