#!/bin/bash
set -e

echo "Removendo node_modules e package-lock.json..."
rm -rf node_modules package-lock.json

echo "Limpando cache do npm..."
npm cache clean --force

echo "Reinstalando dependências..."
npm install

echo "Done! Dependências foram reinstaladas com sucesso."
