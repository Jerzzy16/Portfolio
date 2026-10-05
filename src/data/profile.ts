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
  /** Document count, shown as an "n items" chip. */
  items: number;
  /** 'primary' renders the filled header bar used for the root record. */
  variant?: 'primary';
  /** Anchor this block links to. The whole panel is the hit target. */
  href: string;
  /** Key rows, rendered in the band directly under the header. */
  keys: readonly (readonly [kind: 'PK' | 'SK', value: string])[];
  /** Data rows below the key band. */
  fields: readonly (readonly [name: string, type: string])[];
};

/**
 * An edge in the diagram. `label` is read PARENT to CHILD, outward from
 * db.person, so '1:N' means one person relates to many child documents.
 * The same edge read inward is 'N:1'. The convention is printed under the
 * diagram because the two notations are otherwise indistinguishable.
 */
export type SchemaRelation = {
  from: string;
  to: string;
  label: '1:1' | '1:N' | 'N:1';
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
  /** Intrinsic size of `image`, so the browser reserves the box before it loads. */
  imageWidth: number;
  imageHeight: number;
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
  /** The NOTES column. */
  notes: readonly string[];
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
  name: 'JOHN TESTON',
  role: 'Systems & Software Engineer',
  /*
    The hero cycles these in place, inside the intro sentence below -- one per
    discipline rather than one per job title, so the set stays true as the
    experience list changes. It is deliberately NOT derived from `experience`,
    because that would rotate seven titles at a seven second cadence and the
    hero would never come to rest.

    These are DISCIPLINES, not job titles, and the intro supplies the noun
    ('... {roles} engineer ...'). Keeping them to one word each is what makes the
    reel work inside a sentence: the window is as wide as the longest string, so
    near-equal lengths mean near-equal slots and the prose around the reel never
    re-wraps as it turns. 'Systems & Software Engineer' here instead would leave
    ~90px of slack inside every shorter frame, and the reel would shove the rest
    of the sentence around once a lap.

    CONSTRAINT: the reel is nowrap, so the longest string must fit the column the
    sentence leaves it on the narrowest phone. These measure 78px in body copy at
    320px. A longer role clips rather than wrapping -- shorten it rather than
    widening it.
  */
  roles: ['Software', 'Systems', 'Network'] as const,
  tagline: 'To Infinity and Beyond. Reach the stars with code that scales.',
  status: 'open_to_work',
  // PLACEHOLDER. Single address only, no time or weather strip.
  location: 'Providenciales, Turks & Caicos Islands',
  // `{roles}` is not literal copy: Hero splits the sentence on it and drops the
  // reel from animated-text-04 into that slot, so the roles stay live here.
  intro:
    'I\'m a {roles} engineer passionate about building, managing, and improving reliable digital solutions. In my professional role, I am responsible for managing IT infrastructure, networks, servers, systems, and the technologies that keep organizations running smoothly.',
  // PLACEHOLDER
  links: {
    github: 'https://github.com/Jerzzy16',
    linkedin: 'https://www.linkedin.com/in/john-teston',
    email: 'johnjeruel@gmail.com',
  },
} as const;

/**
 * One query line per section. This is the technical motif from the reference,
 * and it doubles as a plain statement of what each section actually holds.
 */
export const queries = {
  projects: 'SELECT * FROM projects ORDER BY year DESC;',
  skills: 'SELECT name, category FROM skills ORDER BY category;',
  education: 'SELECT * FROM education ORDER BY period DESC;',
  experience: 'SELECT * FROM experience ORDER BY period DESC;',
  contact: 'SELECT github, linkedin, email FROM contact;',
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
  rev: 'v1.0.0',
} as const;

/** The primary key every child collection carries. Change it in one place. */
export const schemaHandle = 'PERSON#john';

/** Rows rendered inside the hero schema blocks, mirroring the reference diagram.
 *  The person handle is the primary key every child collection carries. */
export const schemaBlocks: readonly SchemaBlock[] = [
  {
    id: 'db.person',
    items: 1,
    variant: 'primary',
    href: '#top',
    keys: [['PK', schemaHandle]],
    fields: [
      ['name', 'S'],
      ['status', 'S'],
    ],
  },
  {
    id: 'db.contact',
    // One contact record per person, so one row. It previously read "3 items"
    // because github, linkedin and email were counted as rows when they are
    // columns of a single row, and it carried no person_id at all, which meant
    // the relationship to db.person did not exist.
    items: 1,
    href: '#contact',
    keys: [['PK', schemaHandle]],
    fields: [
      ['github', 'S'],
      ['linkedin', 'S'],
      ['email', 'S'],
    ],
  },
  {
    id: 'db.experience',
    items: 4,
    href: '#experience',
    keys: [
      ['PK', schemaHandle],
      ['SK', 'EXP#001'],
    ],
    fields: [
      ['role', 'S'],
      ['company', 'S'],
      ['period', 'M'],
    ],
  },
  {
    id: 'db.skills',
    items: 12,
    href: '#skills',
    keys: [
      ['PK', schemaHandle],
      ['SK', 'SKILL#001'],
    ],
    fields: [
      ['name', 'S'],
      ['category', 'S'],
    ],
  },
  {
    id: 'db.projects',
    items: 5,
    href: '#projects',
    keys: [
      ['PK', schemaHandle],
      ['SK', 'PROJ#001'],
    ],
    fields: [
      ['title', 'S'],
      ['stack', 'SS'],
      ['status', 'S'],
    ],
  },
  {
    id: 'db.education',
    items: 3,
    href: '#education',
    keys: [
      ['PK', schemaHandle],
      ['SK', 'EDU#001'],
    ],
    fields: [
      ['degree', 'S'],
      ['school', 'S'],
    ],
  },
];

