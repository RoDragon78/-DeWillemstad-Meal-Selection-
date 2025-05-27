@echo off
cd /d "C:\Users\LucianDraguloiuRiver\OneDrive - River Cruises Holding BV\Desktop\FINAL V.238"

:: Set your GitHub repo URL here
set REPO_URL=https://github.com/RoDragon78/Unified-Meal-Final.git

echo Initializing Git...
git init

echo Adding remote origin...
git remote add origin %REPO_URL%

echo Adding files...
git add .

echo Committing changes...
git commit -m "Push from V0 final version"

echo Renaming branch to main...
git branch -M main

echo Pushing to GitHub...
git push -u origin main

pause
