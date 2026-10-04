import { describe, expect, it } from "vitest";
import { product } from "./product";

describe("product locale", () => {
  it("uses Arabic and right-to-left layout by default", () => {
    expect(product.name).toBe("Azez AI OS");
    expect(product.locale).toBe("ar");
    expect(product.direction).toBe("rtl");
  });
});
