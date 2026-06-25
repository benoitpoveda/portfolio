/**
 * Coordonnees, liens et meta du site — SOURCE UNIQUE.
 * Modifier ici pour repercuter partout (Portail, Portfolio, CV).
 */
export const site = {
  name: 'Benoît Poveda',
  firstName: 'Benoît',
  lastName: 'Poveda',
  monogram: 'BP',
  role: 'Administrateur systèmes / infrastructure',
  shortRole: 'Infrastructure · Automatisation · Linux',
  location: 'Nice, FR',
  locationLong: 'Nice & environs · Permis B',

  /* Contact — affichage public */
  email: 'povedaben@proton.me',
  /* Telephone RETIRE du repo/site public (anti-scraping, garde-fou brief §9).
     Le remettre ici EN LOCAL (non commite) si besoin pour un PDF du CV remis en main propre. */
  phone: '',
  showPhoneOnSite: false,

  links: {
    github: 'https://github.com/benoitpoveda',
    githubLabel: 'github.com/benoitpoveda',
    linkedin: 'https://www.linkedin.com/in/benoitpoveda',
    linkedinLabel: 'linkedin.com/in/benoitpoveda',
  },

  /* Releve mono affiche sous le hero / dans le bloc identite */
  status: {
    dispo: 'OUVERT AUX OPPORTUNITÉS · NICE, FR · MOBILE',
    focus: 'INFRASTRUCTURE · AUTOMATISATION · LINUX',
  },

  /* Liens internes */
  routes: {
    portail: '/',
    portfolio: '/portfolio',
    cv: '/cv',
  },

  /* Meta / SEO */
  meta: {
    title: 'Benoît Poveda — Administrateur systèmes / infrastructure',
    description:
      'Portfolio de Benoît Poveda, administrateur systèmes / infrastructure à Nice. ' +
      'Homelab Proxmox documenté, automatisation, et une application interne assistée par IA en production.',
    lang: 'fr',
  },
} as const;

export type Site = typeof site;
