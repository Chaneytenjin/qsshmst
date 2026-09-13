import { describe, expect, it } from "vitest";
import { getLoginUrl } from "../client/src/const";

describe("獨立登入網址", () => {
  it("未登入時導向站內登入頁", () => {
    expect(getLoginUrl()).toBe("/login");
  });
});
