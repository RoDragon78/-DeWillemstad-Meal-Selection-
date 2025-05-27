@echo off
cd /d "C:\Users\LucianDraguloiuRiver\OneDrive - River Cruises Holding BV\Desktop\FINAL V.238"

:: GitHub repo URL
set REPO_URL=https://github.com/RoDragon78/-DeWillemstad-Meal-Selection-.git

echo Setting Git remote to:
echo %REPO_URL%
git remote set-url origin %REPO_URL%

echo Adding all files...
git add .

echo Committing changes...
git commit -m "Pushing final V0 version to GitHub"

echo Making sure branch is main...
git branch -M main

echo Pushing to GitHub...
git push -u origin main

pause
