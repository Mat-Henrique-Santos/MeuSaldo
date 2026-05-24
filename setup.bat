@echo off
setlocal
cd /d "%~dp0"

echo.
echo ========================================
echo  MeuSaldo - Configuracao inicial
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado.
  echo Instale o Node.js LTS em: https://nodejs.org
  echo Depois rode este arquivo de novo.
  echo.
  if /i not "%~1"=="--no-pause" pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm nao encontrado.
  echo Reinstale o Node.js LTS em: https://nodejs.org
  echo.
  if /i not "%~1"=="--no-pause" pause
  exit /b 1
)

if not exist "server\.env" (
  echo Criando server\.env...
  copy "server\.env.example" "server\.env" >nul
)

echo Instalando dependencias...
call npm install
if errorlevel 1 goto error

echo Preparando Prisma...
call npm run db:generate
if errorlevel 1 goto error

echo Criando/atualizando banco SQLite...
call npm run db:migrate -w server -- --name init
if errorlevel 1 goto error

echo.
echo Tudo pronto.
echo Agora rode start.bat para abrir o MeuSaldo.
echo.
if /i not "%~1"=="--no-pause" pause
exit /b 0

:error
echo.
echo Algo deu errado.
echo Tire print desta tela e envie para quem te mandou o projeto.
echo.
if /i not "%~1"=="--no-pause" pause
exit /b 1
