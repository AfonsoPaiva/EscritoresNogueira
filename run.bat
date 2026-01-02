@echo off
REM Load environment variables from .env file and run Spring Boot
REM Usage: run.bat

setlocal enabledelayedexpansion

if not exist ".env" (
    echo ERROR: .env file not found
    echo Please create a .env file in the project root directory.
    exit /b 1
)

echo Loading environment variables from .env file...

for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set line=%%a
    if not "!line:~0,1!"=="#" (
        if not "%%a"=="" (
            set "%%a=%%b"
            echo   Set %%a
        )
    )
)

echo.
echo Environment variables loaded!
echo Starting Spring Boot application...
echo.

cd backend
mvn spring-boot:run
