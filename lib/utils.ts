import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Nettoie un message d'Atlas pour l'affichage messagerie (texte brut) :
// retire le markdown résiduel (**gras**, lignes ---, titres #) et resserre les vides.
export function cleanChat(s: string): string {
  return s
    .replace(/\*\*/g, '')
    .replace(/^#{1,4}\s*/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
