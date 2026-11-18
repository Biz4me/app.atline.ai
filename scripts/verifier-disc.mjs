/**
 * LES QUATRE COULEURS NE DOIVENT PLUS JAMAIS SE PERMUTER.
 *
 *     node scripts/verifier-disc.mjs
 *
 * ── 🔴 CE QU'IL RÉPARE (18 novembre 2026) ─────────────────────────────────
 *
 * Atline suit les quatre couleurs de Tom « Big Al » Schreiter, décalquées du
 * DISC : **Rouge** dominance/action, **Jaune** influence/enthousiasme,
 * **Vert** stabilité/harmonie, **Bleu** conformité/analyse.
 *
 * `.ai` en portait une rotation à trois — Vert = analytique, Bleu = sociable,
 * Jaune = relationnel — dans **six fichiers**, tous d'accord entre eux. Une
 * erreur cohérente ne se voit pas de l'intérieur : chaque écran confirmait le
 * précédent, et le quiz lui-même attribuait sous la mauvaise étiquette.
 *
 * Trouvée seulement en comparant avec `.online`, qui avait la bonne table.
 * **Deux applications sur la même base de données disaient le contraire l'une
 * de l'autre sur 21 contacts réels.**
 *
 * ── 🧭 CE QU'IL MESURE ────────────────────────────────────────────────────
 *
 * Pas la jolie tournure : la présence, dans la phrase de chaque couleur, d'un
 * mot que cette couleur-là est la seule à pouvoir porter. Un analytique parle
 * de faits ; un enthousiaste parle de fun. Si « fun » réapparaît sous Bleu,
 * c'est que la rotation est revenue.
 */
import { readFileSync } from 'node:fs'

/**
 * POUR CHAQUE COULEUR : au moins un de ces mots doit apparaître dans sa
 * description, et AUCUN mot des autres couleurs.
 *
 * ⚠️ Des mots-RACINES, pas des mots entiers : « analyse », « analytique » et
 * « analyser » doivent tous compter. C'est aussi pour ça qu'on ne borne pas
 * sur `\b`, qui est de toute façon aveugle aux accents en JavaScript.
 */
const SIGNES = {
  // ⚠️ PAS « vite » TOUT SEUL : il se cache dans « Évite », et le garde a
  // crié sur « Évite les chiffres » dès son premier passage. Un mot court est
  // un mot dangereux quand on cherche par inclusion.
  ROUGE: ['résultat', 'fonceur', 'droit au but', 'décide vite', 'frontal', 'chiffré'],
  JAUNE: ['fun', 'sociable', 'enthousias', 'énergie', 'spontané', 'ambiance', 'vivant'],
  VERT: ['relationnel', 'harmonie', 'bienveill', 'sans pression', 'écoute', 'lien'],
  BLEU: ['analy', 'factuel', 'preuve', 'rigoureux', 'précis', 'scepticisme'],
}

/**
 * LES ENDROITS QUI DÉCRIVENT UNE COULEUR. Chacun porte une table dont les
 * clés sont les quatre couleurs ; on lit la ligne de chaque clé.
 *
 * 🔴 UNE LISTE ÉCRITE, et c'est volontaire : un balayage de tout le dépôt
 * attraperait les questions du quiz, dont les réponses parlent justement de
 * fun et de chiffres sans décrire une couleur. Mieux vaut six chemins qu'on
 * met à jour qu'un filet qui crie.
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
 * 🔴 LE CONTRÔLE POSITIF D'ABORD. On prouve que le détecteur distingue, sur
 * la phrase exacte qui était fausse et sur celle qui la remplace. Sans ça,
 * « aucune faute » ne distinguerait pas une table juste d'un détecteur mort.
 */
const FAUSSE = "Profil BLEU (social) : sois enthousiaste, mise sur le fun."
const JUSTE = "Profil BLEU (analytique) : sois factuel, précis, calme."
const porte = (txt, couleur) => SIGNES[couleur].some((m) => txt.toLowerCase().includes(m))
if (!porte(FAUSSE, 'JAUNE') || porte(FAUSSE, 'BLEU')) {
  console.error('✗ le détecteur ne reconnaît plus la phrase FAUSSE de .ai')
  fautes++
}
if (!porte(JUSTE, 'BLEU') || porte(JUSTE, 'JAUNE')) {
  console.error('✗ le détecteur ne reconnaît plus la phrase JUSTE')
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
    /**
     * La ligne qui décrit CETTE couleur : celle où son nom sert de clé ou de
     * valeur, suivie de texte français. On prend toutes les lignes qui la
     * nomment et qui portent au moins un signe de couleur.
     */
    const lignes = texte
      .split('\n')
      .filter((l) => l.includes(couleur))
      .filter((l) => Object.values(SIGNES).flat().some((m) => l.toLowerCase().includes(m)))
    for (const l of lignes) {
      const bas = l.toLowerCase()
      // ⚠️ Une ligne qui nomme DEUX couleurs (un ternaire) ne se juge pas :
      // on ne saurait pas quel morceau appartient à laquelle.
      if (Object.keys(SIGNES).filter((c) => l.includes(c)).length > 1) continue
      // ⚠️ NI UN COMMENTAIRE. Celui qui raconte le défaut cite forcément les
      // mots du défaut — et le garde criait sur l'explication de sa propre
      // raison d'être.
      const nu = l.trim()
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) continue
      verifiees++
      /**
       * 🔴 UNE SEULE RÈGLE : la couleur doit porter au moins un de SES signes.
       *
       * J'en avais écrit une seconde — « et aucun signe d'une autre » — et
       * elle criait sur « Évite les chiffres », qui est un conseil parfaitement
       * juste pour un Jaune. Un garde qui refuse les contrastes refuse la
       * moitié des bons textes.
       *
       * 🧭 ET ELLE NE SERVAIT À RIEN : une couleur permutée ne porte aucun de
       * ses propres signes — un Bleu devenu « fun, sociable » tombe sur cette
       * règle-ci. La seconde n'ajoutait que du bruit.
       */
      if (!attendus.some((m) => bas.includes(m))) {
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
  console.error(`\n${fautes} faute(s). Rouge agit, Jaune enthousiasme, Vert apaise, Bleu analyse.`)
  process.exit(1)
}
console.log(`✓ ${verifiees} descriptions de couleur examinées, aucune permutation.`)
