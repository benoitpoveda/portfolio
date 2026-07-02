/**
 * Contenu du site — SOURCE UNIQUE (Portail, Portfolio, CV partagent ces donnees).
 * Copie "prete a coller" du brief. NE PAS reecrire les accroches.
 * Garde-fous : posture junior assumee, zero survente, aucune competence inventee.
 */

/* ---- Sections (ordre + labels mono ; = 5 satellites du Portail) ---- */
export const sections = [
  { id: 'profil', nav: 'Profil', mono: '// PROFIL' },
  { id: 'parcours', nav: 'Parcours', mono: '// PARCOURS' },
  { id: 'labo', nav: 'Labo', mono: '// LABO & PROJETS' },
  { id: 'stack', nav: 'Stack', mono: '// STACK' },
  { id: 'contact', nav: 'Contact', mono: '// CONTACT' },
] as const;

/* ---- HERO (variante A « Builder » — recommandee dans le brief) ---- */
export const hero = {
  variant: 'A',
  eyebrow: 'ADMINISTRATION SYSTÈMES · INFRASTRUCTURE · AUTOMATISATION',
  name: 'Benoît Poveda',
  ledeLines: [
    `J'administre des systèmes et j'automatise l'exploitation.`,
    `Et quand l'outil dont j'ai besoin n'existe pas, je le construis.`,
  ],
  sub: `En production aujourd'hui : une application interne assistée par IA qui a fait gagner ~150 h sur la refonte d'un centre d'aide.`,
  ctas: [
    { label: 'Mes projets', glyph: '→', href: '#labo', kind: 'solid' },
    { label: 'GitHub', glyph: '→', href: 'github', kind: 'ghost' },
    { label: 'Télécharger le CV (PDF)', glyph: '↓', href: 'cvPdf', kind: 'ghost' },
  ],
} as const;

/* ---- PROFIL (// PROFIL) — coller tel quel ---- */
export const profil = {
  mono: '// PROFIL',
  title: 'À propos',
  paragraphs: [
    `Technicien systèmes & réseaux chez un éditeur de logiciels de caisse, je gère au quotidien le support N2/N3. Mais mon réflexe va plus loin : dès qu'un outil me ferait gagner du temps, je le construis.`,
    `Dernier exemple en date, la refonte du centre d'aide de mon employeur. J'ai conçu et déployé une application web interne, assistée par IA, qui automatise la production et la mise en forme des articles : environ 20× plus rapide, ~150 h économisées sur 230 articles. Elle est en production et adoptée par l'équipe.`,
    `Je suis arrivé dans l'IT par une reconversion. Avant, 15 ans dans l'optique — dont 7 à cofonder et diriger une boutique, du commercial à la gestion en passant par toute l'informatique du magasin. J'en garde une autonomie totale, le sens du résultat et le goût du concret.`,
    `Pour progresser, j'ai monté un homelab Proxmox complet : virtualisation, stockage ZFS sous TrueNAS, conteneurs Docker, reverse proxy, sauvegardes automatisées, VPN, supervision. C'est mon terrain de jeu, et la meilleure preuve de ce que je sais faire — tout est documenté et versionné.`,
    `Aujourd'hui, je cherche un poste d'administrateur systèmes / infrastructure où continuer à apprendre tout en apportant déjà de la valeur. Le terminal, le code et la doc font partie de mon quotidien.`,
  ],
  /* Grille 4 stats — le « ~150 h » porte le geste turquoise (un seul par ecran) */
  stats: [
    { value: '~150 h', label: 'économisées · app IA' },
    { value: '20×', label: 'plus rapide' },
    { value: '~12', label: 'VM & LXC · homelab' },
    { value: 'TSSR', label: 'titre pro niv. 5' },
  ],
} as const;

