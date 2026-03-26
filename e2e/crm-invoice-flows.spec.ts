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

test.describe("CRM Invoice and Product Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load invoice product catalogue actions", async ({ page }) => {
    await page.goto("/dashboard/crm/invoice-products");

    await expect(
      page.getByRole("heading", { name: "Invoice Product Catalogue" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Add Product/i })).toBeVisible();
    await expect(page.getByTitle("Download CSV Template")).toBeVisible();
    await expect(page.getByTitle("Import CSV")).toBeVisible();
    await expect(page.getByTitle("Export list to CSV")).toBeVisible();
  });

  test("should show searchable predefined domains on add product page", async ({
    page,
  }) => {
    await page.goto("/dashboard/crm/invoice-products/new");

    await expect(page.getByRole("heading", { name: "Add Product" })).toBeVisible();

    const domainInput = page.getByPlaceholder(
      "e.g. Physics, Chemistry, Medical Sciences...",
    );
    await domainInput.click();
    await domainInput.fill("Phys");

    await expect(page.getByRole("button", { name: "Physics and Applied Mechanics" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Applied Sciences" })).not.toBeVisible();
  });

  test("should download the invoice product CSV template", async ({ page }) => {
    await page.goto("/dashboard/crm/invoice-products");

    const downloadPromise = page.waitForEvent("download");
    await page.getByTitle("Download CSV Template").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("product_catalogue_template.csv");
  });

  test("should import invoice products from CSV", async ({ page }) => {
    await page.goto("/dashboard/crm/invoice-products");

    const uniqueProductName = `Automation Import Product ${Date.now()}`;
    const csvContent = [
      "name,type,category,pricingModel,priceINR,priceUSD,taxRate,hsnCode,sacCode,sku,domain",
      `"${uniqueProductName}",SIMPLE,COURSE,FIXED,1250,15,18,,9983,AUTO-${Date.now()},Education and Social Sciences`,
    ].join("\n");

    const dialogMessages: string[] = [];
    page.on("dialog", async (dialog) => {
      dialogMessages.push(dialog.message());
      await dialog.accept();
    });

    const importResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/invoice-products/import"),
    );

    await page.locator('input[type="file"]').setInputFiles({
      name: "invoice-products-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent, "utf8"),
    });

    const importResponse = await importResponsePromise;
    expect(importResponse.ok()).toBeTruthy();

    const payload = await importResponse.json();
    expect(payload.count).toBe(1);
    expect(
      dialogMessages.some((message) =>
        message.includes("Successfully imported 1 products."),
      ),
    ).toBeTruthy();
  });

  test("should render three-step invoice creation workspace", async ({ page }) => {
    await page.goto("/dashboard/crm/invoices/new");

    await expect(
      page.getByRole("heading", { name: "Create New Invoice" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Customer Detail/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Products Detail/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Summary/i })).toBeVisible();
    await expect(page.getByText("Select Customer")).toBeVisible();
  });
});
