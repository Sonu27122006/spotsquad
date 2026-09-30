@echo off
echo Compiling Smart Parking Java Backend...
if not exist "bin" mkdir "bin"

javac -encoding UTF-8 -cp "lib/*" -d bin src/main/java/com/smartparking/database/*.java src/main/java/com/smartparking/models/*.java src/main/java/com/smartparking/util/*.java src/main/java/com/smartparking/services/*.java src/main/java/com/smartparking/controllers/*.java src/main/java/com/smartparking/Main.java

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Backend compiled successfully into bin/
) else (
    echo [ERROR] Compilation failed with error code %ERRORLEVEL%
)
