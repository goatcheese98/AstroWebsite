import { describe, expect, it } from "vitest";

import { EXPERIENCES, PROJECTS, SITE } from "./constants";

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

  it("fills the existing project carousel with current public work", () => {
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
});
