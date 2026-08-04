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
    "Rohan Jasani is an AI product and systems builder who turns operational friction into reliable systems teams actually use.",
  author: "Rohan Jasani",
  siteUrl: "https://rohanjasani.com",
  socialLinks: {
    github: "https://github.com/goatcheese98",
    linkedin: "https://www.linkedin.com/in/rohan-jasani-dev/",
    email: "mailto:jasani.rohan@gmail.com",
  },
};

export const NAV_LINKS: NavLink[] = [
  { label: "Work", href: "/#projects" },
  { label: "Experience", href: "/#experience" },
  { label: "Notes", href: "/blog" },
  { label: "Contact", href: "mailto:jasani.rohan@gmail.com" },
];

export const PORTFOLIO_TOOLKIT = [
  {
    title: "Applied AI systems",
    description:
      "Model-assisted workflows with explicit boundaries, evaluation, and a human in the loop where judgment matters.",
    items: ["Agentic workflows", "Tool use", "Structured outputs", "Evals", "Human approval"],
    accentColor: "#3b82f6",
  },
  {
    title: "Product delivery",
    description:
      "From an ambiguous operating problem to requirements, rollout, training, and a feedback loop people will use.",
    items: ["Workflow discovery", "Requirements", "Decision boundaries", "Rollout", "Adoption"],
    accentColor: "#f59e0b",
  },
  {
    title: "Reliable implementation",
    description:
      "Small, observable systems built for repeat-safe operation instead of impressive demos that fall apart in practice.",
    items: ["TypeScript", "Cloudflare", "Hono", "D1 / KV / R2", "Tests & monitoring"],
    accentColor: "#10b981",
  },
] as const;

export const PROJECTS: Project[] = [
  {
    title: "RoopStudio",
    description:
      "An AI-native visual workspace for diagramming, structured notes, image generation, and editable AI-assisted refinement.",
    tags: ["Product Engineering", "Structured AI", "Canvas Systems"],
    demoUrl: "https://canvas.rohanjasani.com/",
    featured: true,
    fillColor: "var(--color-fill-1)",
    accentColor: "#3b82f6",
  },
  {
    title: "Promptfolio",
    description:
      "A prompt operations workspace for organizing experiments, comparing outputs, and turning one-off prompting into a repeatable evaluation loop.",
    tags: ["Evaluation", "Workflow Design", "Applied AI"],
    demoUrl: "https://promptfolio.jasani-rohan.workers.dev/",
    fillColor: "var(--color-fill-2)",
    accentColor: "#f97316",
  },
  {
    title: "Methanex Career Constellation",
    description:
      "A hackathon-built job taxonomy that turns inconsistent role data into an explorable view of workforce structure and career movement.",
    tags: ["Embeddings", "Clustering", "Data Storytelling"],
    demoUrl: "https://career-constellation.pages.dev/dashboard",
    fillColor: "var(--color-fill-3)",
    accentColor: "#10b981",
  },
  {
    title: "ALGS Performance Dashboard",
    description:
      "An interactive performance dashboard for professional Apex Legends players and teams, backed by a reusable Python data pipeline.",
    tags: ["Python", "Data Pipeline", "Visualization"],
    codeUrl: "https://github.com/goatcheese98/algs-championship-viz",
    fillColor: "var(--color-fill-4)",
    accentColor: "#8b5cf6",
  },
  {
    title: "AstroWeb Portfolio",
    description:
      "This site: an evolving personal workspace built with Astro, rough.js, and an Excalidraw-inspired visual language.",
    tags: ["Astro", "TypeScript", "rough.js", "Design Systems"],
    codeUrl: "https://github.com/goatcheese98/AstroWebsite",
    fillColor: "var(--color-fill-5)",
    accentColor: "#f59e0b",
  },
];

export const EXPERIENCES: Experience[] = [
  {
    company: "Level Up Mortgages",
    role: "AI Automation & Operations Associate",
    period: "2026 — Present",
    description:
      "Partnering with leadership and frontline staff to turn mortgage-operations bottlenecks into reliable AI-enabled systems the team can actually adopt.",
    highlights: [
      "Translate workflow discovery into product requirements, decision boundaries, and practical implementation plans",
      "Contribute hands-on to a production TypeScript and Cloudflare system connecting CRM, email, documents, meetings, and internal tools",
      "Build for trust with schema-grounded outputs, human approval gates, audit trails, repeat-safe operations, tests, and monitoring",
      "Support rollout through consultation, training, documentation, feedback, and continuous improvement",
    ],
    current: true,
    accentColor: "#f59e0b",
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
