import { describe, expect, it } from "vitest";

import { isValidRequestId, resolveRequestId } from "@/lib/api/request-id";

describe("request ID correlation", () => {
  it("preserves a valid upstream request ID", () => {
    expect(resolveRequestId("req-01JABC_xyz.42")).toBe("req-01JABC_xyz.42");
  });

  it.each(["", " contains-space", "line\nbreak", "x".repeat(129)])(
    "rejects an unsafe request ID: %j",
    (value) => {
      expect(isValidRequestId(value)).toBe(false);
      expect(resolveRequestId(value)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    },
  );
});