/* ---- PARCOURS (// PARCOURS) ---- */
export const parcours = {
  mono: '// PARCOURS',
  title: 'Parcours',
  jobs: [
    {
      period: '2024 → auj.',
      role: 'Technicien Systèmes & Réseaux · Support N2/N3',
      org: 'Clyo Systems',
      meta: 'Éditeur de logiciels de caisse · Nice',
      bullets: [
        `Conception, développement et déploiement d'une application web interne, assistée par IA, qui automatise la production et la mise en forme des articles du centre d'aide : reformatage ~20× plus rapide, ~150 h économisées sur la refonte (230 articles) — en production, adoptée par l'équipe.`,
        `Déploiement du matériel et des applications métier ; outils internes (script atelier, générateur d'étiquettes) et automatisation (PowerShell, Bash).`,
        `Diagnostic et résolution d'incidents en production — support N2/N3 (caisse, terminaux Sunmi/PAX, TPE) via Zendesk.`,
      ],
    },
    {
      period: '2024',
      role: 'Technicien Supérieur Systèmes & Réseaux — Stage',
      org: `Régie Ligne d'Azur`,
      meta: 'Nice',
      bullets: [
        `Routeurs industriels (InHand, HP 5140), switch Cisco 9200L ; migration Outlook → Microsoft 365 (PowerShell).`,
      ],
    },
    {
      period: '2017 → 2024',
      role: 'Cofondateur & gérant',
      org: 'Lympia Lunetier',
      meta: `Magasin d'optique · Nice`,
      bullets: [
        `Création et gestion complète d'un point de vente (commercial, achats, gestion) et de toute l'informatique de la boutique.`,
      ],
    },
    {
      period: '2007 → 2016',
      role: 'Opticien-lunetier — Collaborateur',
      org: 'Afflelou · Marc Le Bihan · Les Opticiens Mutualistes · Optique Garnier',
      meta: 'Nice & Paris',
      bullets: [],
    },
  ],
  /* Formation : ligne discrete (rendue sous la section Stack, comme le design) */
  formation:
    "Titre pro niv. 5 — Tech. Sup. Systèmes & Réseaux · ENI École Informatique (2024) · BTS Opticien-lunetier — GRETA Côte d'Azur (2010)",
} as const;

