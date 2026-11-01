#!/usr/bin/env bash
#
# Refuse de laisser partir une route d'API que rien ne garde.
#
# 🔴 POURQUOI CE SCRIPT EXISTE.
# Jusqu'au 1er novembre 2026, middleware.ts laissait passer TOUT /api/ : les
# 109 routes étaient chacune seule gardienne d'elle-même, sans deuxième ligne
# de défense. Trois d'entre elles servaient leur contenu à un inconnu sans que
# rien ne crie — 69 Ko de synthèses de livres, 4 329 caractères de doctrine
# Nova, 134 652 caractères de leçons pour un seul module. Le défaut n'était pas
# qu'une route avait été oubliée : c'était que l'oubli était INDÉTECTABLE.
#
# Ce script est l'instrument qui le rend détectable, et il REFUSE (exit 1)
# plutôt que de prévenir. Une vérification qui ne commande rien est de la
# décoration.
#
# 🔴 IL LIT LA LISTE BLANCHE DANS middleware.ts, il ne la recopie jamais :
# deux copies divergent toujours, et c'est en recopiant des faits dans
# plusieurs fichiers qu'on fabrique les pièges.
#
# Usage : bash scripts/verifier-gardes-api.sh
# Appelé par /opt/atline/scripts/deployer.sh avant la construction.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

MIDDLEWARE=middleware.ts
[ -f "$MIDDLEWARE" ] || { echo "🔴 $MIDDLEWARE introuvable depuis $(pwd)"; exit 1; }
[ -d app/api ] || { echo "🔴 app/api introuvable depuis $(pwd)"; exit 1; }

# --- les deux listes, extraites du middleware -------------------------------
extraire () {
  # $1 = nom de la constante. On prend de sa déclaration jusqu'au ] fermant.
  # 🔴 Le motif est ANCRÉ sur `= [` et pas seulement sur le début du nom : avec
  # `/^const $1/` tout seul, renommer la constante en `API_PUBLIQUE_AUTRE` la
  # laissait matcher, et le script annonçait « ✅ 109/109 » en ayant lu une liste
  # qui n'existait plus. Trouvé le 1er novembre 2026 en provoquant la panne.
  sed -n "/^const $1[[:space:]]*=[[:space:]]*\[/,/^]/p" "$MIDDLEWARE" \
    | grep -oE "'/api/[^']*'" | tr -d "'"
}
mapfile -t PUBLIQUE < <(extraire API_PUBLIQUE)
mapfile -t A_JETON  < <(extraire API_A_JETON)

if [ ${#PUBLIQUE[@]} -eq 0 ] && [ ${#A_JETON[@]} -eq 0 ]; then
  echo "🔴 aucune entrée lue dans $MIDDLEWARE (API_PUBLIQUE / API_A_JETON)."
  echo "   Le middleware a changé de forme : ce script ne mesure plus rien."
  exit 1
fi

# Une entrée finissant par / est un préfixe, sinon c'est un chemin exact.
dans_liste () {
  local chemin="$1"; shift
  local e
  for e in "$@"; do
    case "$e" in
      */) [ "${chemin#"$e"}" != "$chemin" ] && return 0
          [ "$chemin" = "${e%/}" ] && return 0 ;;
      *)  [ "$chemin" = "$e" ] && return 0 ;;
    esac
  done
  return 1
}

# --- les deux façons de s'authentifier dans cette app ----------------------
# 🔴 DEUX idiomes de session cohabitent : getServerSession(authOptions) dans la
# plupart des routes, getToken({ req, secret }) dans la famille atlas/stt. Un
# détecteur qui n'en connaît qu'un déclare saines des routes ouvertes, ou
# ouvertes des routes saines. Les deux erreurs ont été commises le 1er novembre.
MOTIF_SESSION='getServerSession|getToken[[:space:]]*\('
MOTIF_JETON='INTERNAL_API_SECRET|RELANCE_API_TOKEN|RADAR_SECRET|GMAIL_PUSH_TOKEN|CRON_SECRET|x-chatwoot-signature|x-internal-secret'

ouvertes=(); jeton_hors_liste=(); publiques=(); ok=0; total=0

while IFS= read -r f; do
  total=$((total + 1))
  rep="${f%/route.ts}"; rep="${rep%/route.js}"
  url="/${rep#app/}"

  session=0; jeton=0
  grep -qE "$MOTIF_SESSION" "$f" && session=1
  grep -qE "$MOTIF_JETON"   "$f" && jeton=1

  if [ "$session" -eq 1 ]; then
    # Se garde elle-même par session : le middleware est sa seconde ligne.
    ok=$((ok + 1))
  elif [ "$jeton" -eq 1 ]; then
    # S'authentifie par son propre jeton, donc SANS session. Si elle n'est pas
    # dans la liste blanche, le middleware répondra 401 à son appelant externe
    # (service IA, n8n, Gmail Pub/Sub, Chatwoot) — et personne ne le verra.
    if dans_liste "$url" "${A_JETON[@]+"${A_JETON[@]}"}" "${PUBLIQUE[@]+"${PUBLIQUE[@]}"}"; then
      ok=$((ok + 1))
    else
      jeton_hors_liste+=("$url")
    fi
  else
    # Rien du tout : acceptable UNIQUEMENT si publique par conception.
    if dans_liste "$url" "${PUBLIQUE[@]+"${PUBLIQUE[@]}"}"; then
      publiques+=("$url"); ok=$((ok + 1))
    else
      ouvertes+=("$url")
    fi
  fi
done < <(find app/api -name 'route.ts' -o -name 'route.js' | sort)

# --- le verdict -------------------------------------------------------------
echo "  gardes d'API : $ok/$total conformes, ${#publiques[@]} publiques assumées"

if [ ${#ouvertes[@]} -gt 0 ]; then
  echo "  🔴 ${#ouvertes[@]} route(s) que RIEN ne garde, et absente(s) de API_PUBLIQUE :"
  printf '      %s\n' "${ouvertes[@]}"
  echo "     → soit poser une garde dans la route, soit l'inscrire dans"
  echo "       API_PUBLIQUE de $MIDDLEWARE si elle est publique par conception."
fi

if [ ${#jeton_hors_liste[@]} -gt 0 ]; then
  echo "  🔴 ${#jeton_hors_liste[@]} route(s) à jeton absente(s) de la liste blanche :"
  printf '      %s\n' "${jeton_hors_liste[@]}"
  echo "     → le middleware les coupera EN SILENCE. Les inscrire dans"
  echo "       API_A_JETON de $MIDDLEWARE."
fi

if [ ${#ouvertes[@]} -gt 0 ] || [ ${#jeton_hors_liste[@]} -gt 0 ]; then
  exit 1
fi

echo "  ✅ aucune route d'API sans garde"
exit 0
