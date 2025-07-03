@echo off

echo Building browser-session Docker image...

REM Check if .env file exists in root directory and load VNC_PASSWORD only
if exist .env (
    echo ✅ Found .env file in root directory, loading VNC_PASSWORD...
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="VNC_PASSWORD" (
            set VNC_PASSWORD=%%b
            echo   Loaded: VNC_PASSWORD=%%b
        )
    )
    echo.
) else (
    echo ❌ No .env file found in root directory
    echo.
)

cd backend

REM Build the browser-session image
docker build -f browser-session.Dockerfile -t browser-session .

if %ERRORLEVEL% EQU 0 (
    echo ✅ browser-session image built successfully!
    echo You can now use the 'New Session' button in the frontend.
    echo.
    echo Note: VNC_PASSWORD will be passed at runtime from environment variables.
) else (
    echo ❌ Failed to build browser-session image
    exit /b 1
) 