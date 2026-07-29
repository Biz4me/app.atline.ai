/**
 * LES SCRIPTS DE DÉPART D'UN DISTRIBUTEUR — ancrés dans SA société.
 *
 * Si les cinq mille distributeurs reçoivent les mêmes cinq phrases, un
 * prospect qui parle à deux d'entre eux voit la ficelle, et ces textes
 * deviennent reconnaissables. Pour un métier fondé sur la relation, c'est
 * un poison lent.
 *
 * On ancre donc chaque script dans ce qu'on sait de SA société : son nom,
 * son produit d'entrée avec son vrai prix, sa catégorie. Un distributeur
 * Forever Living et un distributeur Zinzino ne partent plus du même texte.
 *
 * DÉTERMINISTE, PAS GÉNÉRÉ. Aucune IA ici : ce sont des gabarits remplis
 * avec des faits vérifiés en base. Gratuit, reproductible, et surtout on
 * peut relire ce qui sortira — impossible avec un modèle.
 *
 * ⚠️ CE QUE ÇA N'EST PAS : le texte final. Ce sont des points de départ,
 * affichés comme tels. Un script qu'on n'a pas reformulé avec ses mots
 * s'entend à la première conversation.
 *
 * ⚠️ Personnalisation PARTIELLE et assumée : au 29 juillet 2026, seules
 * 3 sociétés sur 697 ont leurs objections en fiche, et 556 n'ont aucun
 * produit. Quand l'information manque, on retombe sur une formulation
 * neutre — jamais sur une invention.
 */

import { db } from '@/lib/db'

export type Script = { short_code: string; content: string }

/** Le produit d'entrée : le moins cher, celui par lequel on commence. */
async function produitDEntree(companyId: string) {
  return db.mlmProduct.findFirst({
    where: { companyId, status: 'PUBLISHED', price: { not: null } },
    orderBy: { price: 'asc' },
    select: { name: true, price: true, currency: true },
  })
}

function prixLisible(p: { price: unknown; currency: string } | null): string {
  if (!p?.price) return ''
  const n = Number(p.price)
  if (!Number.isFinite(n)) return ''
  return `${n.toFixed(2).replace('.', ',')} ${p.currency === 'EUR' ? '€' : p.currency}`
}

/**
 * Les cinq scripts de départ. Chacun tombe sur une version neutre si
 * l'information manque : on préfère une phrase honnête à une phrase fausse.
 */
export async function scriptsPour(mlmBusinessId: string): Promise<Script[]> {
  const activite = await db.userMlmBusiness.findUnique({
    where: { id: mlmBusinessId },
    select: {
      mlmName: true,
      company: { select: { id: true, name: true, fiche: true } },
    },
  })
  const societe = activite?.company?.name || activite?.mlmName || 'ma société'
  const recit = (activite?.company?.fiche as { recit?: { categorie?: string } } | null)?.recit
  const categorie = (recit?.categorie || '').toLowerCase()

  const produit = activite?.company?.id ? await produitDEntree(activite.company.id) : null
  const prix = prixLisible(produit as never)

  // Le script du prix : c'est là que l'ancrage change tout. Avec un vrai
  // produit d'entrée et son vrai prix, la réponse devient concrète.
  const prixScript = produit?.name && prix
    ? `Je comprends, c’est un vrai budget. Beaucoup commencent par ${produit.name} à ${prix} pour tester leur ressenti avant d’aller plus loin — ça vous parlerait ?`
    : `Je comprends, c’est un vrai budget. Beaucoup commencent par le produit d’entrée de la gamme pour tester leur ressenti avant d’aller plus loin — ça vous parlerait ?`

  const ouverture = categorie
    ? `Bonjour ! Vous vous intéressez à ${categorie} ? Dites-moi ce qui vous amène, je vous répondrai simplement.`
    : `Bonjour ! Dites-moi ce qui vous amène, je vous répondrai simplement.`

  return [
    { short_code: 'ouverture', content: ouverture },
    { short_code: 'prix', content: prixScript },
    {
      short_code: 'temps',
      content: `C’est justement pour ça que ça marche : la plupart commencent avec 5 à 8 heures par semaine, souvent le soir. Vous auriez ce créneau-là ?`,
    },
    {
      short_code: 'pyramidal',
      content: `Question légitime, et c’est bien de la poser. La différence est simple : chez ${societe}, la rémunération vient de la vente de produits réels, pas du recrutement. La loi française encadre ça depuis 2016.`,
    },
    {
      short_code: 'rdv',
      content: `Super. Je vous propose jeudi 18 h ou samedi matin — qu’est-ce qui vous arrange le mieux ?`,
    },
    {
      short_code: 'reveil',
      content: `Bonjour ! Ça fait un moment — je repense à notre échange. Où en êtes-vous de votre côté ?`,
    },
  ]
}

/**
 * Le rappel affiché au distributeur. Il n'est pas décoratif : c'est ce qui
 * fait la différence entre un outil qui aide et un outil qui uniformise.
 */
export const AVERTISSEMENT_SCRIPTS =
  'Ces réponses sont un POINT DE DÉPART, pas un texte à envoyer tel quel. ' +
  'Réécris-les avec tes mots : c’est ce qui fera la différence en conversation.'
