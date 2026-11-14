import type {
  SiteMetadata,
  Project,
  Experience,
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
    title: "Discovery & product judgment",
    description:
      "I start where the friction is: sitting with the people doing the work, mapping how it actually flows, and deciding what is worth building — and what isn't.",
    items: ["Workflow mapping", "Requirements", "Decision boundaries", "Prioritization", "Stakeholder alignment"],
    accentColor: "#3b82f6",
  },
  {
    title: "AI systems design",
    description:
      "Then I shape AI around the workflow, not the other way around: agents with clear guardrails, measurable output quality, and a human in the loop where judgment matters.",
    items: ["Agentic workflows", "Tool use", "Structured outputs", "Evals & guardrails", "Human-in-the-loop"],
    accentColor: "#f59e0b",
  },
  {
    title: "Delivery & adoption",
    description:
      "And I ship it for real: small, observable systems, then the unglamorous part — rollout, training, and iteration until the team relies on it without thinking.",
    items: ["TypeScript", "Full-stack delivery", "Tests & monitoring", "Rollout & training", "Feedback loops"],
    accentColor: "#10b981",
  },
] as const;

export const PROJECTS: Project[] = [
  {
    // Internal to Level Up Mortgages, so there is no public link to show.
    title: "LumBrain",
    eyebrow: "AI operations platform",
    description:
      "Level Up Mortgages' internal AI operations platform. It connects CRM, email, documents, and meetings, reads incoming mortgage documents with human review for uncertain cases, and keeps approval gates and an audit trail on the actions it takes for the team.",
    tags: ["Agentic Workflows", "Document AI", "Human-in-the-loop", "TypeScript", "Cloudflare"],
    featured: true,
    fillColor: "var(--color-fill-1)",
    accentColor: "#3b82f6",
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
    demoUrl: "https://algs-championship-viz.pages.dev/",
    fillColor: "var(--color-fill-4)",
    accentColor: "#8b5cf6",
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
