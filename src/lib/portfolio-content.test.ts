import { describe, expect, it } from "vitest";
import {
  CAREER,
  LEVEL_UP_CASE_STUDY,
  POSITIONING,
  SELECTED_WORK,
} from "./portfolio-content";

describe("portfolio reboot content", () => {
  it("leads with one stable AI product and systems identity", () => {
    expect(POSITIONING.role).toBe("AI Product & Systems Builder");
    expect(POSITIONING.headline).toBe(
      "I turn operational friction into AI systems teams actually use.",
    );
  });

  it("describes Level Up as collaborative professional work", () => {
    expect(LEVEL_UP_CASE_STUDY.officialRole).toBe(
      "AI Automation & Operations Associate",
    );
    expect(LEVEL_UP_CASE_STUDY.context).toContain("team");
    expect(LEVEL_UP_CASE_STUDY.sourceUrl).toBeUndefined();
  });

  it("keeps the selected work visible and directly accessible", () => {
    expect(SELECTED_WORK).toHaveLength(4);
    expect(SELECTED_WORK.every((project) => project.href.startsWith("http"))).toBe(
      true,
    );
  });

  it("puts current Level Up work first in the career timeline", () => {
    expect(CAREER[0]).toMatchObject({
      organization: "Level Up Mortgages",
      current: true,
    });
  });
});
