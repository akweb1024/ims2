import { test, expect } from "@playwright/test";

const loginAsAdmin = async (page: import("@playwright/test").Page) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill("admin@stm.com");
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect
    .poll(async () => page.url(), { timeout: 30000 })
    .toMatch(/\/dashboard/);
};

const getToken = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("token"));

test.describe("CRM Invoice and Product Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load invoice product catalogue actions", async ({ page }) => {
    await page.goto("/dashboard/crm/invoice-products");

    await expect(
      page.getByRole("heading", { name: "Invoice Products" }),
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
    await expect(page.getByRole("button", { name: /Account Detail/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Products Detail/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Summary/i })).toBeVisible();
    await expect(page.getByText("Select Account")).toBeVisible();
  });

  test("should not return 500 when creating invoice with inventory-tracked product", async ({
    page,
    request,
  }) => {
    const token = await getToken(page);
    expect(token).toBeTruthy();
    const authHeaders = { Authorization: `Bearer ${token}` };

    const customersRes = await request.get("/api/customers?limit=20", {
      headers: authHeaders,
    });
    expect(customersRes.ok()).toBeTruthy();
    const customersPayload = await customersRes.json();
    let customer = customersPayload?.data?.[0];

    if (!customer?.id) {
      const customerStamp = Date.now();
      const customerRes = await request.post("/api/customers", {
        headers: authHeaders,
        data: {
          name: `Playwright Invoice Customer ${customerStamp}`,
          customerType: "INDIVIDUAL",
          primaryEmail: `pw-invoice-customer-${customerStamp}@example.com`,
          primaryPhone: "9999999999",
          billingAddress: "Automation Street",
          billingCity: "Noida",
          billingState: "Uttar Pradesh",
          billingPincode: "201301",
          billingCountry: "India",
        },
      });
      expect(customerRes.ok()).toBeTruthy();
      customer = await customerRes.json();
    }
    expect(customer?.id).toBeTruthy();

    const uniqueSuffix = Date.now();
    const sku = `PW-AUTO-${uniqueSuffix}`;
    const productRes = await request.post("/api/invoice-products", {
      headers: authHeaders,
      data: {
        name: `Playwright Inventory Product ${uniqueSuffix}`,
        type: "SIMPLE",
        category: "MISC",
        pricingModel: "FIXED",
        priceINR: 3800,
        priceUSD: 50,
        taxRate: 18,
        sku,
        productAttributes: {
          inventorySettings: {
            isPhysicalDeliverable: true,
            trackInventory: true,
          },
        },
      },
    });
    expect(productRes.ok()).toBeTruthy();
    const createdProduct = await productRes.json();
    expect(createdProduct?.id).toBeTruthy();

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);
    const dueDateIso = dueDate.toISOString().split("T")[0];

    const invoiceRes = await request.post("/api/invoices", {
      headers: authHeaders,
      data: {
        customerProfileId: customer.id,
        dueDate: dueDateIso,
        description: "",
        lineItems: [
          {
            id: uniqueSuffix,
            description: `${createdProduct.name} (${sku})`,
            hsnCode: "2843",
            quantity: 1,
            price: 3800,
            productId: createdProduct.id,
            variantId: null,
            taxCategory: "STANDARD",
            productCategory: "MISC",
            productTags: [],
            productAttributes: {
              inventorySettings: {
                isPhysicalDeliverable: true,
                trackInventory: true,
              },
            },
          },
        ],
        taxRate: 18,
        amount: 3800,
        tax: 684,
        total: 4484,
        currency: "INR",
      },
    });

    // Regression assertion: inventory validation can fail, but must not be a 500.
    expect(invoiceRes.status(), `Unexpected 500: ${await invoiceRes.text()}`).not.toBe(500);
    expect([201, 400]).toContain(invoiceRes.status());
  });

});
