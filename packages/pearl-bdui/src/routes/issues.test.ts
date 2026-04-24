import Fastify from "fastify";
import { describe, expect, it } from "vitest";

// Minimal route-schema regression for inline-attachment-mode field sizing.
// Reproduces the constraint that broke beads-gui-0t2c: a 50KB inline image
// produces ~70KB of base64+wrapping, which must be accepted by description /
// notes / design / acceptance_criteria fields and the comment text field.

const FIELD_MAX_LENGTH = 4_000_000;

const updateIssueSchema = {
  body: {
    type: "object",
    properties: {
      description: { type: "string", maxLength: FIELD_MAX_LENGTH },
      notes: { type: "string", maxLength: FIELD_MAX_LENGTH },
      design: { type: "string", maxLength: FIELD_MAX_LENGTH },
      acceptance_criteria: { type: "string", maxLength: FIELD_MAX_LENGTH },
    },
    additionalProperties: false,
  },
} as const;

const addCommentSchema = {
  body: {
    type: "object",
    required: ["text"],
    properties: {
      text: { type: "string", minLength: 1, maxLength: FIELD_MAX_LENGTH },
    },
    additionalProperties: false,
  },
} as const;

function buildInlineAttachmentField(rawBytes: number): string {
  // 50KB raw image base64-encodes to ceil(50000 * 4 / 3) ≈ 66700 chars.
  const base64Len = Math.ceil((rawBytes * 4) / 3);
  const base64 = "A".repeat(base64Len);
  const ref = "aabbccdd1122";
  return [
    "# Description",
    "",
    `[img:${ref}]`,
    "",
    `<!-- pearl-attachment:v1:${ref}`,
    "type: inline",
    "mime: image/webp",
    `data: ${base64}`,
    "-->",
  ].join("\n");
}

describe("issue route schema — inline attachment field sizing", () => {
  it("accepts a 50KB inline image embedded in description", async () => {
    const app = Fastify();
    app.patch("/api/issues/:id", { schema: updateIssueSchema }, async () => ({ ok: true }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/issues/test-1",
      payload: { description: buildInlineAttachmentField(50_000) },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("accepts a 50KB inline image embedded in a comment", async () => {
    const app = Fastify();
    app.post("/api/issues/:id/comments", { schema: addCommentSchema }, async () => ({ ok: true }));

    const response = await app.inject({
      method: "POST",
      url: "/api/issues/test-1/comments",
      payload: { text: buildInlineAttachmentField(50_000) },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects pathological payloads above the cap", async () => {
    const app = Fastify({ bodyLimit: 16 * 1024 * 1024 });
    app.patch("/api/issues/:id", { schema: updateIssueSchema }, async () => ({ ok: true }));

    // Build a payload >FIELD_MAX_LENGTH so the schema rejects it.
    const oversized = "x".repeat(FIELD_MAX_LENGTH + 1);

    const response = await app.inject({
      method: "PATCH",
      url: "/api/issues/test-1",
      payload: { description: oversized },
    });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it("regression: 10KB description still accepted (small fields keep working)", async () => {
    const app = Fastify();
    app.patch("/api/issues/:id", { schema: updateIssueSchema }, async () => ({ ok: true }));

    const response = await app.inject({
      method: "PATCH",
      url: "/api/issues/test-1",
      payload: { description: "x".repeat(10_000) },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
