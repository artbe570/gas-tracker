@echo off
setlocal

echo [1/4] Checking git...
git --version >nul 2>&1
if errorlevel 1 (
  echo Git is not installed. Install Git first: https://git-scm.com/download/win
  pause
  exit /b 1
)

echo [2/4] Staging changes...
git add .

echo [3/4] Creating commit...
set COMMIT_MSG=update %date% %time%
git commit -m "%COMMIT_MSG%" >nul 2>&1
if errorlevel 1 (
  echo No new changes to commit, or commit failed.
)

echo [4/4] Pushing to GitHub...
git push
if errorlevel 1 (
  echo Push failed. Make sure remote is configured and you are logged in.
  pause
  exit /b 1
)

echo Done. Site should auto-update in 1-2 minutes.
pause
exit /b 0
