import { test, expect } from "@playwright/test";

const loginAsAdmin = async (page: import("@playwright/test").Page) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com or EMP-001").fill("admin@stm.com");
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect
    .poll(async () => page.url(), { timeout: 30000 })
    .toMatch(/\/dashboard/);
};

test.describe("CRM/Auth Tenant Boundary Regressions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should enforce idempotent customer create behavior within tenant", async ({ page }) => {
    const api = page.request;
    const uniqueEmail = `pw-idempotent-${Date.now()}@example.com`;

    const createPayload = {
      name: "Playwright Idempotent Customer",
      customerType: "INDIVIDUAL",
      primaryEmail: uniqueEmail,
      primaryPhone: "9999999999",
      billingAddress: "Sector 1",
      billingCity: "Noida",
      billingState: "Uttar Pradesh",
      billingPincode: "201301",
      billingCountry: "India",
    };

    const first = await api.post("/api/customers", { data: createPayload });
    expect(first.status()).toBe(201);
    const firstBody = await first.json();
    expect(firstBody?.id).toBeTruthy();

    const duplicateWithoutIdempotent = await api.post("/api/customers", { data: createPayload });
    expect(duplicateWithoutIdempotent.status()).toBe(409);

    const duplicateIdempotent = await api.post("/api/customers?idempotent=true", {
      data: createPayload,
    });
    expect(duplicateIdempotent.status()).toBe(200);
    const idemBody = await duplicateIdempotent.json();
    expect(idemBody?.id).toBe(firstBody?.id);
  });

  test("should reject invoice payment without authentication", async ({ request }) => {
    const res = await request.post("/api/invoices/non-existent-id/pay", {
      data: { amount: 100, paymentMethod: "BANK_TRANSFER" },
    });
    expect([401, 403]).toContain(res.status());
  });

  test("should validate and scope invoice payment endpoint for authenticated users", async ({ page }) => {
    const api = page.request;
    const negativePayment = await api.post("/api/invoices/00000000-0000-0000-0000-000000000000/pay", {
      data: {
        amount: -100,
        paymentMethod: "BANK_TRANSFER",
      },
    });
    expect(negativePayment.status()).toBe(400);

    const notFoundScoped = await api.post("/api/invoices/00000000-0000-0000-0000-000000000000/pay", {
      data: {
        amount: 100,
        paymentMethod: "BANK_TRANSFER",
      },
    });
    expect(notFoundScoped.status()).toBe(400);
  });
});
