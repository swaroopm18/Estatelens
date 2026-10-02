#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
mkdir -p out
rm -f out/*.class
 echo "[1/2] Compiling Java..."
javac -d out src/*.java
 echo "[2/2] Starting EstateLens..."
java -cp out Main
