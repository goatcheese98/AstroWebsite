import type {
  SiteMetadata,
  Project,
  Experience,
  Skill,
  NavLink,
} from "../types";

export const SITE: SiteMetadata = {
  title: "Rohan Jasani",
  description:
    "Personal portfolio of Rohan Jasani — Business Analyst | Data-Driven Problem Solver | UBC MBAN Candidate",
  author: "Rohan Jasani",
  siteUrl: "https://rohanjasani.dev",
  socialLinks: {
    github: "https://github.com/rohanjasani",
    linkedin: "https://www.linkedin.com/in/rohan-jasani-dev/",
    email: "mailto:jasani.rohan@gmail.com",
  },
};

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "AI Canvas", href: "/ai-canvas" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Blog", href: "/blog" },
];

// Canvas-only navigation (no home/blog)
export const CANVAS_NAV_LINKS: NavLink[] = [{ label: "AI Canvas", href: "/" }];

export const PROJECTS: Project[] = [
  {
    title: "ALGS Esports Performance Dashboard",
    description:
      "Interactive data visualization dashboard analyzing player and team performance in the Apex Legends Global Series championship. Built a Python data pipeline to scrape, clean, and structure complex tournament data into queryable format.",
    tags: ["Python", "Data Visualization", "Web Scraping", "Analytics"],
    codeUrl: "https://github.com/goatcheese98/algs-championship-viz",
    featured: true,
    fillColor: "var(--color-fill-1)",
    accentColor: "#3b82f6",
  },
  {
    title: "AI-Powered SVG Generation Tool",
    description:
      "Full-stack application converting natural language prompts into complex, layered SVG files. Features a reactive Vue.js interface with real-time SVG rendering and Tailwind CSS styling.",
    tags: ["Vue.js", "Tailwind CSS", "AI/ML", "Full-Stack"],
    codeUrl: "https://github.com/goatcheese98/ai-2-svg-tools",
    fillColor: "var(--color-fill-2)",
    accentColor: "#10b981",
  },
  {
    title: "AstroWeb Portfolio",
    description:
      "This very site — an Excalidraw-inspired portfolio built with Astro, rough.js, and hand-drawn aesthetics.",
    tags: ["Astro", "TypeScript", "rough.js", "CSS"],
    codeUrl: "https://github.com/goatcheese98/AstroWebsite",
    fillColor: "var(--color-fill-3)",
    accentColor: "#f59e0b",
  },
  {
    title: "Methanex HR Dashboard",
    description:
      "An interactive HR dashboard built for the MBAN Hackathon to analyze and visualize employee data, helping drive strategic workforce decisions.",
    tags: ["Data Analytics", "Dashboard", "Hackathon"],
    codeUrl: "https://github.com/goatcheese98/MBANHackathon1",
    demoUrl: "/projects/constellation",
    fillColor: "var(--color-fill-4)",
    accentColor: "#8b5cf6",
  },
];

export const EXPERIENCES: Experience[] = [
  {
    company: "UBC Sauder School of Business",
    role: "Master of Business Analytics Candidate",
    period: "Aug 2025 — Present",
    description:
      "Pursuing advanced training in business analytics, data science, and strategic decision-making at one of Canada's top business schools.",
    highlights: [
      "Expected graduation: August 2026",
      "Coursework: ML for Business, Data Modernization, Optimal Decision Making, Modeling Uncertainty",
    ],
    current: true,
    accentColor: "#1e3a5f",
    logo: "ubc",
  },
  {
    company: "Goldman Sachs",
    role: "Consumer Wealth Management Analyst",
    period: "June 2022 — Feb 2023",
    description:
      "Supported high-net-worth client onboarding and compliance operations within the Consumer Wealth Management division.",
    highlights: [
      "Screened 200+ documentation packages weekly with 100% SEC regulatory compliance",
      "Flagged fraudulent activity and compliance risks using proprietary databases",
      "Resolved 95% of documentation issues within 48 hours as cross-regional liaison",
    ],
    accentColor: "#7399C6",
    logo: "goldman",
  },
  {
    company: "Larry H. Miller Megaplex Theatres",
    role: "Data Analytics Intern",
    period: "March 2022 — June 2022",
    description:
      "Investigated the relationship between YouTube trailer viewership and U.S. theatre sales using statistical analysis.",
    highlights: [
      "Built automated Python web scraper leveraging YouTube API to compile trailer + sales database",
      "Performed correlation analysis and hypothesis testing, identifying negligible viewership-to-sales correlation",
    ],
    accentColor: "#6B2C91",
    logo: "megaplex",
  },
];

export const SKILLS: Skill[] = [
  {
    name: "Python",
    level: 90,
    category: "Programming",
    fillColor: "var(--color-fill-1)",
  },
  {
    name: "SQL",
    level: 85,
    category: "Programming",
    fillColor: "var(--color-fill-2)",
  },
  {
    name: "JavaScript",
    level: 80,
    category: "Programming",
    fillColor: "var(--color-fill-3)",
  },
  {
    name: "R",
    level: 75,
    category: "Programming",
    fillColor: "var(--color-fill-4)",
  },
  {
    name: "Tableau",
    level: 85,
    category: "Analytics",
    fillColor: "var(--color-fill-1)",
  },
  {
    name: "Looker Studio",
    level: 80,
    category: "Analytics",
    fillColor: "var(--color-fill-2)",
  },
  {
    name: "D3.js",
    level: 75,
    category: "Visualization",
    fillColor: "var(--color-fill-3)",
  },
  {
    name: "PostgreSQL / MongoDB",
    level: 80,
    category: "Database",
    fillColor: "var(--color-fill-4)",
  },
  {
    name: "Next.js / Nuxt",
    level: 75,
    category: "Frameworks",
    fillColor: "var(--color-fill-5)",
  },
  {
    name: "FastAPI / Node.js",
    level: 75,
    category: "Backend",
    fillColor: "var(--color-fill-1)",
  },
  {
    name: "LangChain",
    level: 70,
    category: "AI/ML",
    fillColor: "var(--color-fill-2)",
  },
  {
    name: "Figma / Miro",
    level: 80,
    category: "Design",
    fillColor: "var(--color-fill-3)",
  },
];
