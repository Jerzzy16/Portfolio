/*
 * ---------------------------------------------------------------------------
 * ALL PAGE CONTENT LIVES HERE.
 * Replace every value marked `PLACEHOLDER` with your real details.
 * Nothing else in the project needs editing to change copy.
 * ---------------------------------------------------------------------------
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type NavItem = {
  label: string;
  href: string;
};

export type SchemaBlock = {
  id: string;
  docs: number;
  /** 'primary' renders the lime header bar used for the root record. */
  variant?: 'primary';
  /** Anchor this block links to. The whole panel is the hit target. */
  href: string;
  fields: readonly (readonly [name: string, type: string])[];
};

/** Bento placement. Together they always total 12 columns at md+. */
export type ProjectSpan = 'feature' | 'third' | 'seven';

export type ProjectStatus = 'shipped' | 'in_progress' | 'prototype';

export type Project = {
  title: string;
  blurb: string;
  stack: readonly string[];
  status: ProjectStatus;
  year: string;
  href: string;
  image: string;
  span: ProjectSpan;
};

export type Skill = {
  name: string;
  /** Simple Icons slug. Note: the `java` slug was removed upstream, use `openjdk`. */
  icon: string;
};

export type SkillGroup = {
  label: string;
  items: readonly Skill[];
};

export type ExperienceEntry = {
  role: string;
  company: string;
  period: string;
  points: readonly string[];
};

export type EducationEntry = {
  degree: string;
  school: string;
  period: string;
  detail: string;
};

// ─── Content ─────────────────────────────────────────────────────────────────

export const person = {
  // PLACEHOLDER
  name: 'John Teston',
  /** Nav wordmark. Uppercase mono, kept separate from the display name. */
  wordmark: 'JOHN_TESTON',
  role: 'Software Engineer',
  tagline: 'Enterprise systems, developer tooling, and games.',
  status: 'open_to_work',
  // PLACEHOLDER. Single address only, no time or weather strip.
  location: 'Melbourne, Australia',
  intro:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vel sem at augue aliquam fermentum.',
  // PLACEHOLDER
  links: {
    github: 'https://github.com/username',
    linkedin: 'https://linkedin.com/in/username',
    email: 'hello@example.com',
  },
} as const;

export const nav: readonly NavItem[] = [
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Education', href: '#education' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
];

/** Schema label shown in the hero diagram header. */
export const schemaLabel = {
  name: 'JOHN_TESTON.SCHEMA',
  rev: 'rev 9.8.14',
} as const;

/** Rows rendered inside the hero schema blocks, mirroring the reference diagram. */
export const schemaBlocks: readonly SchemaBlock[] = [
  {
    id: 'db.person',
    docs: 1,
    variant: 'primary',
    href: '#top',
    fields: [
      ['_id', 'ObjectId'],
      ['name', '"John Teston"'],
      ['role', '"SWE & Game Designer"'],
      ['status', '"open_to_work"'],
    ],
  },
  {
    id: 'db.experience',
    docs: 4,
    href: '#experience',
    fields: [
      ['person_id', 'ref'],
      ['role', 'String'],
      ['company', 'String'],
      ['period', '{from,to}'],
    ],
  },
  {
    id: 'db.skills',
    docs: 12,
    href: '#skills',
    fields: [
      ['person_id', 'ref'],
      ['name', 'String'],
      ['category', 'String'],
    ],
  },
  {
    id: 'db.projects',
    docs: 5,
    href: '#projects',
    fields: [
      ['person_id', 'ref'],
      ['title', 'String'],
      ['stack', '[String]'],
      ['status', 'String'],
    ],
  },
  {
    id: 'db.education',
    docs: 3,
    href: '#education',
    fields: [
      ['person_id', 'ref'],
      ['degree', 'String'],
      ['school', 'String'],
    ],
  },
  {
    id: 'db.contact',
    docs: 3,
    href: '#contact',
    fields: [
      ['github', 'String'],
      ['linkedin', 'String'],
      ['email', 'String'],
    ],
  },
];

/**
 * Five projects, five bento cells. Spans total 12 columns per row.
 * `image` is a Picsum seed. Swap for a real screenshot when you have one.
 */
