import request from "supertest";
import { describe, it, expect } from "vitest";
import app from "../backend/server";

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

describe("Volunteer registration", () => {
  it("should register a volunteer", async () => {
    const uniqueEmail = `test${Date.now()}@test.com`;

    const res = await request(app)
      .post("/api/registerVolunteer")
      .send({
        email: uniqueEmail,
        password: "pass123",
        firstName: "Jane",
        lastName: "Doe",
        phone: "555-1234"
      });

    console.log(res.statusCode, res.body);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("id");
  });
});