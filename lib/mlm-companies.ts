// Sociétés MLM connues + leur catégorie/secteur (attachée à la société).
// Sert au déroulant de choix (comme l'onboarding) et à l'auto-renseignement de la catégorie.
export const MLM_COMPANIES: { name: string; category: string }[] = [
  { name: 'Herbalife', category: 'nutrition' },
  { name: 'Forever Living', category: 'bien-être' },
  { name: 'Amway', category: 'bien-être' },
  { name: 'Oriflame', category: 'cosmétique' },
  { name: 'NHT Global', category: 'bien-être' },
  { name: 'doTERRA', category: 'bien-être' },
  { name: 'Young Living', category: 'bien-être' },
  { name: 'Mary Kay', category: 'cosmétique' },
  { name: 'Tupperware', category: 'maison' },
]

export const OTHER_COMPANY = '__autre'

// Catégorie attachée à une société (sinon « autre »).
export const categoryForCompany = (name: string): string =>
  MLM_COMPANIES.find((c) => c.name.toLowerCase() === (name || '').trim().toLowerCase())?.category ?? 'autre'

// Options du déroulant (sociétés + « Autre société »).
export const companyOptions = () => [
  ...MLM_COMPANIES.map((c) => ({ value: c.name, label: c.name })),
  { value: OTHER_COMPANY, label: 'Autre société' },
]
