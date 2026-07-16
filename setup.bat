@echo off
setlocal enabledelayedexpansion

echo ==========================================
echo   INSTALADOR - EMAIL MARKETING MEXICO
echo ==========================================
echo.

:: 1. Verificar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Por favor instalalo desde https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Instalar Backend
echo [1/3] Instalando dependencias del BACKEND...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema instalando el backend.
    pause
    exit /b 1
)
cd ..

:: 3. Instalar Frontend
echo.
echo [2/3] Instalando dependencias del FRONTEND...
cd frontend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo [ERROR] Hubo un problema instalando el frontend.
    pause
    exit /b 1
)
cd ..

:: 4. Configurar Variables de Entorno
echo.
echo [3/3] Configurando archivos de entorno (.env)...

if not exist backend\.env (
    echo Creando backend\.env...
    (
    echo DB_HOST=localhost
    echo DB_NAME=email_marketing
    echo DB_USER=postgres
    echo DB_PASS=admin
    echo DB_PORT=5432
    echo.
    echo EMAIL_SERVICE=gmail
    echo.
    echo # Configuración para GMAIL
    echo GMAIL_USER=tu-correo@gmail.com
    echo GMAIL_PASS=contrasena-de-aplicacion-gmail
    echo GMAIL_FROM="Tu Nombre <tu-correo@gmail.com>"
    echo.
    echo # Configuración para SMTP (si EMAIL_SERVICE=smtp)
    echo SMTP_HOST=mail.tudominio.com
    echo SMTP_PORT=587
    echo SMTP_SECURE=false
    echo SMTP_USER=tu-usuario-smtp
    echo SMTP_PASS=tu-contrasena-smtp
    echo SMTP_FROM="Tu Nombre <tu-correo@smtp.com>"
    ) > backend\.env
    echo [OK] Archivo backend\.env creado.
) else (
    echo [SKIP] El archivo backend\.env ya existe.
)

if not exist frontend\.env.local (
    echo Creando frontend\.env.local...
    copy backend\.env frontend\.env.local > nul
    echo [OK] Archivo frontend\.env.local creado.
) else (
    echo [SKIP] El archivo frontend\.env.local ya existe.
)

echo.
echo ==========================================
echo   INSTALACION COMPLETADA CON EXITO
echo ==========================================
echo.
echo Para iniciar el DASHBOARD:
echo   cd frontend
echo   npm run dev
echo.
echo Para iniciar el BACKEND:
echo   cd backend
echo   npm run dev
echo.
echo Recuerda editar los archivos .env con tus credenciales reales.
echo.
pause
