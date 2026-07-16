@echo off
echo ============================================
echo  Growth OS - Vercel + PostgreSQL Setup
echo ============================================
echo.
echo STEP 1: Opening Neon integration on Vercel...
echo         (Login with GitHub, click Install, Connect to your project)
start https://vercel.com/integrations/neon
timeout /t 2 >nul
echo.
echo STEP 2: Opening your project settings...
start https://vercel.com/dashboard
echo.
echo STEP 3: After Neon is connected, add these env vars if missing:
echo   JWT_SECRET = growthos_secret_2026
echo   JWT_EXPIRE = 7d
echo   VITE_DEMO_PHASE = 1
echo   CLIENT_URL = https://realestate-growth-os.vercel.app
echo.
echo STEP 4: Redeploy from Vercel dashboard
echo.
echo Demo login after deploy: owner@skyline.com / password123
echo (Auto-seeded on first deploy)
echo.
pause
