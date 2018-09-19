#!/bin/bash

echo $PWD

original_location=$PWD
lambda_name=$1
root_lambda_path="./bot_lambdas/$lambda_name"

if [ ! -d "$root_lambda_path" ]; then
  # Control will enter here if $DIRECTORY doesn't exist.
  echo "[ERROR] directory $root_lambda_path does not exist, check input or your current directory location"
  exit 1
fi

cd "$root_lambda_path"

echo "[INFO] Removing existing zip folder"
rm "$lambda_name.zip"

echo "[INFO] Pruning non-production node modules"
npm prune --production

echo "[INFO] Zipping lambda package files"
zip -r "$lambda_name.zip" ./index.js modules node_modules

echo "[INFO] Reinstalling node modules"
npm install

cd "$original_location"

echo "[SUCCESS] Lambda package zipped to $root_lambda_path/$lambda_name.zip"