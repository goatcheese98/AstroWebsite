// Template Selection Modal - Center popup with template library and advanced features

import React, { useState, useEffect } from "react";
import type { PromptTemplate } from "./types";
import { useMobileDetection } from "./hooks/useMobileDetection";

// Enhanced template library with categories
const TEMPLATE_CATEGORIES: Record<string, PromptTemplate[]> = {
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
            description: "Process flow diagram",
            template: "Create a flowchart for: {process}",
            variables: [{ name: "process", label: "Process", type: "text" }]
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
            id: "erd",
            icon: "🗄️",
            title: "Database ERD",
            description: "Entity relationship diagram",
            template: "Create an ERD for {database} with entities: {entities}",
            variables: [
                { name: "database", label: "Database Name", type: "text" },
                { name: "entities", label: "Main Entities", type: "text" }
            ]
        },
        {
            id: "sequence",
            icon: "📡",
            title: "Sequence Diagram",
            description: "API/Service interactions",
            template: "Create a sequence diagram for {interaction}",
            variables: [{ name: "interaction", label: "Interaction", type: "text" }]
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

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: PromptTemplate) => void;
    selectedElementsCount: number;
}

export default function TemplateModal({
    isOpen,
    onClose,
    onSelect,
    selectedElementsCount,
}: TemplateModalProps) {
    const { isMobile } = useMobileDetection();
    const [selectedCategory, setSelectedCategory] = useState<string>("Design & UI");
    const [searchQuery, setSearchQuery] = useState("");
    const [recentTemplates, setRecentTemplates] = useState<string[]>([]);

    // Load recent templates from localStorage
    useEffect(() => {
        if (isOpen) {
            const stored = localStorage.getItem("recent-templates");
            if (stored) {
                try {
                    setRecentTemplates(JSON.parse(stored));
                } catch (e) {
                    console.error("Failed to load recent templates:", e);
                }
            }
        }
    }, [isOpen]);

    // Save recent template
    const saveRecentTemplate = (templateId: string) => {
        const updated = [templateId, ...recentTemplates.filter(id => id !== templateId)].slice(0, 5);
        setRecentTemplates(updated);
        localStorage.setItem("recent-templates", JSON.stringify(updated));
    };

    // Handle template selection
    const handleTemplateSelect = (template: PromptTemplate) => {
        saveRecentTemplate(template.id);
        onSelect(template);
    };

    // Filter templates by search
    const filteredTemplates = Object.entries(TEMPLATE_CATEGORIES).reduce((acc, [category, templates]) => {
        if (searchQuery.trim()) {
            const filtered = templates.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (filtered.length > 0) {
                acc[category] = filtered;
            }
        } else if (category === selectedCategory) {
            acc[category] = templates;
        }
        return acc;
    }, {} as Record<string, PromptTemplate[]>);

    // Get recent template objects
    const recentTemplateObjects = recentTemplates
        .map(id => {
            for (const templates of Object.values(TEMPLATE_CATEGORIES)) {
                const found = templates.find(t => t.id === id);
                if (found) return found;
            }
            return null;
        })
        .filter(Boolean) as PromptTemplate[];

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="modal-overlay"
                onClick={onClose}
                style={{ zIndex: 2000, animation: "fadeIn 0.2s ease" }}
            />

            {/* Modal */}
            <div
                className="template-modal"
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "90%",
                    maxWidth: "800px",
                    maxHeight: "85vh",
                    background: "var(--color-surface)",
                    borderRadius: "16px",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                    zIndex: 2001,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    animation: "modalSlideIn 0.25s ease",
                }}
            >
                {/* Header */}
                <div className="bg-surface-hover" style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: "16px" }}>
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "10px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}>
                                <span style={{ fontSize: "20px" }}>⚡</span>
                            </div>
                            <div>
                                <h2 className="text-text" style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                                    Template Library
                                </h2>
                                <p className="text-text-secondary" style={{ margin: 0, fontSize: "12px" }}>
                                    {selectedElementsCount > 0
                                        ? `${selectedElementsCount} element${selectedElementsCount !== 1 ? 's' : ''} selected`
                                        : "Choose a template to get started"}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="btn-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search templates..."
                            className="input-field"
                            style={{
                                width: "100%",
                                paddingLeft: "40px",
                            }}
                        />
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-text-secondary)"
                            strokeWidth="2"
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                            }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </div>
                </div>

                <div className="flex overflow-hidden" style={{ flex: 1 }}>
                    {/* Sidebar - Categories */}
                    {!searchQuery && !isMobile && (
                        <div
                            className="overflow-y-auto"
                            style={{
                                width: "200px",
                                borderRight: "1px solid var(--color-stroke-muted, #e5e7eb)",
                                padding: "16px",
                                background: "var(--color-fill-1, #f9fafb)",
                            }}
                        >
                            <div className="text-text-secondary" style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: "12px",
                            }}>
                                Categories
                            </div>
                            {Object.keys(TEMPLATE_CATEGORIES).map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={selectedCategory === category ? "btn-primary" : "btn-secondary"}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        marginBottom: "4px",
                                        fontSize: "13px",
                                        fontWeight: selectedCategory === category ? 600 : 400,
                                        justifyContent: "flex-start",
                                        padding: "10px 12px",
                                    }}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Content - Templates */}
                    <div className="overflow-y-auto" style={{ flex: 1, padding: "20px" }}>
                        {/* Recent Templates */}
                        {!searchQuery && recentTemplateObjects.length > 0 && (
                            <div style={{ marginBottom: "24px" }}>
                                <h3 className="flex items-center gap-2 text-text" style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    marginBottom: "12px",
                                }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Recently Used
                                </h3>
                                <div
                                    className="card-grid"
                                    style={{
                                        gridTemplateColumns: isMobile
                                            ? "repeat(auto-fill, minmax(140px, 1fr))"
                                            : "repeat(auto-fill, minmax(160px, 1fr))",
                                        gap: isMobile ? "10px" : "12px",
                                    }}
                                >
                                    {recentTemplateObjects.map(template => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            onSelect={handleTemplateSelect}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Template Grid */}
                        {Object.entries(filteredTemplates).map(([category, templates]) => (
                            <div key={category} style={{ marginBottom: "24px" }}>
                                <h3 className="text-text" style={{
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    marginBottom: "12px",
                                }}>
                                    {category}
                                </h3>
                                <div
                                    className="card-grid"
                                    style={{
                                        gridTemplateColumns: isMobile
                                            ? "repeat(auto-fill, minmax(140px, 1fr))"
                                            : "repeat(auto-fill, minmax(160px, 1fr))",
                                        gap: isMobile ? "10px" : "12px",
                                    }}
                                >
                                    {templates.map(template => (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            onSelect={handleTemplateSelect}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}

                        {Object.keys(filteredTemplates).length === 0 && (
                            <div className="placeholder-content" style={{ padding: "40px 20px" }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "12px", opacity: 0.5 }}>
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <p style={{ margin: 0, fontSize: "14px" }}>No templates found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Animations */}
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(0.95);
                        }
                        to {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                    }
                    @keyframes slideUp {
                        from {
                            transform: translateY(100%);
                        }
                        to {
                            transform: translateY(0);
                        }
                    }
                `}</style>
            </div>
        </>
    );
}

// Template Card Component
function TemplateCard({ template, onSelect }: { template: PromptTemplate; onSelect: (t: PromptTemplate) => void }) {
    return (
        <button
            onClick={() => onSelect(template)}
            className="template-card"
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                textAlign: "left",
                padding: "14px",
                background: "var(--color-bg)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-accent, #6366f1)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-stroke-muted, #e5e7eb)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
            }}
        >
            <span className="template-card__icon">{template.icon}</span>
            <div>
                <div className="template-card__title" style={{ marginBottom: "2px" }}>
                    {template.title}
                </div>
                <div className="template-card__desc">
                    {template.description}
                </div>
            </div>
        </button>
    );
}
