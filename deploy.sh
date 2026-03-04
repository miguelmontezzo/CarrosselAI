#!/bin/bash

echo "==========================================================="
echo "🚀 Iniciando Deploy Automático do CarrosselAI na Hostinger"
echo "Dominio alvo: myprint.com.br"
echo "==========================================================="

# 1. Instalar dependências básicas
echo "> Atualizando pacotes e instalando dependências (Node 20, Nginx)..."
apt update -y
apt install -y curl nginx psmisc git lsof
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. Matar qualquer coisa que use a porta 80 do Nginx
echo "> Liberando a porta 80 de possíveis conflitos..."
fuser -k 80/tcp 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default
systemctl disable apache2 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true

# 3. Configurar Nginx para myprint.com.br
echo "> Configurando Nginx para o domínio myprint.com.br..."
cat > /etc/nginx/sites-available/carrossel <<EOF
server {
    listen 80;
    server_name myprint.com.br www.myprint.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        
        # Aumentamos o Timeout para a NanoBana rodar em paz em background
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOF

# Ativa o site Nginx e reinicia
ln -sf /etc/nginx/sites-available/carrossel /etc/nginx/sites-enabled/
systemctl restart nginx

# 4. Configurar Repositório e código
echo "> Configurando o código fonte em /root/CarrosselAI..."
npm install -g pm2

cd /root
if [ ! -d "CarrosselAI" ]; then
  git clone https://github.com/miguelmontezzo/CarrosselAI.git
fi

cd CarrosselAI
git fetch origin
git checkout main
git reset --hard origin/main

# Copia as variáveis de ambiente base se o env.local não existir
if [ ! -f ".env.local" ]; then
    echo "> Criando .env.local temporário, POR FAVOR EDITE ELE DEPOIS."
    touch .env.local
fi

# 5. Instalar dependências Node e compilar (Demora ~1-2min)
echo "> Instalando pacotes com NPM..."
npm install

echo "> Compilando Next.js (npm run build)..."
npm run build

# 6. Rodar aplicação no PM2
echo "> Reiniciando aplicação em Background com PM2..."
pm2 delete CarrosselAI 2>/dev/null || true
pm2 start "npm run start" --name "CarrosselAI"
pm2 save
pm2 startup

echo "==========================================================="
echo "✅ DEPLOY FINALIZADO COM SUCESSO!"
echo "➡️ Acesse: http://myprint.com.br"
echo "==========================================================="
echo "🚨 IMPORTANTE: Lembre-se de colar as chaves reais do projeto no arquivo /root/CarrosselAI/.env.local caso não tenha feito!"
