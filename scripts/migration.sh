#!/usr/bin/env bash
#
# ÉCRIRE UNE MIGRATION SANS JAMAIS APPROCHER LA PRODUCTION
#   usage :  bash scripts/migration.sh <nom_de_la_migration>
#
# LE PROBLÈME QU'IL RÈGLE. La procédure documentée jusqu'au 30 octobre 2026
# lançait `prisma migrate dev` **sur le serveur, contre la base de production**.
#
# 🔴 `migrate dev` n'est pas une commande de production. Si elle constate que la
# base ne correspond pas à ce que l'historique dit qu'elle devrait être, elle
# PROPOSE DE LA VIDER ET DE LA RECONSTRUIRE. Sur une base de développement c'est
# pratique ; sur celle qui porte les contacts, c'est la fin.
#
# LE DESSIN :
#
#   1. un Postgres JETABLE démarre sur le serveur, sur un port à lui
#   2. on y rejoue TOUT l'historique avec `migrate deploy` -> la base correspond
#      exactement aux migrations, donc AUCUNE dérive possible, donc `migrate dev`
#      ne peut pas proposer d'effacement
#   3. un tunnel SSH amène ce port chez nous
#   4. `migrate dev` tourne EN LOCAL contre le tunnel : le fichier SQL naît ici
#      et se commite ici. Rien n'est édité sur le serveur.
#   5. le conteneur et le tunnel sont détruits, quoi qu'il arrive
#
# Ensuite : relire le SQL, committer, pousser, et le serveur applique avec
# `migrate deploy`, qui n'applique que ce qui manque et ne vide JAMAIS rien.
#
set -euo pipefail

NOM="${1:-}"
[ -n "$NOM" ] || { echo "usage : bash scripts/migration.sh <nom_de_la_migration>" >&2; exit 2; }

CLE="${E2E_SSH_KEY:-$HOME/.ssh/hetzner_atline}"
HOTE="${E2E_SSH_HOST:-root@178.105.219.148}"
CONTENEUR=pg-migration-jetable
IMAGE=postgres:18
PORT_DIST=5467          # sur le serveur, loin de 5433 (production) et 5432 (annexes)
PORT_LOCAL=5467
MDP=jetable

ICI="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ICI"

TUNNEL_PID=""
nettoyer() {
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null || true
  ssh -i "$CLE" -o BatchMode=yes "$HOTE" "docker rm -f $CONTENEUR >/dev/null 2>&1" || true
  echo "  conteneur et tunnel détruits"
}
trap nettoyer EXIT

echo "=== 1. le port $PORT_DIST est-il libre sur le serveur ?"
occupe=$(ssh -i "$CLE" -o BatchMode=yes "$HOTE" "ss -tln | grep -c ':$PORT_DIST ' || true")
[ "$occupe" = "0" ] || { echo "  🔴 le port $PORT_DIST est occupé sur le serveur, je ne touche à rien." >&2; exit 1; }

echo "=== 2. Postgres jetable sur le serveur"
ssh -i "$CLE" -o BatchMode=yes "$HOTE" \
  "docker rm -f $CONTENEUR >/dev/null 2>&1; \
   docker run -d --name $CONTENEUR -e POSTGRES_PASSWORD=$MDP \
     -p 127.0.0.1:$PORT_DIST:5432 $IMAGE >/dev/null" \
  || { echo "  🔴 démarrage impossible" >&2; exit 1; }

pret=0
for _ in $(seq 1 60); do
  if ssh -i "$CLE" -o BatchMode=yes "$HOTE" "docker exec $CONTENEUR pg_isready -U postgres" >/dev/null 2>&1; then pret=1; break; fi
  sleep 2
done
[ "$pret" = 1 ] || { echo "  🔴 le conteneur ne répond pas" >&2; exit 1; }
ssh -i "$CLE" -o BatchMode=yes "$HOTE" "docker exec $CONTENEUR psql -U postgres -q -c 'create database atelier'" >/dev/null
echo "  prêt"

echo "=== 3. tunnel SSH vers ce port"
ssh -i "$CLE" -o BatchMode=yes -o ExitOnForwardFailure=yes \
    -L "$PORT_LOCAL:127.0.0.1:$PORT_DIST" -N "$HOTE" &
TUNNEL_PID=$!
sleep 3
kill -0 "$TUNNEL_PID" 2>/dev/null || { echo "  🔴 le tunnel n'a pas tenu" >&2; exit 1; }

export DATABASE_URL="postgresql://postgres:$MDP@127.0.0.1:$PORT_LOCAL/atelier?schema=public"

# 🔴 GARDE-FOU : on vérifie qu'on ne parle PAS à la production. Le port 5433 est
# celui de la base qui porte les contacts. Une faute de frappe ici et `migrate
# dev` proposerait d'effacer la vraie base.
case "$DATABASE_URL" in
  *":5433/"*|*"atline_db"*) echo "  🔴 ARRÊT : l'adresse ressemble à la PRODUCTION." >&2; exit 1 ;;
esac
echo "  tunnel ouvert, et l'adresse n'est pas celle de la production"

echo "=== 4. on rejoue tout l'historique dans l'atelier"
echo "  $(ls -1 prisma/migrations | grep -v migration_lock | wc -l) migrations à appliquer"
npx prisma migrate deploy 2>&1 | tail -5 | sed 's/^/    /'

echo "=== 5. on écrit la nouvelle migration (aucune dérive possible ici)"
npx prisma migrate dev --name "$NOM" 2>&1 | tail -12 | sed 's/^/    /'

echo
echo "=== CE QUI VIENT D'ÊTRE ÉCRIT"
git status --porcelain prisma/ | sed 's/^/  /'

cat <<'FIN'

  ── La suite, à la main et dans cet ordre ─────────────────────────────────
  1. RELIRE le SQL généré. C'est le moment où une migration destructrice se
     voit, et le seul.
  2. git add prisma/ && git commit && git push
  3. sur le serveur :
       cd /opt/atline/atline-app
       DATABASE_URL="$(grep DATABASE_URL .env.local | cut -d= -f2-)" \
         npx prisma migrate deploy
     `migrate deploy` n'applique que ce qui manque et ne vide JAMAIS rien.
  4. puis le déploiement normal : scripts/deployer.sh app
FIN
