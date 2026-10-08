#!/bin/bash

# ==========================================
#   INSTALADOR - EMAIL MARKETING (LINUX)
# ==========================================

set -e

echo "=========================================="
echo "  INSTALADOR - EMAIL MARKETING (LINUX)"
echo "=========================================="
echo ""

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ [ERROR] Node.js no está instalado."
    echo "Por favor instálalo (ej. curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs)"
    exit 1
fi

echo "✅ Node.js detectado: $(node -v)"
echo "✅ npm detectado: $(npm -v)"
echo ""

# 2. Instalar Backend
echo "[1/3] 📦 Instalando dependencias del BACKEND..."
cd backend
npm install
cd ..

# 3. Instalar Frontend
echo ""
echo "[2/3] 📦 Instalando dependencias del FRONTEND..."
cd frontend
npm install --legacy-peer-deps
cd ..

# 4. Configurar Variables de Entorno
echo ""
echo "[3/3] ⚙️ Configurando archivos de entorno (.env)..."

if [ ! -f "backend/.env" ]; then
    echo "Creando backend/.env desde backend/.env.example..."
    cp backend/.env.example backend/.env
    echo "✅ [OK] Archivo backend/.env creado."
else
    echo "ℹ️ [SKIP] El archivo backend/.env ya existe."
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "Creando frontend/.env.local..."
    cp backend/.env frontend/.env.local
    echo "✅ [OK] Archivo frontend/.env.local creado."
else
    echo "ℹ️ [SKIP] El archivo frontend/.env.local ya existe."
fi

echo ""
echo "=========================================="
echo "  🎉 INSTALACIÓN COMPLETADA CON ÉXITO"
echo "=========================================="
echo ""
echo "👉 Siguiente paso: edita tus credenciales en el backend:"
echo "   nano backend/.env"
echo ""
echo "👉 Para probar la notificación de WhatsApp:"
echo "   cd backend && npm run notify:test"
echo ""
echo "👉 Para ejecutar el Scheduler en segundo plano (con PM2):"
echo "   cd backend && pm2 start npm --name 'email-scheduler' -- run scheduler"
echo ""
