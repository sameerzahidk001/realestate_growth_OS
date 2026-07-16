# One-click local setup
Write-Host "Starting PostgreSQL (Docker)..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Waiting for database..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Creating tables..." -ForegroundColor Cyan
Set-Location server
npx prisma db push
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seeding demo data..." -ForegroundColor Cyan
npm run seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Set-Location ..
Write-Host ""
Write-Host "DONE! Run: npm run dev" -ForegroundColor Green
Write-Host "Login: owner@skyline.com / password123" -ForegroundColor Green