export const projects: readonly Project[] = [
  {
    // PLACEHOLDER
    title: 'Settlement Replatform',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. A migration of the core ledger to an event-sourced service, cutting batch settlement from hours to minutes.',
    stack: ['Java', 'Spring Boot', 'PostgreSQL', 'Kafka'],
    status: 'shipped',
    year: '2025',
    href: '#',
    image: 'https://picsum.photos/seed/ledger-service-dark/1200/800',
    span: 'feature',
  },
  {
    // PLACEHOLDER
    title: 'Internal Tooling CLI',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. A command line suite that provisions environments and scaffolds services.',
    stack: ['Go', 'Docker'],
    status: 'shipped',
    year: '2024',
    href: '#',
    image: 'https://picsum.photos/seed/terminal-tooling-dark/800/800',
    span: 'third',
  },
  {
    // PLACEHOLDER
    title: 'Cargo Tracking Dashboard',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Live shipment telemetry with predictive arrival windows.',
    stack: ['TypeScript', 'React', 'Redis'],
    status: 'shipped',
    year: '2024',
    href: '#',
    image: 'https://picsum.photos/seed/logistics-dashboard-dark/800/600',
    span: 'third',
  },
  {
    // PLACEHOLDER
    title: 'Warden',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. A tactical roguelite built in Godot with a data-driven ability system.',
    stack: ['Godot', 'GDScript'],
    status: 'in_progress',
    year: '2023',
    href: '#',
    image: 'https://picsum.photos/seed/indie-game-cave-dark/800/800',
    span: 'third',
  },
  {
    // PLACEHOLDER
    title: 'Tidal',
    blurb:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. An underwater exploration prototype with a custom buoyancy model in Unity.',
    stack: ['Unity', 'C#'],
    status: 'prototype',
    year: '2022',
    href: '#',
    image: 'https://picsum.photos/seed/underwater-unity-dark/800/600',
    span: 'seven',
  },
];

/**
 * Skills grouped into clusters, one soft divider per cluster.
 * Logos are served by the Simple Icons CDN and tinted to the page accent.
 */
export const skillGroups: readonly SkillGroup[] = [
  {
    label: 'Languages',
    items: [
      { name: 'Java', icon: 'openjdk' },
      { name: 'Kotlin', icon: 'kotlin' },
      { name: 'TypeScript', icon: 'typescript' },
      { name: 'Go', icon: 'go' },
      { name: 'Python', icon: 'python' },
    ],
  },
  {
    label: 'Frameworks',
    items: [
      { name: 'Spring Boot', icon: 'spring' },
      { name: 'React', icon: 'react' },
      { name: 'Tailwind CSS', icon: 'tailwindcss' },
    ],
  },
  {
    label: 'Infrastructure',
    items: [
      { name: 'Docker', icon: 'docker' },
      { name: 'PostgreSQL', icon: 'postgresql' },
      { name: 'Redis', icon: 'redis' },
      { name: 'Git', icon: 'git' },
      { name: 'Linux', icon: 'linux' },
    ],
  },
  {
    label: 'Game engines',
    items: [
      { name: 'Unity', icon: 'unity' },
      { name: 'Godot', icon: 'godotengine' },
    ],
  },
];

// PLACEHOLDER
export const experience: readonly ExperienceEntry[] = [
  {
    role: 'Senior Software Engineer',
    company: 'Kestrel Logistics',
    period: '2024 - Present',
    points: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Bright Harbor Health',
    period: '2022 - 2024',
    points: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    ],
  },
  {
    role: 'Backend Developer',
    company: 'Corvus Analytics',
    period: '2020 - 2022',
    points: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
      'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    ],
  },
  {
    role: 'Software Engineering Intern',
    company: 'Tidewell Interactive',
    period: '2019 - 2020',
    points: [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna.',
    ],
  },
];

// PLACEHOLDER
export const education: readonly EducationEntry[] = [
  {
    degree: 'B.S. Computer Science',
    school: 'Northgate University',
    period: '2016 - 2020',
    detail:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Coursework in distributed systems, compilers, and human-computer interaction.',
  },
  {
    degree: 'Game Development Certificate',
    school: 'Ironwood Academy',
    period: '2021',
    detail:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Intensive program in engine architecture, level design, and technical art.',
  },
  {
    degree: 'Self-directed study',
    school: 'Independent',
    period: '2022 - Present',
    detail:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ongoing focus on rendering, physics, and developer experience tooling.',
  },
];