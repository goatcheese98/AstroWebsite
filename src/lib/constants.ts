import type { SiteMetadata, Project, Experience, Skill, NavLink } from '../types';

export const SITE: SiteMetadata = {
  title: 'Rohan Jasani',
  description: 'Personal portfolio of Rohan Jasani — Business Analyst | Data-Driven Problem Solver | UBC MBAN Candidate',
  author: 'Rohan Jasani',
  siteUrl: 'https://rohanjasani.dev',
  socialLinks: {
    github: 'https://github.com/rohanjasani',
    linkedin: 'https://www.linkedin.com/in/rohan-jasani-451a219b/',
    email: 'mailto:jasani.rohan@gmail.com',
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
    title: 'ALGS Esports Performance Dashboard',
    description: 'Interactive data visualization dashboard analyzing player and team performance in the Apex Legends Global Series championship. Built a Python data pipeline to scrape, clean, and structure complex tournament data into queryable format.',
    tags: ['Python', 'Data Visualization', 'Web Scraping', 'Analytics'],
    codeUrl: 'https://github.com/rohanjasani/algs-dashboard',
    featured: true,
    fillColor: 'var(--color-fill-1)',
  },
  {
    title: 'AI-Powered SVG Generation Tool',
    description: 'Full-stack application converting natural language prompts into complex, layered SVG files. Features a reactive Vue.js interface with real-time SVG rendering and Tailwind CSS styling.',
    tags: ['Vue.js', 'Tailwind CSS', 'AI/ML', 'Full-Stack'],
    codeUrl: 'https://github.com/rohanjasani/svg-generator',
    fillColor: 'var(--color-fill-2)',
  },
  {
    title: 'AstroWeb Portfolio',
    description: 'This very site — an Excalidraw-inspired portfolio built with Astro, rough.js, and hand-drawn aesthetics.',
    tags: ['Astro', 'TypeScript', 'rough.js', 'CSS'],
    codeUrl: 'https://github.com/rohanjasani/AstroWeb',
    fillColor: 'var(--color-fill-3)',
  },
];

export const EXPERIENCES: Experience[] = [
  {
    company: 'UBC Sauder School of Business',
    role: 'Master of Business Analytics Candidate',
    period: '2024 — Present',
    description: 'Pursuing advanced training in business analytics, data science, and strategic decision-making.',
    highlights: [
      'Expected graduation: April 2026',
      'Developing expertise in predictive modeling, data visualization, and business intelligence',
      'Working on real-world consulting projects with industry partners',
    ],
    current: true,
  },
  {
    company: 'Goldman Sachs',
    role: 'Consumer Wealth Management Analyst Contractor',
    period: 'June 2022 — Feb 2023',
    description: 'Facilitated client onboarding process and maintained data integrity for wealth management operations.',
    highlights: [
      'Screened client documentation and maintained account data ensuring SEC compliance',
      'Flagged data inconsistencies and potential compliance issues across client portfolios',
      'Mastered Client Identification Program (CIP) policies for multiple jurisdictions',
      'Served as liaison between CWM and Private Wealth Management teams',
    ],
  },
  {
    company: 'Megaplex Theatres',
    role: 'Data Research Apprentice',
    period: 'March 2022 — June 2022',
    description: 'Built data pipelines and performed analytics to uncover insights on movie sales performance.',
    highlights: [
      'Web-scraped movie trailer data using Python and YouTube API',
      'Visualized and analyzed 3 years of movie sales and viewership trends',
      'Presented data-driven insights showing negligible correlation between YouTube views and theatre sales',
      'Informed strategic decision-making by demonstrating limitations of predictive modeling approach',
    ],
  },
];

export const SKILLS: Skill[] = [
  { name: 'Python', level: 90, category: 'Programming', fillColor: 'var(--color-fill-1)' },
  { name: 'SQL', level: 85, category: 'Programming', fillColor: 'var(--color-fill-2)' },
  { name: 'JavaScript', level: 80, category: 'Programming', fillColor: 'var(--color-fill-3)' },
  { name: 'R', level: 75, category: 'Programming', fillColor: 'var(--color-fill-4)' },
  { name: 'Tableau', level: 85, category: 'Analytics', fillColor: 'var(--color-fill-1)' },
  { name: 'Looker Studio', level: 80, category: 'Analytics', fillColor: 'var(--color-fill-2)' },
  { name: 'D3.js', level: 75, category: 'Visualization', fillColor: 'var(--color-fill-3)' },
  { name: 'PostgreSQL / MongoDB', level: 80, category: 'Database', fillColor: 'var(--color-fill-4)' },
  { name: 'Next.js / Nuxt', level: 75, category: 'Frameworks', fillColor: 'var(--color-fill-5)' },
  { name: 'FastAPI / Node.js', level: 75, category: 'Backend', fillColor: 'var(--color-fill-1)' },
  { name: 'LangChain', level: 70, category: 'AI/ML', fillColor: 'var(--color-fill-2)' },
  { name: 'Figma / Miro', level: 80, category: 'Design', fillColor: 'var(--color-fill-3)' },
];
