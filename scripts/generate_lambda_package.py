#!/usr/bin/env python3

import argparse
import os
import subprocess

def main():
    args = parse_arguments()

    package_name = args.name if args.name else args.lambda_dir.rsplit("/", 1)[0]

    if not os.path.isdir(args.lambda_dir):
        print("[ERROR] directory %s does not exist, check input or your current directory location" % args.lambda_dir)
        exit()

    os.chdir(args.lambda_dir)

    lambda_package = "./%s.zip" % package_name
    if os.path.exists(lambda_package):
        remove_old_zipfile(lambda_package)

    if args.prod_mode:
        execute_production_prune()

    generate_lambda_package(package_name)

    if args.prod_mode:
        reinstall_node_modules()
    
    print("[SUCCESS] Lambda package zipped to %s/%s.zip" % (args.lambda_dir, package_name))

def parse_arguments():
    parser = argparse.ArgumentParser(description="BailemosHelsinki lambda package generator script")
    parser.add_argument("lambda_dir", help="Directory pointing to the lambda")
    parser.add_argument("-p", "--prod-mode", dest="prod_mode", action="store_true", help="Generate a production package (runs npm prune --production)")
    parser.add_argument("-n", "--name", dest="name", action="store", help="Filename override for the generated package (default: uses the last token in the lambda directory name")

    return parser.parse_args()

def remove_old_zipfile(filepath):
    print("[INFO] Removing existing zip folder")
    try:
        os.remove(filepath)
    except OSError as error:
        print("[ERROR] %s" % str(error))
        exit()

def execute_production_prune():
    print("[INFO] Pruning non-production node modules")
    try:
        subprocess.check_call("npm prune --production", shell=True)
    except CalledProcessError as error:
        print("[ERROR] %s" % str(error))
        exit()

def generate_lambda_package(package_name):
    print("[INFO] Generating lambda package")
    try:
        command = "zip -r %s ./index.js modules node_modules" % package_name
        subprocess.check_call(command, shell=True)
    except CalledProcessError as error:
        print("[ERROR] %s" % str(error))
        exit()

def reinstall_node_modules():
    print("[INFO] Reinstalling node modules")
    try:
        subprocess.check_call("npm install", shell=True)
    except CalledProcessError as error:
        print("[ERROR] %s" % str(error))
        exit()

if __name__ == "__main__":
    main()