/** Every child collection holds a single person_id, so each is one-to-many.
 *  db.contact is the exception: one person, one contact record. */
export const schemaRelations: readonly SchemaRelation[] = [
  { from: 'db.person', to: 'db.experience', label: '1:N' },
  { from: 'db.person', to: 'db.skills', label: '1:N' },
  { from: 'db.person', to: 'db.projects', label: '1:N' },
  { from: 'db.person', to: 'db.education', label: '1:N' },
  { from: 'db.person', to: 'db.contact', label: '1:1' },
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
    imageWidth: 1200,
    imageHeight: 800,
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
    imageWidth: 800,
    imageHeight: 800,
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
    imageWidth: 800,
    imageHeight: 600,
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
    imageWidth: 800,
    imageHeight: 800,
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
    imageWidth: 800,
    imageHeight: 600,
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
      { name: 'TypeScript', icon: 'typescript' },
      { name: 'Python', icon: 'python' },
      { name: 'Go', icon: 'go' },
      { name: 'SQL', icon: 'postgresql' },
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
      { name: 'Godot', icon: 'godotengine' },
    ],
  },
];

/*
  `period` is an authored year range, so it is written as text rather than as a
  pair of dates: an en dash between non-breaking spaces, which stops the range
  wrapping across a line break. Formatting these with Intl.DateTimeFormat would
  need start/end years in the data instead of a pre-joined string.
 */
// PLACEHOLDER
export const experience: readonly ExperienceEntry[] = [
  {
    role: 'IT Personnel & Systems Engineer',
    company: 'The Oasis at Grace Bay',
    period: '2026\u00a0\u2013\u00a0Present',
    notes: [
      'Configure, deploy, and maintain switches, routers, wireless access points, firewalls, and structured cabling with secure design using VLANs, VPNs, and access controls.',
      'Perform infrastructure audits, asset management, cabling, and Tier 1–3 IT support for staff and operations.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Freelance',
    period: '2023\u00a0\u2013\u00a0Present',
    notes: [
      'Focused on performance optimization, scalability, and maintainable codebases',
      'Utilized AWS (EC2, S3, IAM, CloudWatch), CI/CD pipelines, and Bash scripts for automation.',
      'Managed multiple tasks and deadlines efficiently, maintaining productivity and on-time delivery in fast-paced environments.'
    ],
  },
  {
    role: 'System Administrator',
    company: 'SBD Apparel',
    period: '2025\u00a0\u2013\u00a02025',
    notes: [
      'Designed and configured a low-latency LAN connecting PCs, supporting real-time broadcasting during live events without internet dependency.',
      'Diagnosed and resolved LAN connectivity issues in real time during a live national-level event.',
      'Set up and maintained a local web server for event workflows.'
    ],
  },
  {
    role: 'Information Communication Technology Teacher',
    company: 'Providence International Academy',
    period: '2021\u00a0\u2013\u00a02022',
    notes: [
      'Designed and implemented innovative lesson plans integrating educational technology to enhance language acquisition, engagement, and student outcomes.',
      'Directed classroom instruction and peer collaboration, mentoring students and coordinating with fellow educators to align digital teaching strategies with curriculum objectives.'
    ],
  },
  {
    role: 'Inventory Clerk',
    company: 'InterHealth Canada',
    period: '2019\u00a0\u2013\u00a02019',
    notes: [
      'Processed and managed inventory data, ensuring accurate tracking and reporting of medical supplies.',
    ],
  },
  {
    role: 'Parts and Customer Service Representative',
    company: 'Butterfield Motors, Ltd.',
    period: '2019\u00a0\u2013\u00a02019',
    notes: [
      'Collaborated cross-functionally with engineering, sales, and customer service teams to analyze customer needs, collect feedback via direct outreach and cold calling, and implement service improvements based on insights.',
      'Performed detailed vehicle inspections, effectively communicated technical findings to customers, and supported the creation of accurate repair and maintenance plans, resulting in improved client satisfaction and retention.'
    ],
  },
  {
    role: 'Food Server',
    company: 'Seven Stars Resort and Spa',
    period: '2021\u00a0\u2013\u00a02022',
    notes: [
      'Enhanced customer satisfaction by anticipating guest needs, resolving concerns proactively, and maintaining a friendly, service-oriented atmosphere.',
      'Maintained operational efficiency during peak hours through effective multitasking, communication, and time management.'
    ],
  },
];

// PLACEHOLDER
export const education: readonly EducationEntry[] = [
  {
    degree: 'B.S. Computer Science',
    school: 'Mapua University',
    period: '2023\u00a0\u2013\u00a0Present',
    detail:
      'Computer Science program with a focus on software development, algorithms, and data structures. Coursework includes advanced programming, database management, and software engineering principles.',
  },
  {
    degree: 'Self-directed study',
    school: 'Independent',
    period: '2022\u00a0\u2013\u00a0Present',
    detail:
      'CCNA, HACKER101, and other online courses. Focused on networking, cybersecurity, and software development. Completed various projects to apply theoretical knowledge in practical scenarios.',
  },
];
