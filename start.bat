@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo  MeuSaldo - Iniciando
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado.
  echo Instale o Node.js LTS em: https://nodejs.org
  echo Depois rode setup.bat.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Dependencias nao encontradas.
  echo Rode setup.bat primeiro.
  echo.
  pause
  exit /b 1
)

if not exist "server\.env" (
  echo Arquivo server\.env nao encontrado.
  echo Rode setup.bat primeiro.
  echo.
  pause
  exit /b 1
)

echo Abrindo servidor do MeuSaldo...
start "MeuSaldo Server" cmd /k "cd /d "%~dp0" && npm run dev"

echo Aguarde alguns segundos...
timeout /t 5 /nobreak >nul

start http://localhost:5173

echo.
echo O MeuSaldo abriu no navegador.
echo Para parar o projeto, feche a janela "MeuSaldo Server".
echo.
pause
