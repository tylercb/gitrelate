import { describe, expect, it } from "vitest";
import { formatDateRange, formatShare, linkableHost } from "./format";

describe("formatDateRange", () => {
  it("describes the span by month and year", () => {
    expect(formatDateRange({ start: "2023-01-13", end: "2026-07-02" })).toBe(
      "between Jan 2023 and Jul 2026"
    );
  });

  it("does not shift a date at the start of a month into the month before", () => {
    expect(formatDateRange({ start: "2023-01-01", end: "2026-12-31" })).toBe(
      "between Jan 2023 and Dec 2026"
    );
  });
});

describe("formatShare", () => {
  it("formats a fraction as a percentage with one decimal place", () => {
    expect(formatShare(0.1065)).toBe("10.7%");
    expect(formatShare(1)).toBe("100.0%");
    expect(formatShare(0.001)).toBe("0.1%");
  });

  it("shows very small shares as less than 0.1%", () => {
    expect(formatShare(0.0004)).toBe("<0.1%");
  });

  it("returns an empty string when the share is unknown", () => {
    expect(formatShare(null)).toBe("");
  });
});

describe("linkableHost", () => {
  it("returns the host of a web address", () => {
    expect(linkableHost("https://clickhouse.com")).toBe("clickhouse.com");
    expect(linkableHost("http://example.org/docs?x=1")).toBe("example.org");
  });

  it("rejects addresses that are not web links", () => {
    expect(linkableHost("javascript:alert(1)")).toBeNull();
    expect(linkableHost("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(linkableHost("mailto:someone@example.org")).toBeNull();
  });

  it("rejects text that is not an address at all", () => {
    expect(linkableHost("clickhouse.com")).toBeNull();
    expect(linkableHost("")).toBeNull();
    expect(linkableHost(null)).toBeNull();
  });
});
