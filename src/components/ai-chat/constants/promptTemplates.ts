import type { PromptTemplate } from "../types";

/**
 * Quick templates for the simple template picker
 */
export const QUICK_TEMPLATES: PromptTemplate[] = [
    {
        id: "ui-mockup",
        icon: "🎨",
        title: "UI Mockup",
        description: "Create wireframe for web/mobile",
        template: "Create a {platform} wireframe for {description}",
        variables: [
            { name: "platform", label: "Platform", type: "select", options: ["web", "mobile", "tablet"] },
            { name: "description", label: "Description", type: "text" }
        ]
    },
    {
        id: "flowchart",
        icon: "🔄",
        title: "Flowchart",
        description: "Process flow diagram (Mermaid)",
        template: "Create a Mermaid flowchart for: {process}",
        variables: [{ name: "process", label: "Process", type: "text" }]
    },
    {
        id: "mermaid-sequence",
        icon: "📡",
        title: "Sequence",
        description: "API/service interactions",
        template: "Create a Mermaid sequence diagram for: {scenario}",
        variables: [{ name: "scenario", label: "Scenario", type: "text" }]
    },
    {
        id: "web-embed",
        icon: "🌐",
        title: "Embed Website",
        description: "Embed a web page on canvas",
        template: "Embed this website on the canvas: {url}",
        variables: [{ name: "url", label: "Website URL", type: "text" }]
    },
    {
        id: "architecture",
        icon: "🏗️",
        title: "Architecture",
        description: "System design diagram",
        template: "Design system architecture for: {system}",
        variables: [{ name: "system", label: "System", type: "text" }]
    },
    {
        id: "explain",
        icon: "💡",
        title: "Explain",
        description: "Explain selected elements",
        template: "Explain these canvas elements and suggest improvements",
        variables: []
    }
];

/**
 * Full template library organized by categories
 */
export const TEMPLATE_CATEGORIES: Record<string, PromptTemplate[]> = {
    "Design & UI": [
        {
            id: "ui-mockup",
            icon: "🎨",
            title: "UI Mockup",
            description: "Create wireframe for web/mobile",
            template: "Create a {platform} wireframe for {description}",
            variables: [
                { name: "platform", label: "Platform", type: "select", options: ["web", "mobile", "tablet", "desktop app"] },
                { name: "description", label: "Description", type: "text" }
            ]
        },
        {
            id: "landing-page",
            icon: "🏠",
            title: "Landing Page",
            description: "Hero section and CTA design",
            template: "Design a landing page for {product} targeting {audience}",
            variables: [
                { name: "product", label: "Product/Service", type: "text" },
                { name: "audience", label: "Target Audience", type: "text" }
            ]
        },
        {
            id: "dashboard",
            icon: "📊",
            title: "Dashboard",
            description: "Analytics and metrics layout",
            template: "Create a {type} dashboard showing {metrics}",
            variables: [
                { name: "type", label: "Dashboard Type", type: "select", options: ["analytics", "admin", "user", "sales"] },
                { name: "metrics", label: "Key Metrics", type: "text" }
            ]
        }
    ],
    "Diagrams": [
        {
            id: "flowchart",
            icon: "🔄",
            title: "Flowchart",
            description: "Process flow diagram (Mermaid)",
            template: "Create a flowchart using Mermaid for: {process}. Include decision points and process steps.",
            variables: [{ name: "process", label: "Process", type: "text" }]
        },
        {
            id: "architecture",
            icon: "🏗️",
            title: "Architecture",
            description: "System design diagram",
            template: "Design a system architecture diagram showing: {system}",
            variables: [{ name: "system", label: "System", type: "text" }]
        },
        {
            id: "sequence",
            icon: "📡",
            title: "Sequence Diagram",
            description: "API/Service interactions (Mermaid)",
            template: "Create a Mermaid sequence diagram showing: {interaction}. Include all participants and message flows.",
            variables: [{ name: "interaction", label: "Interaction", type: "text" }]
        },
        {
            id: "class",
            icon: "🧱",
            title: "Class Diagram",
            description: "OO design with classes (Mermaid)",
            template: "Create a Mermaid class diagram for: {domain}. Include classes, attributes, methods, and relationships.",
            variables: [{ name: "domain", label: "Domain/System", type: "text" }]
        },
        {
            id: "state",
            icon: "🔀",
            title: "State Diagram",
            description: "State machine (Mermaid)",
            template: "Create a Mermaid state diagram for: {subject}. Show all states and transitions.",
            variables: [{ name: "subject", label: "Subject", type: "text" }]
        },
        {
            id: "erd",
            icon: "🗄️",
            title: "Database ERD",
            description: "Entity relationship diagram",
            template: "Create an ERD for {database} with entities: {entities}",
            variables: [
                { name: "database", label: "Database Name", type: "text" },
                { name: "entities", label: "Main Entities", type: "text" }
            ]
        }
    ],
    "Business": [
        {
            id: "business-model",
            icon: "💼",
            title: "Business Model",
            description: "Canvas and strategy",
            template: "Create a business model canvas for {business}",
            variables: [{ name: "business", label: "Business Idea", type: "text" }]
        },
        {
            id: "user-journey",
            icon: "🚶",
            title: "User Journey",
            description: "Customer experience map",
            template: "Map user journey for {scenario}",
            variables: [{ name: "scenario", label: "User Scenario", type: "text" }]
        },
        {
            id: "swot",
            icon: "🎯",
            title: "SWOT Analysis",
            description: "Strategic analysis",
            template: "Create SWOT analysis for {subject}",
            variables: [{ name: "subject", label: "Analysis Subject", type: "text" }]
        }
    ],
    "AI Tools": [
        {
            id: "explain",
            icon: "💡",
            title: "Explain",
            description: "Explain selected elements",
            template: "Explain these canvas elements and suggest improvements",
            variables: []
        },
        {
            id: "improve",
            icon: "✨",
            title: "Improve Design",
            description: "Enhance visual hierarchy",
            template: "Improve the visual design and hierarchy of selected elements",
            variables: []
        },
        {
            id: "generate-variants",
            icon: "🔀",
            title: "Generate Variants",
            description: "Create design alternatives",
            template: "Generate {count} alternative designs based on selected elements",
            variables: [
                { name: "count", label: "Number of Variants", type: "select", options: ["2", "3", "4", "5"] }
            ]
        }
    ]
};

export default { QUICK_TEMPLATES, TEMPLATE_CATEGORIES };
