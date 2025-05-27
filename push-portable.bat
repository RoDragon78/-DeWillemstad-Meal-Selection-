@echo off
:: SETUP ENV PATH TO USE PORTABLE NODE AND GIT
set "NODE_PATH=C:\Users\LucianDraguloiuRiver\OneDrive - River Cruises Holding BV\Desktop\NODE"
set "GIT_PATH=C:\Users\LucianDraguloiuRiver\OneDrive - River Cruises Holding BV\Desktop\GIT"
set "PATH=%NODE_PATH%;%NODE_PATH%\bin;%GIT_PATH%\cmd;%PATH%"

:: GO TO PROJECT FOLDER
cd /d "C:\Users\LucianDraguloiuRiver\OneDrive - River Cruises Holding BV\Desktop\FINAL V.238"

:: SET REMOTE GITHUB REPO
set REPO_URL=https://github.com/RoDragon78/-DeWillemstad-Meal-Selection-.git

:: ENSURE REMOTE IS SET
echo.
echo Setting Git remote to:
echo %REPO_URL%
git remote set-url origin %REPO_URL% 2>nul || git remote add origin %REPO_URL%

:: ADD AND COMMIT FILES
echo.
echo Adding files...
git add .

echo.
echo Committing changes...
git commit -m "Pushing final V0 version to GitHub" || echo Nothing to commit.

:: SET BRANCH TO MAIN
echo.
echo Switching to branch main...
git branch -M main

:: PUSH TO GITHUB
echo.
echo Pushing to GitHub...
git push -u origin main

pause
