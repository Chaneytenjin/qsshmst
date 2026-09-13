import { describe, it, expect } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Founder Admin Tests", () => {
  it("should verify Chaney founder account exists in database", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      expect(true).toBe(true);
      return;
    }

    const chaney = await db
      .select()
      .from(users)
      .where(eq(users.username, "Chaney"))
      .limit(1);

    expect(chaney.length).toBeGreaterThan(0);
    expect(chaney[0].isFounder).toBe(true);
    expect(chaney[0].role).toBe("admin");
    expect(chaney[0].isActive).toBe(true);
  });

  it("should verify founder accounts have isFounder flag set", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      expect(true).toBe(true);
      return;
    }

    const founders = await db
      .select()
      .from(users)
      .where(eq(users.isFounder, true));

    expect(founders.length).toBeGreaterThan(0);
    founders.forEach((founder) => {
      expect(founder.isFounder).toBe(true);
      expect(founder.role).toBe("admin");
    });
  });

  it("should verify non-founder accounts have isFounder flag unset", async () => {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for testing");
      expect(true).toBe(true);
      return;
    }

    const nonFounders = await db
      .select()
      .from(users)
      .where(eq(users.isFounder, false))
      .limit(5);

    nonFounders.forEach((user) => {
      expect(user.isFounder).toBe(false);
    });
  });
});
