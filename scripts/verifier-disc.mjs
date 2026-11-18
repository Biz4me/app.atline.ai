/**
 * LES QUATRE COULEURS DE SCHREITER, ET AUCUNE AUTRE TABLE.
 *
 *     node scripts/verifier-disc.mjs
 *
 * ── 🔴 CE GARDE NAÎT D'UNE ERREUR QUE J'AI COMMISE (18 novembre 2026) ─────
 *
 * Atline suit **Tom « Big Al » Schreiter**, *Les quatre couleurs de
 * personnalités*. Lu dans le livre même :
 *
 *   · **Jaune** — « Aider ». Nourricier, prend soin, réconforte.
 *   · **Bleu** — la fête. Extraverti, bavard, les grands groupes, s'amuser.
 *   · **Vert** — « explications détaillées et logiques ». Organisé, structure,
 *     données concrètes ; préfère un texto à un appel.
 *   · **Rouge** — prendre les rênes. Résultats, compétition, leadership.
 *
 * ⚠️ CE N'EST PAS LE CODE COULEUR DU DISC « DES FORMATEURS ». Celui-là met
 * Jaune sur l'enthousiasme, Vert sur la stabilité et Bleu sur l'analyse. Les
 * deux conventions existent, elles sont incompatibles, et **Atline suit
 * Schreiter** parce que c'est le livre du marketing de réseau.
 *
 * ── 🔴 CE QUI S'EST RÉELLEMENT PASSÉ, ET QUI VAUT PLUS QUE LE GARDE ───────
 *
 * J'ai cru que cette app se trompait, parce que `.online` portait l'autre
 * convention et qu'une page web — à propos du DISC générique, pas du livre —
 * semblait lui donner raison. J'ai « corrigé » six fichiers ici, puis
 * **tourné 21 contacts réels en base**. Tout était faux.
 *
 * 🧭 LE SIGNAL ÉTAIT LÀ ET JE L'AI RETOURNÉ CONTRE LUI-MÊME : six fichiers
 * d'accord entre eux, c'était la marque d'une convention TENUE, et j'y ai lu
 * « une erreur cohérente ». Quand le code est constant et qu'une source
 * extérieure le contredit, **c'est la source qu'il faut vérifier d'abord**.
 * Patrice a donné le livre, et le livre a tranché en trois minutes.
 *
 * Tout a été défait : `disc-rotation.ts --inverse` côté `.online`, un revert
 * ici. Ce fichier est ce qui reste de l'épisode, et il garde la BONNE table.
 */
import { readFileSync } from 'node:fs'

/**
 * POUR CHAQUE COULEUR : au moins un de ces mots doit apparaître dans sa
 * description. Des mots-RACINES, pas des mots entiers — « analyse » et
 * « analytique » comptent tous les deux.
 */
const SIGNES = {
  ROUGE: ['résultat', 'fonceur', 'droit au but', 'décide vite', 'frontal', 'chiffré'],
  BLEU: ['fun', 'sociable', 'énergie', 'spontané', 'ambiance', 'vivant', 'social'],
  VERT: ['analy', 'factuel', 'preuve', 'rigoureux', 'précis', 'scepticisme'],
  JAUNE: ['relationnel', 'harmonie', 'bienveill', 'sans pression', 'écoute', 'lien', 'aider'],
}

/**
 * LES ENDROITS QUI DÉCRIVENT UNE COULEUR.
 *
 * 🔴 UNE LISTE ÉCRITE : un balayage du dépôt attraperait les réponses du
 * quiz, qui parlent de fun et de chiffres sans décrire une couleur.
 */
const FICHIERS = [
  'components/personality-quiz.tsx',
  'app/(app)/contacts/[id]/page.tsx',
  'app/api/contacts/[id]/draft/route.ts',
  'app/onboarding/page.tsx',
  'app/(app)/atlas/page.tsx',
]

let fautes = 0
let verifiees = 0

/**
 * 🔴 LE CONTRÔLE POSITIF D'ABORD, sur les deux conventions. Il doit
 * reconnaître celle de Schreiter et REJETER celle du DISC des formateurs —
 * c'est exactement la confusion qui a coûté 21 contacts.
 */
const porte = (txt, couleur) => SIGNES[couleur].some((m) => txt.toLowerCase().includes(m))
const SCHREITER = "Profil BLEU (social) : mise sur le fun, l'aventure et les gens."
const AUTRE = "Profil BLEU (analytique) : sois factuel, précis, sans hype."
if (!porte(SCHREITER, 'BLEU')) {
  console.error('✗ le détecteur ne reconnaît plus la table de Schreiter')
  fautes++
}
if (porte(AUTRE, 'BLEU') || !porte(AUTRE, 'VERT')) {
  console.error('✗ le détecteur accepterait le code couleur du DISC générique')
  fautes++
}

for (const chemin of FICHIERS) {
  let texte
  try {
    texte = readFileSync(chemin, 'utf8')
  } catch {
    console.error(`✗ ${chemin} est introuvable : la liste de ce garde a vieilli.`)
    fautes++
    continue
  }
  for (const [couleur, attendus] of Object.entries(SIGNES)) {
    const lignes = texte
      .split('\n')
      .filter((l) => l.includes(couleur))
      .filter((l) => Object.values(SIGNES).flat().some((m) => l.toLowerCase().includes(m)))
    for (const l of lignes) {
      const nu = l.trim()
      // Une ligne qui nomme DEUX couleurs (un ternaire) ne se juge pas : on ne
      // saurait pas quel morceau appartient à laquelle.
      if (Object.keys(SIGNES).filter((c) => l.includes(c)).length > 1) continue
      // ⚠️ NI UN COMMENTAIRE : celui qui raconte le défaut cite ses mots.
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) continue
      verifiees++
      /**
       * 🧭 UNE SEULE RÈGLE : la couleur porte au moins un de SES signes. La
       * règle « et aucun signe d'une autre » criait sur « Évite les
       * chiffres », qui est un bon conseil pour un Bleu. Elle n'ajoutait
       * rien : une couleur permutée ne porte de toute façon aucun des siens.
       */
      if (!attendus.some((m) => nu.toLowerCase().includes(m))) {
        console.error(`✗ ${chemin}\n    ${couleur} ne porte aucun de ses signes :\n    « ${nu.slice(0, 150)} »`)
        fautes++
      }
    }
  }
}

if (verifiees < 12) {
  console.error(`✗ seulement ${verifiees} lignes examinées : la sonde ne prouverait rien.`)
  fautes++
}

if (fautes) {
  console.error('\nSchreiter : Rouge dirige, Bleu s’amuse, Vert analyse, Jaune aide.')
  process.exit(1)
}
console.log(`✓ ${verifiees} descriptions de couleur examinées, table de Schreiter respectée.`)
