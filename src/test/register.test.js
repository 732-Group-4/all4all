import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";

/**
 * Tests endpoint for email validation
 * Ensures unique email addresses
 * /api/checkEmail
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("CheckEmail tests", () => {
  it("should return email availability", async () => {
    const res = await request(app).get("/api/checkEmail?email=test@test.com");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("available");
  });

  it("should return 400 saying email is required", async () => {
    const res = await request(app).get("/api/checkEmail");

    expect(res.statusCode).toBe(400);
  });
});

/**
 * Tests endpoint for registration of new volunteer accounts
 * /api/registerVolunteer
 * Requires docker container of SQL database for tests to run (docker compose up)
 */
describe("Volunteer registration", () => {
  /**
   * Successful volunteer registration with all required arguments
   * Username and email must be unique, all other fields have no such validation
   * Successfull volunteer registration returns the generated record id
   */
  it("should register a volunteer", async () => {
    //Uses Date.now() to ensure that email and username are always unique
    const uniqueEmail = `test${Date.now()}@test.com`;
    const uniqueUsername = `test${Date.now()}`;

    //Send all required registration arguments in a post request and await response
    const res = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: uniqueUsername,
        email: uniqueEmail,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    //Log status and response contents for debugging
    console.log(res.statusCode, res.body);

    //Should return a success code and the record id that was created
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});

/**
 * Tests endpoint for unregistering volunteers from events
 * /api/events/:id/register
 */
describe("Volunteer unregister", () => {
  it("should unregister a volunteer from an event", async () => {
    const unique = Date.now();

    // Create volunteer
    const volunteerRes = await request(app)
      .post("/api/registerVolunteer")
      .send({
        username: `vol${unique}`,
        email: `vol${unique}@test.com`,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    expect(volunteerRes.statusCode).toBe(200);

    // Create organization
    const orgRes = await request(app)
      .post("/api/registerOrg")
      .send({
        name: `org${unique}`,
        email: `org${unique}@test.com`,
        phone: "555-1111",
        description: "Test organization",
        password: "pass123",
        category_id: 1,
        zip_code: "14623"
      });

    expect(orgRes.statusCode).toBe(200);

    // Create event
    const eventRes = await request(app)
      .post("/api/events")
      .send({
        organization_id: orgRes.body.id,
        name: "Unregister Test Event",
        description: "Testing unregister",
        start_time: "2026-04-05T10:00:00Z",
        end_time: "2026-04-05T12:00:00Z",
        address: "100 Main St",
        city: "Rochester",
        state: "NY",
        zip_code: "14623"
      });

    expect(eventRes.statusCode).toBe(200);

    // Publish event
    await request(app)
      .put(`/api/events/${eventRes.body.id}/publish`);

    // Register volunteer
    await request(app)
      .post(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    // Unregister volunteer
    const unregisterRes = await request(app)
      .delete(`/api/events/${eventRes.body.id}/register`)
      .send({
        volunteer_id: volunteerRes.body.id
      });

    console.log("Unregister:", unregisterRes.statusCode, unregisterRes.body);

    expect(unregisterRes.statusCode).toBe(200);
    expect(unregisterRes.body).toHaveProperty("success", true);
  });

  it("should return 404 when unregistering nonexistent registration", async () => {
    const res = await request(app)
      .delete("/api/events/999999/register")
      .send({
        volunteer_id: 999999
      });

    console.log("Unregister fail:", res.statusCode, res.body);

    expect(res.statusCode).toBe(404);
  });
});