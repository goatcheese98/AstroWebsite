import { describe, expect, it } from "vitest";

import {
  EXPERIENCES,
  NAV_LINKS,
  PORTFOLIO_TOOLKIT,
  PROJECTS,
  SITE,
} from "./constants";
import { LEGACY_PRODUCT_REDIRECTS } from "./legacy-product-redirects";

describe("sketch portfolio content", () => {
  it("keeps the current AI product and systems positioning", () => {
    expect(SITE.description).toContain("AI product and systems builder");
    expect(SITE.siteUrl).toBe("https://rohanjasani.com");
  });

  it("leads the existing experience stack with Level Up", () => {
    expect(EXPERIENCES[0]).toMatchObject({
      company: "Level Up Mortgages",
      role: "AI Automation & Operations Associate",
      current: true,
    });
    expect(EXPERIENCES[0].highlights.join(" ")).toContain("human approval");
    expect(EXPERIENCES.map((experience) => experience.company)).not.toContain(
      "UBC Sauder School of Business",
    );
  });

  it("keeps the selected work current and directly accessible", () => {
    expect(PROJECTS).toHaveLength(5);
    expect(PROJECTS.map((project) => project.title)).toEqual([
      "RoopStudio",
      "Promptfolio",
      "Methanex Career Constellation",
      "ALGS Performance Dashboard",
      "AstroWeb Portfolio",
    ]);

    for (const project of PROJECTS) {
      expect(project.demoUrl || project.codeUrl).toMatch(/^https:\/\//);
    }
  });

  it("keeps portfolio navigation focused on the public site", () => {
    expect(NAV_LINKS).toEqual([
      { label: "Work", href: "/#projects" },
      { label: "Experience", href: "/#experience" },
      { label: "Notes", href: "/blog" },
      { label: "Contact", href: "mailto:jasani.rohan@gmail.com" },
    ]);
  });

  it("groups the working toolkit around three relevant capabilities", () => {
    expect(PORTFOLIO_TOOLKIT.map((group) => group.title)).toEqual([
      "Applied AI systems",
      "Product delivery",
      "Reliable implementation",
    ]);
  });

  it("hands retired Canvas routes to the migrated RoopStudio product", () => {
    expect(LEGACY_PRODUCT_REDIRECTS).toEqual({
      canvas: "https://canvas.rohanjasani.com/",
      dashboard: "https://canvas.rohanjasani.com/dashboard",
      login: "https://canvas.rohanjasani.com/login",
      signup: "https://canvas.rohanjasani.com/signup",
    });
  });
});
