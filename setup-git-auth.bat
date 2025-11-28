@echo off
echo ================================================
echo   GitHub Authentication Setup Helper
echo ================================================
echo.
echo This script will help you authenticate with GitHub.
echo.
echo You have 3 options:
echo.
echo 1. Use Personal Access Token (Recommended)
echo 2. Use GitHub Desktop (Easiest - No password needed)
echo 3. Set GitHub password first
echo.
echo ================================================
echo   Option 1: Personal Access Token
echo ================================================
echo.
echo Steps:
echo 1. Open: https://github.com/settings/tokens
echo 2. Click "Generate new token (classic)"
echo 3. Check the "repo" scope
echo 4. Generate and copy the token
echo 5. Run: git push -u origin main
echo 6. Username: nehaprinto
echo 7. Password: [Paste your token]
echo.
pause
echo.
echo ================================================
echo   Option 2: GitHub Desktop (Easiest)
echo ================================================
echo.
echo Steps:
echo 1. Download from: https://desktop.github.com
echo 2. Install and sign in (uses your browser login)
echo 3. File -^> Add Local Repository
echo 4. Select: C:\Users\Neha S\invoice-processing-system
echo 5. Click "Publish repository"
echo.
pause
echo.
echo ================================================
echo   Option 3: Set Password
echo ================================================
echo.
echo Steps:
echo 1. Open: https://github.com/password_reset
echo 2. Enter your Gmail address
echo 3. Check email and set password
echo 4. Run: git push -u origin main
echo 5. Use your new password
echo.
pause
echo.
echo Opening GitHub settings in your browser...
start https://github.com/settings/tokens
echo.
echo Once you have your token, run:
echo   cd "C:\Users\Neha S\invoice-processing-system"
echo   git push -u origin main
echo.
pause
