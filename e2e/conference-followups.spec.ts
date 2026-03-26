import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

test.describe.configure({ timeout: 90000 });

const loginAsAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByPlaceholder("you@example.com or EMP-001").fill("admin@stm.com");
  await page.getByPlaceholder("••••••••").fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect
    .poll(async () => page.url(), { timeout: 30000 })
    .toMatch(/\/dashboard/);
};

const getToken = async (page: Page) =>
  page.evaluate(() => localStorage.getItem("token"));

const seedConferenceWorkspace = async (
  request: APIRequestContext,
  token: string,
  options: { withRegistration?: boolean } = {},
) => {
  const { withRegistration = true } = options;
  const stamp = Date.now();

  const conferenceRes = await request.post("/api/conferences", {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title: `Automation Conference ${stamp}`,
      description: "Automated conference used for follow-up smoke testing.",
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
      venue: "Test Venue",
      organizer: "QA Automation",
      mode: "HYBRID",
      registrationFee: 1200,
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  });
  expect(conferenceRes.ok()).toBeTruthy();
  const conference = await conferenceRes.json();

  if (!withRegistration) {
    return { conference };
  }

  const ticketRes = await request.post(
    `/api/conferences/${conference.id}/tickets`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: "Automation Ticket",
        price: 1200,
        currency: "INR",
        limit: 25,
      },
    },
  );
  expect(ticketRes.ok()).toBeTruthy();
  const ticket = await ticketRes.json();

  const registrationRes = await request.post(
    `/api/conferences/${conference.id}/registrations`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        name: `Automation Registrant ${stamp}`,
        email: `conference.${stamp}@example.com`,
        organization: "QA Team",
        phone: "9999999999",
        ticketTypeId: ticket.id,
      },
    },
  );
  expect(registrationRes.ok()).toBeTruthy();
  const registration = await registrationRes.json();

  return { conference, ticket, registration };
};

test.describe("Conference Follow-up Flows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should load the conference follow-up matrix page", async ({ page }) => {
    await page.goto("/dashboard/conferences/followups");
    await expect(page.getByRole("heading", { name: "Conference Follow-ups" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText("Overdue Horizon");
    await expect(page.locator("body")).toContainText("Today Queue");
    await expect(page.locator("body")).toContainText("Upcoming Flow");
  });

  test("should add a conference-level remark from the conference workspace", async ({
    page,
    request,
  }) => {
    const token = await getToken(page);
    expect(token).toBeTruthy();
    const { conference } = await seedConferenceWorkspace(request, token!, {
      withRegistration: false,
    });

    await page.goto(`/dashboard/conferences/${conference.id}`);
    await expect(page.getByRole("heading", { name: conference.title })).toBeVisible({
      timeout: 30000,
    });

    await expect(page.getByRole("button", { name: "Add Conference Remark" }).nth(1)).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole("button", { name: "Add Conference Remark" }).nth(1).click();
    await expect(
      page.getByRole("heading", { name: "Add Conference Follow-up" }),
    ).toBeVisible({ timeout: 30000 });

    const subject = `Automation conference remark ${Date.now()}`;
    await page.getByPlaceholder("Conference planning or outreach update").fill(subject);
    await page.getByPlaceholder("Write the conference-level follow-up here...").fill(
      "Conference-level follow-up remark added by automated smoke coverage.",
    );
    await page.getByRole("combobox").nth(1).selectOption("INTERNAL");
    await page.getByRole("combobox").nth(2).selectOption("FOLLOW_UP_REQUIRED");
    await page.getByLabel(/Requested pricing\/quote/).check();

    const saveConferenceButton = page.getByRole("button", { name: "Save Conference Follow-up" });
    await saveConferenceButton.scrollIntoViewIfNeeded();
    await saveConferenceButton.click({ force: true });
    await expect(page.locator("body")).toContainText(subject, { timeout: 60000 });
  });

  test("should add a registration follow-up from the registrations workspace", async ({
    page,
    request,
  }) => {
    const token = await getToken(page);
    expect(token).toBeTruthy();
    const { conference, registration } = await seedConferenceWorkspace(request, token!);

    await page.goto(`/dashboard/conferences/${conference.id}/registrations`);
    await expect(page.getByRole("heading", { name: "Registration Follow-ups" })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("body")).toContainText(registration.email, {
      timeout: 30000,
    });

    const row = page.getByRole("row").filter({ hasText: registration.email });
    await row.getByRole("button", { name: "Follow-up" }).click();

    await expect(page.getByRole("heading", { name: "Conference Follow-up" })).toBeVisible({
      timeout: 30000,
    });

    const subject = `Automation registrant follow-up ${Date.now()}`;
    await page.getByPlaceholder("Conference follow-up discussion").fill(subject);
    await page.getByPlaceholder("Write the follow-up remark here...").fill(
      "Registrant follow-up remark added by automated smoke coverage.",
    );
    await page.getByRole("combobox").nth(0).selectOption("PHONE");
    await page.getByRole("combobox").nth(1).selectOption("FOLLOW_UP_REQUIRED");
    await page.getByLabel(/Scheduled follow-up meeting/).check();

    const saveFollowupButton = page.getByRole("button", { name: "Save Follow-up" });
    await saveFollowupButton.scrollIntoViewIfNeeded();
    await saveFollowupButton.click({ force: true });
    await expect(page.locator("body")).toContainText(subject, { timeout: 60000 });
  });
});
