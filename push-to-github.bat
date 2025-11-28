@echo off
echo ================================================
echo   Push Invoice Processing System to GitHub
echo ================================================
echo.

REM Check if remote is already set
git remote -v | findstr "origin" >nul 2>&1
if errorlevel 1 (
    echo Remote 'origin' not configured yet.
    echo.
    echo Please set your GitHub repository URL:
    echo Example: git remote add origin https://github.com/YOUR_USERNAME/invoice-processing-system.git
    echo.
    echo After setting the remote, run this script again.
    pause
    exit /b 1
)

echo Current Git status:
echo.
git status
echo.

echo Configured GitHub remote:
git remote -v
echo.

set /p CONFIRM="Do you want to push to GitHub? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Push cancelled.
    pause
    exit /b 0
)

echo.
echo Pushing to GitHub...
echo.

git push -u origin main

if errorlevel 1 (
    echo.
    echo ================================================
    echo   Push FAILED!
    echo ================================================
    echo.
    echo Common issues:
    echo 1. You need to use a Personal Access Token (not password)
    echo 2. Get token from: https://github.com/settings/tokens
    echo 3. Make sure the repository exists on GitHub
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ================================================
    echo   Push SUCCESSFUL!
    echo ================================================
    echo.
    echo Your code is now on GitHub!
    echo.
    pause
)
