#!/bin/bash

# Script pour démarrer le tunnel Bore proprement

echo "🚀 Démarrage du tunnel Bore..."

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pkill -f "bore" 2>/dev/null
pkill -f "mysqlProxy" 2>/dev/null
sleep 2

# Démarrer le proxy API
echo "📡 Démarrage du proxy API sur le port 3002..."
cd "$(dirname "$0")/.."
npm run tunnel:proxy > tunnel-bore.log 2>&1 &
PROXY_PID=$!
sleep 3

# Vérifier que le proxy est démarré
if ! ps -p $PROXY_PID > /dev/null; then
    echo "❌ Erreur : Le proxy n'a pas démarré"
    exit 1
fi

echo "✅ Proxy API démarré (PID: $PROXY_PID)"

# Démarrer le tunnel Bore
echo "🌐 Création du tunnel Bore..."
bore local 3002 --to bore.pub >> tunnel-bore.log 2>&1 &
BORE_PID=$!
sleep 5

# Extraire l'URL du tunnel depuis les logs
TUNNEL_URL=$(grep -o "bore.pub:[0-9]*" tunnel-bore.log | tail -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Erreur : Impossible de trouver l'URL du tunnel"
    exit 1
fi

echo "✅ Tunnel Bore créé : http://$TUNNEL_URL"
echo ""
echo "📋 Informations :"
echo "   URL : http://$TUNNEL_URL"
echo "   Token : changez-ce-token-en-production"
echo "   Logs : tunnel-bore.log"
echo ""
echo "Pour arrêter : pkill -f 'bore\|mysqlProxy'"

