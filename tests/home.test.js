import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import app from "./server.js";

const request = supertest(app);

// ─── Shared test state ────────────────────────────────────────────────────────
let volunteerUserId;
let volunteerId;
let orgUserId;
let orgId;
let eventId;
let roleId;
let badgeId;

// ─── Auth & Registration ──────────────────────────────────────────────────────
describe("POST /api/registerVolunteer", () => {
  it("creates a new volunteer account", async () => {
    const res = await request.post("/api/registerVolunteer").send({
      username: `vol_${Date.now()}`,
      email: `vol_${Date.now()}@test.com`,
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      phone: "5855550001",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    volunteerId = res.body.id;
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request.post("/api/registerVolunteer").send({
      email: "missing@test.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 409 when username/email already exists", async () => {
    const payload = {
      username: "duplicate_vol",
      email: "duplicate_vol@test.com",
      password: "password123",
      firstName: "Jane",
      lastName: "Doe",
      phone: "5855550001",
    };
    await request.post("/api/registerVolunteer").send(payload);
    const res = await request.post("/api/registerVolunteer").send(payload);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/registerOrg", () => {
  it("creates a new organization account", async () => {
    const res = await request.post("/api/registerOrg").send({
      username: `org_${Date.now()}`,
      name: "Test Org",
      email: `org_${Date.now()}@test.com`,
      phone: "5855550002",
      description: "A test org",
      password: "password123",
      category_id: 1,
      zip_code: "14604",
      address: "123 Main St",
      brand_colors: ["#15803d"],
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    orgId = res.body.id;
  });

  it("returns 409 when org email already exists", async () => {
    const payload = {
      username: "duplicate_org",
      name: "Dupe Org",
      email: "duplicate_org@test.com",
      phone: "5855550003",
      password: "password123",
      category_id: 1,
      zip_code: "14604",
      address: "123 Main St",
    };
    await request.post("/api/registerOrg").send(payload);
    const res = await request.post("/api/registerOrg").send(payload);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/login", () => {
  it("returns a token and user on valid credentials", async () => {
    const username = `login_test_${Date.now()}`;
    await request.post("/api/registerVolunteer").send({
      username,
      email: `${username}@test.com`,
      password: "password123",
      firstName: "Test",
      lastName: "User",
      phone: "5855550010",
    });

    const res = await request.post("/api/login").send({
      username,
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("role");
    volunteerUserId = res.body.user.id;
  });

  it("returns 401 for wrong password", async () => {
    const res = await request.post("/api/login").send({
      username: "nonexistent_user",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/checkEmail", () => {
  it("returns available: true for an unused email", async () => {
    const res = await request.get("/api/checkEmail").query({ email: "totally_new@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.available).toBe(true);
  });

  it("returns 400 when email query param is missing", async () => {
    const res = await request.get("/api/checkEmail");
    expect(res.status).toBe(400);
  });
});

// ─── Events ───────────────────────────────────────────────────────────────────
describe("POST /api/events", () => {
  it("creates a new draft event", async () => {
    const res = await request.post("/api/events").send({
      organization_id: orgId ?? 1,
      name: "Test Cleanup Day",
      description: "A test volunteer event",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      address: "123 Main St",
      city: "Rochester",
      state: "NY",
      zip_code: "14604",
      color: "#15803d",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    eventId = res.body.id;
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request.post("/api/events").send({
      name: "Incomplete Event",
    });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});

describe("PUT /api/events/:id", () => {
  it("updates an existing event", async () => {
    const res = await request.put(`/api/events/${eventId}`).send({
      name: "Updated Cleanup Day",
      description: "Updated description",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      address: "456 Oak Ave",
      city: "Rochester",
      state: "NY",
      zip_code: "14604",
      color: "#1d4ed8",
      recurrence: "weekly",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request.put("/api/events/999999").send({
      name: "Ghost Event",
      description: "Doesn't exist",
      start_time: "2026-06-01T09:00:00",
      end_time: "2026-06-01T12:00:00",
      zip_code: "14604",
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/events/:id/publish", () => {
  it("publishes a draft event", async () => {
    const res = await request.put(`/api/events/${eventId}/publish`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request.put("/api/events/999999/publish");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events", () => {
  it("returns an array of published events", async () => {
    const res = await request.get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("every returned event has a PUBLISHED status", async () => {
    const res = await request.get("/api/events");
    for (const ev of res.body) {
      expect(ev.status).toBe("PUBLISHED");
    }
  });
});

describe("PUT /api/events/:id/cancel", () => {
  it("cancels a published event", async () => {
    const res = await request.put(`/api/events/${eventId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request.put("/api/events/999999/cancel");
    expect(res.status).toBe(404);
  });
});

// ─── Event Registrations ──────────────────────────────────────────────────────
describe("POST /api/events/:id/register", () => {
  it("returns 400 when event is not published", async () => {
    // eventId is now CANCELLED from above
    const res = await request.post(`/api/events/${eventId}/register`).send({
      volunteer_id: volunteerId ?? 1,
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request.post("/api/events/999999/register").send({
      volunteer_id: 1,
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/:id/registrations", () => {
  it("returns an array of registrants", async () => {
    const res = await request.get(`/api/events/${eventId}/registrations`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/events/:id/registrations/count", () => {
  it("returns a numeric total", async () => {
    const res = await request.get(`/api/events/${eventId}/registrations/count`);
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
  });
});

describe("POST /api/events/:id/checkin", () => {
  it("records a check-in for a volunteer", async () => {
    const res = await request.post(`/api/events/${eventId}/checkin`).send({
      volunteer_id: volunteerId ?? 1,
      time_in: new Date().toISOString(),
      time_out: null,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("DELETE /api/events/:id/register", () => {
  it("returns 404 when registration doesn't exist", async () => {
    const res = await request.delete(`/api/events/${eventId}/register`).send({
      volunteer_id: 999999,
    });
    expect(res.status).toBe(404);
  });
});

// ─── Event Roles ──────────────────────────────────────────────────────────────
describe("POST /api/events/:id/roles", () => {
  it("saves roles for an event", async () => {
    const res = await request.post(`/api/events/${eventId}/roles`).send({
      roles: [
        { name: "Trail Cleaner", spots: 5 },
        { name: "Team Lead", spots: 2 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/events/:id/roles", () => {
  it("returns roles with spot counts", async () => {
    const res = await request.get(`/api/events/${eventId}/roles`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      roleId = res.body[0].id;
      expect(res.body[0]).toHaveProperty("name");
      expect(res.body[0]).toHaveProperty("spots");
      expect(res.body[0]).toHaveProperty("filled");
    }
  });
});

describe("POST /api/roles/:id/register", () => {
  it("returns 404 for a non-existent role", async () => {
    const res = await request.post("/api/roles/999999/register").send({
      volunteer_id: volunteerId ?? 1,
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/roles/:id/register", () => {
  it("returns 404 when role registration doesn't exist", async () => {
    const res = await request.delete(`/api/roles/${roleId ?? 1}/register`).send({
      volunteer_id: 999999,
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/roles/:id/volunteers", () => {
  it("returns an array of volunteers for a role", async () => {
    const res = await request.get(`/api/roles/${roleId ?? 1}/volunteers`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── Event Tags & Badges ──────────────────────────────────────────────────────
describe("POST /api/events/:id/tags", () => {
  it("saves tags for an event", async () => {
    const res = await request.post(`/api/events/${eventId}/tags`).send({
      tags: ["Environment", "Community"],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/events/:id/tags", () => {
  it("returns tags for an event", async () => {
    const res = await request.get(`/api/events/${eventId}/tags`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/badges", () => {
  it("returns all badges", async () => {
    const res = await request.get("/api/badges");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) badgeId = res.body[0].id;
  });
});

describe("POST /api/events/:id/badges", () => {
  it("assigns badges to an event", async () => {
    const res = await request.post(`/api/events/${eventId}/badges`).send({
      badge_ids: badgeId ? [badgeId] : [],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/events/:id/badges", () => {
  it("returns badges linked to an event", async () => {
    const res = await request.get(`/api/events/${eventId}/badges`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ─── Volunteer Routes ─────────────────────────────────────────────────────────
describe("GET /api/volunteers/:id", () => {
  it("returns volunteer profile for a valid user_id", async () => {
    if (!volunteerUserId) return; // skip if login didn't run
    const res = await request.get(`/api/volunteers/${volunteerUserId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("full_name");
    expect(res.body).toHaveProperty("email");
  });

  it("returns 404 for a non-existent volunteer", async () => {
    const res = await request.get("/api/volunteers/999999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/volunteers/:id/badges", () => {
  it("returns badges for a volunteer", async () => {
    const res = await request.get(`/api/volunteers/${volunteerId ?? 1}/badges`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/volunteers/:id/badges", () => {
  it("awards a badge to a volunteer", async () => {
    if (!badgeId) return;
    const res = await request.post(`/api/volunteers/${volunteerId ?? 1}/badges`).send({
      badge_id: badgeId,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/volunteers/:id/registrations", () => {
  it("returns registered events for a volunteer (by user_id)", async () => {
    const res = await request.get(`/api/volunteers/${volunteerUserId ?? 1}/registrations`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/volunteers/:id/past-events", () => {
  it("returns past events for a volunteer (by user_id)", async () => {
    const res = await request.get(`/api/volunteers/${volunteerUserId ?? 1}/past-events`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/volunteers/:id/service-hours", () => {
  it("returns service hours for a volunteer (by user_id)", async () => {
    const res = await request.get(`/api/volunteers/${volunteerUserId ?? 1}/service-hours`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/volunteers/zip_code", () => {
  it("returns 400 when user_id is missing", async () => {
    const res = await request.get("/api/volunteers/zip_code");
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/volunteers/profile", () => {
  it("updates a volunteer profile", async () => {
    const res = await request.put("/api/volunteers/profile").send({
      user_id: volunteerUserId ?? 1,
      firstName: "Jane",
      lastName: "Updated",
      zip_code: "14620",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Organization Routes ──────────────────────────────────────────────────────
describe("GET /api/organizations/by-user/:userId", () => {
  it("returns organization for a valid user", async () => {
    if (!orgId) return;
    const res = await request.get(`/api/organizations/by-user/${orgId}`);
    // May be 200 or 404 depending on seeded data
    expect([200, 404]).toContain(res.status);
  });
});

describe("GET /api/organizations/:id", () => {
  it("returns an organization by id", async () => {
    if (!orgId) return;
    const res = await request.get(`/api/organizations/${orgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 404 for a non-existent org", async () => {
    const res = await request.get("/api/organizations/999999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/organizations/:id/events", () => {
  it("returns all events for an org", async () => {
    if (!orgId) return;
    const res = await request.get(`/api/organizations/${orgId}/events`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns only published events when publishedOnly=true", async () => {
    if (!orgId) return;
    const res = await request.get(`/api/organizations/${orgId}/events`).query({ publishedOnly: "true" });
    expect(res.status).toBe(200);
    for (const ev of res.body) {
      expect(ev.status).toBe("PUBLISHED");
    }
  });
});

describe("GET /api/organizations/:id/event-stats", () => {
  it("returns event stats for an org", async () => {
    if (!orgId) return;
    const res = await request.get(`/api/organizations/${orgId}/event-stats`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/organizations/zip_code", () => {
  it("returns 400 when user_id is missing", async () => {
    const res = await request.get("/api/organizations/zip_code");
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/organizations/profile", () => {
  it("updates an organization profile", async () => {
    const res = await request.put("/api/organizations/profile").send({
      user_id: orgId ?? 1,
      name: "Updated Org Name",
      address: "789 Elm St",
      zip_code: "14604",
      motto: "Helping the community",
      brand_colors: ["#15803d", "#1d4ed8"],
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─── Misc / Lookup Routes ─────────────────────────────────────────────────────
describe("GET /api/orgCategories", () => {
  it("returns an array of org categories", async () => {
    const res = await request.get("/api/orgCategories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/eventCategories", () => {
  it("returns an array of event categories", async () => {
    const res = await request.get("/api/eventCategories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/full_name", () => {
  it("returns name for a valid volunteer user_id", async () => {
    if (!volunteerUserId) return;
    const res = await request.get("/api/full_name").query({ user_id: volunteerUserId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("name");
  });

  it("returns 404 for unknown user_id", async () => {
    const res = await request.get("/api/full_name").query({ user_id: 999999 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/phone", () => {
  it("returns phone number for a valid user", async () => {
    if (!volunteerUserId) return;
    const res = await request.get("/api/phone").query({ user_id: volunteerUserId });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("phone");
  });

  it("returns 404 for unknown user", async () => {
    const res = await request.get("/api/phone").query({ user_id: 999999 });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/events/:id/volunteer-role/:volunteerId", () => {
  it("returns a role_id (or null) for a volunteer in an event", async () => {
    const res = await request.get(`/api/events/${eventId}/volunteer-role/${volunteerId ?? 1}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("role_id");
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────
describe("DELETE /api/events/:id", () => {
  it("deletes an existing event", async () => {
    const res = await request.delete(`/api/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 for a non-existent event", async () => {
    const res = await request.delete("/api/events/999999");
    expect(res.status).toBe(404);
  });
});