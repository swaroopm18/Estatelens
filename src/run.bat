@echo off
cd /d %~dp0
if not exist out mkdir out
if exist out\*.class del /q out\*.class

echo [1/2] Compiling Java...
javac -d out src\*.java
if errorlevel 1 exit /b 1

echo [2/2] Starting EstateLens...
java -cp out Main
