#!/usr/bin/env python3

import argparse
import os
import subprocess

def main():
    args = parse_arguments()

    package_name = args.name if args.name else args.lambda_dir.rsplit("/", 1)[0]
    main_handler = args.main_handler if args.main_handler else "index"

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
    help_desc = [
        "This script takes a lambda folder and generates deployable Node.js lambda zip package out of it. This zip can be uploaded as-is to S3 to simplify lambda deployment.",
        "This script assumes that: the handler file in the root of the folder, your source files are in ./modules/, your dependencies are in ./node_modules/"
    ]

    parser = argparse.ArgumentParser(description="\n".join(help_desc))
    parser.add_argument("lambda_dir", help="Directory pointing to the lambda")
    parser.add_argument("-p", "--prod-mode", dest="prod_mode", action="store_true", help="Generate a production package (runs npm prune --production)")
    parser.add_argument("-n", "--name", dest="name", action="store", help="Filename override for the generated package (default: uses the last part of the lambda directory path")
    parser.add_argument("-m", "--main-handler", dest="main_handler", action="store", help="Filename of the main handler file (default: index). No need to specify the filetype, .js is already implied")

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

def generate_lambda_package(package_name, main_handler):
    print("[INFO] Generating lambda package")
    try:
        command = "zip -r %s ./%s.js modules node_modules" % (package_name, main_handler)
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