import { vi } from "vitest";

export const pool = {
  query: vi.fn(),
  connect: vi.fn(() => ({
    query: vi.fn(),
    release: vi.fn(),
  })),
};
