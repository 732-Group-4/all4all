import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


/**
 * Verify that server starts up as intended on port 3001 when start is run
 */
describe("start.js", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call app.listen on port 3001", async () => {
    const listen = vi.fn((port, callback) => {
      callback();
      return { close: vi.fn() };
    });

    const appMock = { listen };
    vi.doMock("../backend/server.js", () => ({ default: appMock }));

    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("../backend/start.js");

    expect(listen).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3001, expect.any(Function));
    expect(consoleLog).toHaveBeenCalledWith("API running on port 3001");
  });
});