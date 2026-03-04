#!/bin/bash
systemctl stop nginx
systemctl disable nginx
docker restart easypanel
docker restart traefik
echo "EasyPanel restaurado!"