/* ---- LABO & PROJETS (// LABO & PROJETS) — SECTION REINE ---- */
export const labo = {
  mono: '// LABO & PROJETS',
  title: 'Labo & Projets',
  intro: `Ce que je construis et exploite moi-même : une application en production chez mon employeur, un homelab Proxmox complet — documenté sur GitHub — et un VPS Linux public. Tout est conçu, déployé et maintenu seul.`,
  cards: [
    {
      cat: '// EN ENTREPRISE · EN PRODUCTION',
      title: `Refonte du centre d'aide — application web assistée par IA`,
      desc: `L'outil que j'ai conçu, développé et déployé seul chez mon employeur : une application web interne qui automatise la production et la mise en forme des articles du centre d'aide, avec l'IA en assistance. Reformatage ~20× plus rapide, ~150 h économisées sur la refonte (230 articles). En production et adoptée par l'équipe.`,
      stack: `App web interne · pipeline IA · détails d'architecture en entretien`,
      preuve: `De l'idée à la production · automatisation d'un process métier · exploitation`,
      nodes: '230 articles · ~150 h gagnées',
      doc: null,
    },
    {
      cat: '// VIRTUALISATION',
      title: 'HOME SERVER — Infrastructure auto-hébergée',
      desc: `Un serveur Proxmox que j'administre de bout en bout : une douzaine de VM et conteneurs LXC qui font tourner tous mes services (stockage, sauvegarde, cloud privé, VPN, supervision, reverse proxy, IA locale). Conçu, déployé et maintenu seul.`,
      stack: 'Proxmox VE · Debian · KVM/LXC · Ryzen 7 5800X / 64 Go',
      preuve: `Virtualisation · architecture d'infrastructure · autonomie d'exploitation`,
      nodes: '~12 VM & conteneurs sur 1 hyperviseur',
      doc: { href: 'https://github.com/benoitpoveda/homelab-proxmox', label: 'github.com/benoitpoveda/homelab-proxmox' },
    },
    {
      cat: '// DONNÉES',
      title: 'Sauvegardes & stockage — ZFS + Proxmox Backup Server',
      desc: `Un stockage TrueNAS en miroir ZFS (qui survit à la perte d'un disque), exposé en NFS à l'hyperviseur, et des sauvegardes automatiques quotidiennes de toutes les VM via Proxmox Backup Server. La procédure de restauration est documentée, pas seulement configurée.`,
      stack: 'TrueNAS · ZFS · NFS · Proxmox Backup Server',
      preuve: `Stratégie de sauvegarde · intégrité des données · restauration`,
      nodes: null,
      doc: {
        href: 'https://github.com/benoitpoveda/homelab-proxmox/blob/main/docs/stockage-zfs-vs-lvm.md',
        label: 'docs/stockage-zfs-vs-lvm.md',
      },
    },
    {
      cat: '// RÉSEAU & SÉCURITÉ',
      title: 'Accès distant sécurisé — VPN & services exposés',
      desc: `Un accès chiffré à toute mon infra via un VPN WireGuard (plusieurs postes appairés : desktop, portable Linux, PC pro), un reverse proxy qui publie mes services en HTTPS avec certificats TLS, et un filtrage DNS via Pi-hole. Un pare-feu pfSense isole un sous-réseau dédié.`,
      stack: 'WireGuard · Nginx Proxy Manager · TLS / Let’s Encrypt · Pi-hole · pfSense',
      preuve: `Accès distant sécurisé · reverse proxy & TLS · segmentation réseau · DNS`,
      nodes: null,
      doc: {
        href: 'https://github.com/benoitpoveda/homelab-proxmox/blob/main/docs/reseau-wireguard-pfsense.md',
        label: 'docs/reseau-wireguard-pfsense.md',
      },
    },
    {
      cat: '// OBSERVABILITÉ',
      title: 'Supervision & alerting — métriques et agent maison',
      desc: `Une stack de supervision (Prometheus, InfluxDB, Grafana) qui collecte les métriques de l'infra dans des tableaux de bord, doublée d'un agent maison assisté par IA qui surveille l'état du lab (disques, ZFS, sauvegardes, services) et m'alerte sur Telegram. Observabilité + alerte proactive.`,
      stack: 'Prometheus · InfluxDB · Grafana · Telegram · agent maison',
      preuve: `Observabilité · métriques & dashboards · automatisation des opérations`,
      nodes: null,
      doc: {
        href: 'https://github.com/benoitpoveda/homelab-proxmox/blob/main/docs/supervision-prometheus-grafana.md',
        label: 'docs/supervision-prometheus-grafana.md',
      },
    },
  ],
} as const;

/* ---- STACK (// STACK) — par familles ; « En cours » distingue ---- */
export const stack = {
  mono: '// STACK',
  title: 'Stack',
  groups: [
    { name: 'Linux & conteneurs', items: ['Linux (Debian, Fedora)', 'Docker (multi-conteneurs, reverse proxy, TLS)'] },
    { name: 'Virtualisation & stockage', items: ['Proxmox (VM/LXC), VMware', 'ZFS, TrueNAS'] },
    { name: 'Windows & annuaire', items: ['Windows Server, Active Directory, DHCP/DNS', 'Microsoft 365, Azure AD'] },
    { name: 'Scripts & automatisation', items: ['Bash, PowerShell', 'Git'] },
    { name: 'Bases de données', items: ['MariaDB/MySQL, SQL Server'] },
    { name: 'Méthode & outils', items: ['ITIL v4, Zendesk, GLPI'] },
  ],
  enCours: { name: 'En cours', items: ['Prometheus / Grafana', 'réseau (Cisco, pfSense, VLAN)'] },
} as const;

/* ---- CONTACT (// CONTACT) ---- */
export const contact = {
  mono: '// CONTACT',
  title: 'TRAVAILLONS ENSEMBLE',
  accroche: `Un poste, une mission, une question technique ? Écrivez-moi — je réponds vite.`,
} as const;

/* ---- FOOTER ---- */
export const footer = {
  /* Centres d'interet (footer, optionnel) — donnees reelles du CV */
  interets: ['Escalade', 'Randonnée', 'Veille technologique'] as string[],
} as const;
