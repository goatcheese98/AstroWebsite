export const POSITIONING = {
  role: "AI Product & Systems Builder",
  location: "Vancouver, Canada",
  headline: "I turn operational friction into AI systems teams actually use.",
  summary:
    "I combine business judgment, product thinking, and AI-enabled delivery to take messy workflows from discovery to a working system, then help the people around it adopt and improve it.",
  availability:
    "Exploring applied AI, forward-deployed, solutions, and product systems roles in Canada.",
  proof: [
    "Production AI operations",
    "Cross-platform workflows",
    "Human approval controls",
    "Team enablement",
  ],
} as const;

export const LEVEL_UP_CASE_STUDY: {
  officialRole: string;
  scope: string;
  organization: string;
  period: string;
  context: string;
  mandate: string;
  systems: readonly string[];
  capabilities: readonly { title: string; description: string }[];
  trustControls: readonly string[];
  stack: readonly string[];
  sourceUrl?: string;
} = {
  officialRole: "AI Automation & Operations Associate",
  scope: "AI product, systems, and enablement scope",
  organization: "Level Up Mortgages",
  period: "2026 - present",
  context:
    "A Vancouver mortgage brokerage team working across client communication, CRM, documents, meetings, lender information, and internal planning.",
  mandate:
    "I partner with leadership and frontline staff to find operational bottlenecks, translate them into practical product requirements, contribute hands-on to the production system, and help the team adopt new ways of working.",
  systems: [
    "Gmail",
    "Zoho CRM",
    "Finmo",
    "Fathom",
    "Google Workspace",
    "Slack",
    "Asana",
    "Dropbox",
  ],
  capabilities: [
    {
      title: "Communication workflows",
      description:
        "Email triage and drafting, meeting follow-up, and coordinated work across the tools where the team already operates.",
    },
    {
      title: "Client operations",
      description:
        "Document filing, CRM coordination, client context, and workflow checks for sensitive mortgage processes.",
    },
    {
      title: "Decision support",
      description:
        "Mortgage-rate and lender information, structured calculations, dashboards, and internal question-answering tools.",
    },
    {
      title: "Adoption and enablement",
      description:
        "Internal consultation, training, documentation, feedback collection, and iteration around how the systems are used day to day.",
    },
  ],
  trustControls: [
    "Schema-grounded model outputs",
    "Human approval before sensitive actions",
    "Audit trails and repeat-safe operations",
    "Automated tests and production monitoring",
  ],
  stack: [
    "TypeScript",
    "Hono",
    "Cloudflare Workers",
    "D1",
    "KV",
    "R2",
    "Queues",
    "Workflows",
    "Zod",
    "Vitest",
    "Bun",
  ],
};

export const OPERATING_APPROACH = [
  {
    number: "01",
    title: "Find the costly friction",
    description:
      "Talk with the people doing the work, map the real process, and separate a valuable problem from an impressive demo.",
  },
  {
    number: "02",
    title: "Design the decision boundary",
    description:
      "Define what the system should automate, what a person should approve, and what evidence each decision needs.",
  },
  {
    number: "03",
    title: "Build the smallest useful loop",
    description:
      "Connect the existing tools, ship a working vertical slice, and learn from real behavior before expanding the system.",
  },
  {
    number: "04",
    title: "Make it safe to depend on",
    description:
      "Add tests, approvals, logs, failure handling, and recovery paths in proportion to the risk of the workflow.",
  },
  {
    number: "05",
    title: "Earn adoption",
    description:
      "Train the team, document the new operating practice, gather feedback, and stay with the system after launch.",
  },
] as const;

export const SELECTED_WORK = [
  {
    title: "RoopStudio",
    label: "AI-native visual workspace",
    description:
      "A visual thinking environment that combines diagramming, structured notes, image generation, and AI-assisted refinement in one canvas.",
    proof:
      "Grounds model behavior in Excalidraw's schema so generated artifacts can become editable parts of the workspace rather than disposable images.",
    tags: ["Product engineering", "Structured AI", "Canvas systems"],
    href: "https://canvas.rohanjasani.com/",
    accent: "blue",
  },
  {
    title: "Promptfolio",
    label: "Prompt operations and evaluation",
    description:
      "A workspace for organizing prompts, comparing outputs, and turning one-off experimentation into a repeatable learning loop.",
    proof:
      "Designed around review, comparison, reuse, and the practical question of whether an AI workflow improves over time.",
    tags: ["Evaluation", "Workflow design", "Applied AI"],
    href: "https://promptfolio.jasani-rohan.workers.dev/",
    accent: "orange",
  },
  {
    title: "Methanex Career Constellation",
    label: "Analytics and decision storytelling",
    description:
      "A hackathon-built job taxonomy that turns inconsistent role data into an explorable view of workforce structure and career movement.",
    proof:
      "Combined data cleaning, text embeddings, clustering, and an interactive report in under two days.",
    tags: ["Embeddings", "Clustering", "Data storytelling"],
    href: "https://career-constellation.pages.dev/dashboard",
    accent: "green",
  },
  {
    title: "ALGS Performance Dashboard",
    label: "Community-facing analytics",
    description:
      "An interactive performance dashboard for professional Apex Legends players and teams, backed by a reusable Python data pipeline.",
    proof:
      "Made dense tournament results easier to compare and earned meaningful community engagement when shared with esports fans.",
    tags: ["Python", "Data pipeline", "Visualization"],
    href: "https://github.com/goatcheese98/algs-championship-viz",
    accent: "yellow",
  },
] as const;

export const CAREER = [
  {
    organization: "Level Up Mortgages",
    role: "AI Automation & Operations Associate",
    scope: "Applied AI product, systems, consultation, and enablement",
    period: "2026 - present",
    description:
      "Designing and rolling out AI-enabled operating systems for a mortgage brokerage, from workflow discovery and product delivery through team training and continuous improvement.",
    current: true,
  },
  {
    organization: "UBC Sauder School of Business",
    role: "Master of Business Analytics",
    scope: "Machine learning, data modernization, decision-making, and process design",
    period: "Expected Aug 2026",
    description:
      "Building the analytical foundation behind my product judgment: how to structure uncertainty, test assumptions, and connect data to operating decisions.",
    current: true,
  },
  {
    organization: "Goldman Sachs",
    role: "Consumer Wealth Management Analyst",
    scope: "Regulated operations, data quality, risk, and cross-functional execution",
    period: "2022 - 2023",
    description:
      "Supported high-net-worth client onboarding in a detail-sensitive environment where traceability, judgment, and reliable handoffs mattered every day.",
    current: false,
  },
  {
    organization: "Larry H. Miller Megaplex Theatres",
    role: "Data Analytics Intern",
    scope: "Automated data collection, statistical analysis, and business communication",
    period: "2022",
    description:
      "Built a Python and YouTube API data pipeline, tested the relationship between trailer engagement and theatre sales, and translated the result into a business recommendation.",
    current: false,
  },
] as const;

