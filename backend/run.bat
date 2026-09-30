@echo off
echo Starting Smart Parking Java Backend on port 5000...
if not exist "bin\com\smartparking\Main.class" (
    call compile.bat
)
java -cp "bin;lib/*" com.smartparking.Main
