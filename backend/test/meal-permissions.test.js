const test = require("node:test");
const assert = require("node:assert/strict");
const { getLocalParts, dateFromKey, isRequestWindowOpen } = require("../src/utils/messTime");
const requireRole = require("../src/middleware/requireRole");

test("Dhaka date and time are derived using Asia/Dhaka", () => {
  const parts = getLocalParts(new Date("2026-11-14T13:59:00.000Z"));
  assert.equal(parts.dateKey, "2026-11-14");
  assert.equal(parts.time, "19:59");
});

test("meal deadline closes at the exact configured minute", () => {
  assert.equal(isRequestWindowOpen("20:00", new Date("2026-11-14T13:59:00.000Z")), true);
  assert.equal(isRequestWindowOpen("20:00", new Date("2026-11-14T14:00:00.000Z")), false);
  assert.equal(isRequestWindowOpen("20:00", new Date("2026-11-14T14:01:00.000Z")), false);
});

test("meal date keys are stored as UTC midnight dates", () => {
  assert.equal(dateFromKey("2026-11-14").toISOString(), "2026-11-14T00:00:00.000Z");
});

test("role middleware blocks members from moderator-only routes", () => {
  const req = { user: { role: "Member" } };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  let calledNext = false;
  requireRole("Manager")(req, res, () => { calledNext = true; });
  assert.equal(calledNext, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test("role middleware allows a moderator", () => {
  const req = { user: { role: "Manager" } };
  let calledNext = false;
  requireRole("Manager")(req, {}, () => { calledNext = true; });
  assert.equal(calledNext, true);
});
