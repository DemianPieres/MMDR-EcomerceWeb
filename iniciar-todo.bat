@echo off
echo ========================================
echo   MMDR - Iniciando Sistema Completo
echo ========================================
echo.

echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no esta instalado
    echo.
    echo Descarga e instala Node.js desde: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js instalado

echo.
echo [2/3] Instalando dependencias del backend...
cd backend
call npm install
if errorlevel 1 (
    echo [ERROR] No se pudieron instalar las dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas

echo.
echo [3/3] Iniciando servidor backend...
echo.
echo ========================================
echo  Backend ejecutandose en puerto 4000
echo  Abre productos.html en tu navegador
echo  Presiona Ctrl+C para detener
echo ========================================
echo.

call npm start

pause


