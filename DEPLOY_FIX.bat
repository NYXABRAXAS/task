@echo off
echo ========================================================
echo  ProHorizon Render Deployment Fix
echo  Run this from inside the ProHorizon_Render folder
echo ========================================================

:: Remove node_modules from git tracking (keep files locally)
git rm -r --cached node_modules 2>nul
git rm -r --cached logs 2>nul
git rm --cached .env 2>nul

:: Stage everything with new .gitignore
git add .gitignore
git add src/
git add server.js
git add package.json
git add render.yaml
git add .env.example
git add Procfile
git add README.md
git add database/
git add swagger/
git add public/
git add uploads/.gitkeep
git add logs/.gitkeep

:: Commit and push
git commit -m "Fix: remove node_modules from git, add .gitignore, fix DB startup"
git push origin main

echo.
echo ========================================================
echo  DONE - Render will auto-redeploy now
echo  
echo  IMPORTANT: After push, go to Render Dashboard and:
echo  1. Open your service (task-7vvz)
echo  2. Click "Environment" tab
echo  3. Add environment variable:
echo     Key:   DATABASE_URL
echo     Value: (your PostgreSQL connection string)
echo  4. Click "Save Changes" - Render will redeploy
echo ========================================================
pause
