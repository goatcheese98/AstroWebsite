import type { SiteMetadata, Project, Experience, Skill, NavLink } from '../types';

export const SITE: SiteMetadata = {
  title: 'Rohan Jasani',
  description: 'Personal portfolio of Rohan Jasani — developer, builder, thinker.',
  author: 'Rohan Jasani',
  siteUrl: 'https://rohanjasani.dev',
  socialLinks: {
    github: 'https://github.com/rohanjasani',
    linkedin: 'https://linkedin.com/in/rohanjasani',
    email: 'mailto:hello@rohanjasani.dev',
  },
};

export const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Projects', href: '/#projects' },
  { label: 'Experience', href: '/#experience' },
  { label: 'Blog', href: '/blog' },
];

export const PROJECTS: Project[] = [
  {
    title: 'AstroWeb Portfolio',
    description: 'This very site — an Excalidraw-inspired portfolio built with Astro, rough.js, and hand-drawn aesthetics.',
    tags: ['Astro', 'TypeScript', 'rough.js', 'CSS'],
    codeUrl: 'https://github.com/rohanjasani/AstroWeb',
    featured: true,
    fillColor: 'var(--color-fill-1)',
  },
  {
    title: 'CLI Task Manager',
    description: 'A fast command-line task manager built with Rust. Supports priorities, due dates, and fuzzy search.',
    tags: ['Rust', 'CLI', 'SQLite'],
    codeUrl: 'https://github.com/rohanjasani/tasks-cli',
    fillColor: 'var(--color-fill-2)',
  },
  {
    title: 'Markdown Note App',
    description: 'A minimalist note-taking app with real-time Markdown preview, tagging, and local-first storage.',
    tags: ['React', 'TypeScript', 'IndexedDB'],
    demoUrl: 'https://notes.rohanjasani.dev',
    codeUrl: 'https://github.com/rohanjasani/markdown-notes',
    fillColor: 'var(--color-fill-3)',
  },
  {
    title: 'Weather Dashboard',
    description: 'Real-time weather data visualization with animated charts and geolocation support.',
    tags: ['Svelte', 'D3.js', 'OpenWeather API'],
    demoUrl: 'https://weather.rohanjasani.dev',
    codeUrl: 'https://github.com/rohanjasani/weather-dash',
    fillColor: 'var(--color-fill-4)',
  },
];

export const EXPERIENCES: Experience[] = [
  {
    company: 'Acme Corp',
    role: 'Software Engineer',
    period: '2024 — Present',
    description: 'Building scalable web applications and internal tools.',
    highlights: [
      'Led migration from legacy REST API to GraphQL, reducing payload sizes by 60%',
      'Implemented CI/CD pipeline with automated testing and deployment',
      'Mentored junior developers through code reviews and pair programming',
    ],
    current: true,
  },
  {
    company: 'StartupXYZ',
    role: 'Frontend Developer',
    period: '2022 — 2024',
    description: 'Built responsive, accessible web interfaces for a B2B SaaS platform.',
    highlights: [
      'Developed component library used across 5 product teams',
      'Improved Lighthouse performance score from 62 to 98',
      'Introduced TypeScript adoption, reducing runtime errors by 40%',
    ],
  },
  {
    company: 'University Lab',
    role: 'Research Assistant',
    period: '2021 — 2022',
    description: 'Conducted research in human-computer interaction and data visualization.',
    highlights: [
      'Published paper on accessible data visualization techniques',
      'Built interactive prototype used in user studies with 50+ participants',
    ],
  },
];

export const SKILLS: Skill[] = [
  { name: 'TypeScript', level: 90, category: 'Languages', fillColor: 'var(--color-fill-1)' },
  { name: 'React / Preact', level: 85, category: 'Frontend', fillColor: 'var(--color-fill-1)' },
  { name: 'Astro', level: 80, category: 'Frontend', fillColor: 'var(--color-fill-2)' },
  { name: 'CSS / Design', level: 85, category: 'Frontend', fillColor: 'var(--color-fill-3)' },
  { name: 'Node.js', level: 80, category: 'Backend', fillColor: 'var(--color-fill-2)' },
  { name: 'Rust', level: 60, category: 'Languages', fillColor: 'var(--color-fill-4)' },
  { name: 'SQL / Databases', level: 75, category: 'Backend', fillColor: 'var(--color-fill-5)' },
  { name: 'DevOps / CI/CD', level: 70, category: 'Tools', fillColor: 'var(--color-fill-5)' },
];
