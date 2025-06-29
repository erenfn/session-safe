@echo off

echo Building browser-session Docker image...

cd backend

REM Build the browser-session image
docker build -f browser-session.Dockerfile -t browser-session .

if %ERRORLEVEL% EQU 0 (
    echo ✅ browser-session image built successfully!
    echo You can now use the 'New Session' button in the frontend.
) else (
    echo ❌ Failed to build browser-session image
    exit /b 1
) 