#!/bin/bash

# Script de démarrage pour l'application Atifit
# Démarre le backend et le frontend en parallèle

echo "🚀 Démarrage de l'application Atifit..."
echo ""

# Fonction pour nettoyer les processus à la sortie
cleanup() {
    echo ""
    echo "🛑 Arrêt des serveurs..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Démarrer le backend
echo "📡 Démarrage du backend (port 3001)..."
cd server
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
sleep 3

# Vérifier si le backend est démarré
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Erreur: Le backend n'a pas pu démarrer. Vérifiez backend.log"
    exit 1
fi

echo "✅ Backend démarré (PID: $BACKEND_PID)"

# Démarrer le frontend
echo "🎨 Démarrage du frontend (port 5173)..."
cd client
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ Frontend démarré (PID: $FRONTEND_PID)"
echo ""
echo "✨ Application démarrée avec succès!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les serveurs"

# Attendre que les processus se terminent
wait

