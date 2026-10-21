import { chromium, type BrowserContext, type Locator, type Page } from "@playwright/test";
import sharp from "sharp";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://osi-cms.vercel.app";
const OUTPUT_DIR = path.resolve("docs/handbook/screenshots");
const DRAFT_TITLE = "PRUEBA CODEX handbook";
const DRAFT_SLUG = "prueba-codex-handbook";
const GOLD = "#E2902A";
const PUBLIC_ONLY = process.argv.includes("--public-only");

type Highlight = { locator: Locator; number?: number };

const captured: string[] = [];
const skipped: string[] = [];
const created: string[] = [];
const mismatches: string[] = [];

function requiredEnv(name: "OSI_QA_EMAIL" | "OSI_QA_PASSWORD"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required. Export it in the shell; the script will not read differently named accounts.`);
  return value;
}

async function newContext(mobile = false): Promise<BrowserContext> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    locale: "en-US",
    timezoneId: "America/Chicago",
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  context.on("page", (page) => page.on("dialog", (dialog) => dialog.accept()));
  return context;
}

async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
      body { cursor: none !important; }
      [data-handbook-private] { filter: blur(9px) !important; user-select: none !important; }
    `,
  });
  await page.waitForTimeout(150);
}

async function clearOverlays(page: Page) {
  await page.locator("[data-handbook-overlay]").evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
}

async function maskCommonPrivateData(page: Page) {
  await page.evaluate(() => {
    const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
    const phone = /(?:\+?\d[\d\s().-]{7,}\d)/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parents = new Set<HTMLElement>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? "";
      if (email.test(text) || phone.test(text)) {
        const parent = node.parentElement;
        if (parent && !parent.closest("script,style")) parents.add(parent);
      }
    }
    for (const parent of parents) parent.dataset.handbookPrivate = "true";
    for (const input of document.querySelectorAll<HTMLInputElement>("input")) {
      if (email.test(input.value) || phone.test(input.value)) input.dataset.handbookPrivate = "true";
    }
  });
}

async function maskSensitiveRows(page: Page, kind: "dashboard" | "subscribers" | "submissions" | "users" | "audit" | "directory") {
  const selectors: Record<typeof kind, string[]> = {
    dashboard: ["table tbody td:last-child", "[aria-label='Recent activity'] li"],
    subscribers: ["table tbody td:first-child", "table tbody td:nth-child(4)"],
    submissions: ["table tbody td:first-child", "table tbody td:nth-child(2)", "table tbody td:nth-child(3)"],
    users: ["table tbody td:first-child", "table tbody td:nth-child(2)"],
    audit: ["table tbody td:first-child", "table tbody td:nth-child(4)", "table tbody td:nth-child(5)"],
    directory: ["table tbody td"],
  };
  for (const selector of selectors[kind]) {
    await page.locator(selector).evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLElement).dataset.handbookPrivate = "true";
    });
  }
}

async function maskSelectors(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    await page.locator(selector).evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLElement).dataset.handbookPrivate = "true";
    });
  }
}

async function annotate(page: Page, highlights: Highlight[]) {
  await clearOverlays(page);
  let nextNumber = 1;
  for (const item of highlights) {
    const locator = item.locator.first();
    if (!(await locator.isVisible().catch(() => false))) continue;
    const box = await locator.boundingBox();
    if (!box) continue;
    const number = item.number ?? (highlights.length > 1 ? nextNumber++ : undefined);
    await page.evaluate(
      ({ box, number, gold }) => {
        const outline = document.createElement("div");
        outline.dataset.handbookOverlay = "true";
        Object.assign(outline.style, {
          position: "absolute",
          left: `${box.x - 4 + window.scrollX}px`,
          top: `${box.y - 4 + window.scrollY}px`,
          width: `${box.width + 8}px`,
          height: `${box.height + 8}px`,
          border: `3px solid ${gold}`,
          borderRadius: "8px",
          boxSizing: "border-box",
          pointerEvents: "none",
          zIndex: "2147483646",
        });
        document.body.append(outline);
        if (number) {
          const marker = document.createElement("div");
          marker.dataset.handbookOverlay = "true";
          marker.textContent = String.fromCodePoint(0x2460 + number - 1);
          Object.assign(marker.style, {
            position: "absolute",
            left: `${box.x - 15 + window.scrollX}px`,
            top: `${box.y - 17 + window.scrollY}px`,
            width: "28px",
            height: "28px",
            display: "grid",
            placeItems: "center",
            borderRadius: "999px",
            color: "#172A3A",
            background: gold,
            border: "2px solid white",
            font: "700 18px/1 Arial, sans-serif",
            boxShadow: "0 2px 7px rgb(0 0 0 / 28%)",
            pointerEvents: "none",
            zIndex: "2147483647",
          });
          document.body.append(marker);
        }
      },
      { box, number, gold: GOLD },
    );
  }
}

async function optimizePng(raw: string, output: string) {
  await sharp(raw).png({ compressionLevel: 9, palette: true, quality: 82, colours: 128, effort: 10 }).toFile(output);
  for (const [quality, colours] of [[72, 64], [60, 32], [45, 16]] as const) {
    if ((await stat(output)).size <= 400_000) break;
    const retry = `${output}.retry.png`;
    await sharp(raw).png({ compressionLevel: 9, palette: true, quality, colours, effort: 10 }).toFile(retry);
    await rename(retry, output);
  }
  if ((await stat(output)).size > 400_000) {
    throw new Error(`${path.basename(output)} is still over 400 KB after PNG optimization`);
  }
  await unlink(raw).catch(() => undefined);
}

async function capture(page: Page, filename: string, focus: Locator, highlights: Highlight[] = []) {
  await settle(page);
  await maskCommonPrivateData(page);
  const target = focus.first();
  if (!(await target.isVisible().catch(() => false))) throw new Error(`Capture target is not visible for ${filename}`);
  await target.scrollIntoViewIfNeeded();
  await annotate(page, highlights);
  const viewport = page.viewportSize();
  const box = await target.boundingBox();
  if (!viewport || !box) throw new Error(`Could not measure capture target for ${filename}`);
  const padding = 20;
  const clip = {
    x: Math.max(0, Math.min(box.x - padding, viewport.width - 100)),
    y: Math.max(0, box.y - padding),
    width: Math.min(viewport.width, Math.max(100, Math.min(box.width + padding * 2, viewport.width - Math.max(0, box.x - padding)))),
    height: Math.min(780, Math.max(120, Math.min(box.height + padding * 2, viewport.height - Math.max(0, box.y - padding)))),
  };
  const output = path.join(OUTPUT_DIR, filename);
  const raw = `${output}.raw.png`;
  await page.screenshot({ path: raw, type: "png", clip });
  await optimizePng(raw, output);
  captured.push(filename);
  await clearOverlays(page);
}

function main(page: Page) {
  return page.locator("#admin-main-content");
}

async function go(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await settle(page);
}

async function login(page: Page) {
  const email = requiredEnv("OSI_QA_EMAIL");
  const password = requiredEnv("OSI_QA_PASSWORD");
  await go(page, "/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === "/admin", { timeout: 20_000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await settle(page);
}

async function firstDetailHref(page: Page, routePrefix: string, rowText?: RegExp): Promise<string | null> {
  const rows = page.locator("table tbody tr");
  for (let i = 0; i < (await rows.count()); i += 1) {
    const row = rows.nth(i);
    if (rowText && !rowText.test((await row.innerText()).trim())) continue;
    const href = await row.locator(`a[href^="${routePrefix}/"]`).first().getAttribute("href").catch(() => null);
    if (href && !href.endsWith("/new")) return href;
  }
  return null;
}

async function ensureHandbookDraft(page: Page): Promise<string> {
  await go(page, "/admin/pages");
  const search = page.getByPlaceholder("Search pages…");
  await search.fill(DRAFT_TITLE);
  await page.waitForTimeout(450);
  const existing = page.getByRole("link", { name: DRAFT_TITLE, exact: true });
  if (await existing.isVisible().catch(() => false)) return (await existing.getAttribute("href"))!;

  await go(page, "/admin/pages/new");
  await page.getByLabel("Title").fill(DRAFT_TITLE);
  await page.getByLabel("Slug").fill(DRAFT_SLUG);
  await page.getByLabel("Starting point").selectOption("standard");
  await page.getByRole("button", { name: "Create page" }).click();
  await page.getByRole("heading", { name: DRAFT_TITLE, exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  created.push(`draft page: ${DRAFT_TITLE} (/${DRAFT_SLUG})`);
  const currentPath = new URL(page.url()).pathname;
  if (/\/admin\/pages\/[^/]+$/.test(currentPath) && !currentPath.endsWith("/new")) return currentPath;

  // The editor can replace the New screen in place without changing the URL.
  // Resolve the saved record from the list so later captures use its stable id.
  await go(page, "/admin/pages");
  await page.getByPlaceholder("Search pages…").fill(DRAFT_TITLE);
  await page.waitForTimeout(450);
  const href = await page.getByRole("link", { name: DRAFT_TITLE, exact: true }).getAttribute("href");
  if (!href) throw new Error(`Created ${DRAFT_TITLE}, but could not resolve its saved page URL`);
  return href;
}

async function addBlock(page: Page, name: string) {
  const search = page.getByPlaceholder("Search blocks by name or purpose…");
  await search.fill(name);
  const card = page.getByRole("button", { name: new RegExp(`^${name}\\b`, "i") }).last();
  await card.click();
  await page.waitForTimeout(100);
}

async function ensureBlock(page: Page, name: string) {
  const existing = page.getByRole("button", { name: new RegExp(`Block \\d+ · ${name}`, "i") });
  if ((await existing.count()) === 0) await addBlock(page, name);
}

async function openLatestBlock(page: Page, name: string) {
  const toggle = page.getByRole("button", { name: new RegExp(`Block \\d+ · ${name}`, "i") }).last();
  await toggle.click();
  return toggle;
}

async function genericListShot(page: Page, route: string, filename: string, actionName?: RegExp) {
  await go(page, route);
  const highlights: Highlight[] = [];
  if (actionName) highlights.push({ locator: page.getByRole("link", { name: actionName }).or(page.getByRole("button", { name: actionName })) });
  const search = page.locator('input[type="search"], input[placeholder^="Search"]').first();
  if (await search.isVisible().catch(() => false)) highlights.push({ locator: search });
  await capture(page, filename, main(page), highlights);
}

async function captureFirstEditor(
  page: Page,
  listRoute: string,
  routePrefix: string,
  filename: string,
  fallbackNew: string | null,
  highlights: RegExp[],
) {
  await go(page, listRoute);
  const href = (await firstDetailHref(page, routePrefix)) ?? fallbackNew;
  if (!href) {
    skipped.push(`${filename}: no existing record and no safe non-mutating New screen`);
    return;
  }
  await go(page, href);
  if (filename === "forms-02-editor.png") {
    await maskSelectors(page, ["main h1", 'main input[name="name"]', 'main input[name="notification_email"]']);
  }
  if (filename === "news-02-editor.png") {
    const attributions = page.locator('main [contenteditable="true"] p').filter({ hasText: /CEO of OSI/i });
    await attributions.evaluateAll((nodes) => {
      for (const node of nodes) (node as HTMLElement).dataset.handbookPrivate = "true";
    });
  }
  const marks = highlights.map((name) => ({ locator: page.getByText(name).first() }));
  await capture(page, filename, main(page), marks);
}

async function publicShots(page: Page) {
  await go(page, "/admin/login");
  await capture(page, "signing-in-01-login.png", page.locator("form"), [
    { locator: page.getByLabel("Email"), number: 1 },
    { locator: page.getByLabel("Password"), number: 2 },
    { locator: page.getByRole("button", { name: "Sign in" }), number: 3 },
  ]);
}

async function mobilePublicShot() {
  const context = await newContext(true);
  const page = await context.newPage();
  try {
    await go(page, "/");
    const menu = page.getByRole("button", { name: /menu/i }).first();
    if (await menu.isVisible().catch(() => false)) await menu.click();
    const dialog = page.getByRole("dialog").first();
    await capture(page, "branding-03-forge-mobile-menu.png", (await dialog.isVisible().catch(() => false)) ? dialog : page.locator("body"), [
      { locator: menu, number: 1 },
      { locator: dialog, number: 2 },
    ]);
  } finally {
    await context.browser()?.close();
  }
}

async function mobileAdminShots(draftHref: string) {
  const context = await newContext(true);
  const page = await context.newPage();
  try {
    await login(page);
    await page.getByRole("button", { name: "Open menu" }).click();
    await capture(page, "dashboard-02-mobile-menu.png", page.getByRole("dialog", { name: "OSI Content" }), [
      { locator: page.getByRole("button", { name: "Close menu" }), number: 1 },
      { locator: page.getByRole("navigation", { name: "Admin navigation" }), number: 2 },
    ]);
    await go(page, draftHref);
    await capture(page, "editing-a-page-05-mobile-editor.png", main(page), [
      { locator: page.getByText(/Saved|Unsaved changes|Saving/).first() },
      { locator: page.getByPlaceholder("Search blocks by name or purpose…") },
    ]);
  } finally {
    await context.browser()?.close();
  }
}

async function authenticatedShots(page: Page) {
  await login(page);

  await maskSensitiveRows(page, "dashboard");
  await capture(page, "dashboard-01-overview.png", main(page), [
    { locator: page.locator("aside.admin-sidebar") },
    { locator: page.locator("#admin-main-content").locator("section, article").first() },
  ]);

  await genericListShot(page, "/admin/pages", "creating-a-page-01-pages-list.png", /New page/i);
  await go(page, "/admin/pages/new");
  await capture(page, "creating-a-page-02-new-page.png", main(page), [
    { locator: page.getByLabel("Title"), number: 1 },
    { locator: page.getByLabel("Slug"), number: 2 },
    { locator: page.getByLabel("Starting point"), number: 3 },
  ]);

  const draftHref = await ensureHandbookDraft(page);
  await go(page, draftHref);
  await capture(page, "editing-a-page-01-editor-actions.png", page.locator(".admin-page-header"), [
    { locator: page.getByRole("button", { name: "Save draft" }), number: 1 },
    { locator: page.getByRole("link", { name: "Preview" }), number: 2 },
    { locator: page.getByRole("button", { name: "Publish" }), number: 3 },
  ]);

  await go(page, draftHref);
  await ensureBlock(page, "Rich text");
  const richToggle = page.getByRole("button", { name: /Block \d+ · Rich text/i }).last();
  const richRow = richToggle.locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
  await capture(page, "editing-a-page-02-block-controls.png", richRow, [
    { locator: page.getByRole("button", { name: /Drag to reorder Rich text/i }) },
    { locator: richRow.getByRole("button", { name: "Hide" }) },
    { locator: richRow.getByRole("button", { name: "Duplicate" }) },
    { locator: richRow.getByRole("button", { name: "Remove" }) },
  ]);

  await go(page, draftHref);
  const paletteSearch = page.getByPlaceholder("Search blocks by name or purpose…");
  await paletteSearch.fill("gallery");
  await capture(page, "editing-a-page-03-add-block.png", paletteSearch.locator("xpath=ancestor::div[contains(@class,'rounded')][1]"), [
    { locator: paletteSearch, number: 1 },
    { locator: page.getByRole("button", { name: /^Image gallery\b/i }), number: 2 },
  ]);

  await go(page, "/admin/pages");
  const publishedPage = await firstDetailHref(page, "/admin/pages", /published/i);
  if (publishedPage) {
    await go(page, publishedPage);
    await capture(page, "editing-a-page-04-version-history.png", main(page), [
      { locator: page.getByText(/Version history/i).first() },
      { locator: page.getByRole("button", { name: "Unpublish" }) },
    ]);
  } else skipped.push("editing-a-page-04-version-history.png: no published page was listed");

  await go(page, draftHref);
  await ensureBlock(page, "Rich text");
  await openLatestBlock(page, "Rich text");
  const toolbar = page.locator('[role="toolbar"]').last();
  await capture(page, "writing-formatted-text-01-toolbar.png", toolbar.locator("xpath=.."), [
    { locator: toolbar.getByRole("button").nth(0) },
    { locator: toolbar.getByRole("button").nth(2) },
    { locator: toolbar.getByRole("button").nth(4) },
    { locator: toolbar.getByRole("button").last() },
  ]);

  await go(page, draftHref);
  await ensureBlock(page, "Image");
  await openLatestBlock(page, "Image");
  const chooseImage = page.getByRole("button", { name: "Choose Image" }).last();
  await chooseImage.click();
  const mediaDialog = page.getByRole("dialog", { name: "Media library" });
  await mediaDialog.waitFor({ state: "visible" });
  await capture(page, "choosing-images-01-picker.png", mediaDialog, [
    { locator: mediaDialog.getByPlaceholder(/Search by title/i), number: 1 },
    { locator: mediaDialog.locator("button[title]").first(), number: 2 },
  ]);

  await go(page, "/admin/media");
  await capture(page, "choosing-images-02-upload.png", main(page), [
    { locator: page.locator('input[type="file"]').first(), number: 1 },
    { locator: page.getByText(/Alt text/i).first(), number: 2 },
    { locator: page.getByRole("button", { name: /Upload/i }).first(), number: 3 },
  ]);

  await go(page, draftHref);
  await ensureBlock(page, "AR model");
  await openLatestBlock(page, "AR model");
  const arFields = page.locator("[data-block-fields]").last();
  await capture(page, "ar-model-01-fields.png", arFields, [
    { locator: arFields.getByText("3D model (.glb)", { exact: true }), number: 1 },
    { locator: arFields.getByText("iOS AR model (.usdz)", { exact: true }), number: 2 },
  ]);

  await genericListShot(page, "/admin/shared-sections", "shared-sections-01-list.png", /New shared section/i);
  await captureFirstEditor(page, "/admin/shared-sections", "/admin/shared-sections", "shared-sections-02-editor.png", "/admin/shared-sections/new", [/Key/i, /Save draft|Create/i, /Publish/i]);
  await go(page, "/admin/forms");
  await maskSelectors(page, ["main tbody td:first-child"]);
  await capture(page, "forms-01-list.png", main(page), [{ locator: page.getByRole("link", { name: /New form/i }) }]);
  await captureFirstEditor(page, "/admin/forms", "/admin/forms", "forms-02-editor.png", "/admin/forms/new", [/Form key/i, /Add field/i, /Status/i]);

  await genericListShot(page, "/admin/products", "products-01-list.png", /New product/i);
  await go(page, "/admin/products");
  const productHref = await firstDetailHref(page, "/admin/products");
  if (productHref) {
    await go(page, productHref);
    await capture(page, "products-02-editor.png", main(page), [
      { locator: page.getByText("Benefits", { exact: true }).first() },
      { locator: page.getByText("Stages", { exact: true }).first() },
      { locator: page.getByText(/Extra content blocks/i).first() },
    ]);
    const preview = page.getByRole("link", { name: "Preview", exact: true });
    if (await preview.isVisible().catch(() => false)) {
      await capture(page, "products-03-preview.png", page.locator(".admin-page-header, form").first(), [{ locator: preview }]);
    } else skipped.push("products-03-preview.png: the first product had no enabled Preview link");
  } else skipped.push("products-02-editor.png/products-03-preview.png: no product exists");

  await go(page, "/admin/products");
  let categoryWarningFound = false;
  const productLinks = await page.locator('table tbody a[href^="/admin/products/"]').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).getAttribute("href")).filter(Boolean) as string[]);
  for (const href of productLinks.slice(0, 12)) {
    await go(page, href);
    const warning = page.getByText("Preview needs a category", { exact: true });
    if (await warning.isVisible().catch(() => false)) {
      await capture(page, "products-04-preview-needs-category.png", page.locator(".admin-page-header, form").first(), [{ locator: warning }]);
      categoryWarningFound = true;
      break;
    }
  }
  if (!categoryWarningFound) skipped.push("products-04-preview-needs-category.png: no existing uncategorized product was visible");

  await genericListShot(page, "/admin/news", "news-01-list.png", /New News/i);
  await captureFirstEditor(page, "/admin/news", "/admin/news", "news-02-editor.png", "/admin/news/new", [/Kind/i, /Author/i, /Reading time/i]);
  await genericListShot(page, "/admin/industries", "taxonomy-01-industries-applications.png", /New Industry/i);
  await genericListShot(page, "/admin/resources", "resources-01-list.png", /New Resource/i);
  await captureFirstEditor(page, "/admin/resources", "/admin/resources", "resources-02-editor.png", "/admin/resources/new", [/File/i, /Status/i]);
  await genericListShot(page, "/admin/locations", "locations-01-list.png", /New Location/i);
  await go(page, "/admin/directory");
  await maskSensitiveRows(page, "directory");
  await capture(page, "directory-01-list.png", main(page), [{ locator: page.getByRole("link", { name: /New Directory/i }).or(page.getByRole("link", { name: /New/i })).first() }]);

  await go(page, "/admin/newsletter/subscribers");
  await maskSensitiveRows(page, "subscribers");
  await capture(page, "newsletter-subscribers-01-list.png", main(page), [
    { locator: page.getByRole("button", { name: /Add subscriber/i }) },
    { locator: page.getByText("Tags", { exact: true }).first() },
    { locator: page.getByRole("button", { name: /Export CSV/i }) },
  ]);

  await go(page, "/admin/newsletter/campaigns");
  await capture(page, "newsletter-campaigns-01-list.png", main(page), [{ locator: page.getByRole("button", { name: "New campaign" }) }]);
  const campaignHref = await firstDetailHref(page, "/admin/newsletter/campaigns", /draft/i);
  if (campaignHref) {
    await go(page, campaignHref);
    await capture(page, "newsletter-campaigns-02-editor.png", main(page), [
      { locator: page.getByRole("button", { name: "Preview" }) },
      { locator: page.getByRole("button", { name: "Send test" }) },
      { locator: page.getByRole("button", { name: "Save draft" }) },
    ]);
  } else skipped.push("newsletter-campaigns-02-editor.png: no existing draft campaign; none was created");

  await go(page, "/admin/navigation");
  await capture(page, "navigation-01-editor.png", main(page), [
    { locator: page.getByRole("link", { name: "mega", exact: true }), number: 1 },
    { locator: page.getByRole("link", { name: "utility", exact: true }), number: 2 },
    { locator: page.getByRole("button", { name: "+ Child", exact: true }).first(), number: 3 },
  ]);

  await go(page, "/admin/media");
  await capture(page, "media-library-01-library.png", main(page), [
    { locator: page.getByText("Images", { exact: true }).first(), number: 1 },
    { locator: page.getByPlaceholder(/Search by title/i), number: 2 },
    { locator: page.getByRole("button", { name: "Edit" }).first() },
  ]);

  await go(page, "/admin/branding");
  await capture(page, "branding-01-workflow.png", main(page), [
    { locator: page.getByRole("button", { name: "Save draft" }) },
    { locator: page.getByRole("button", { name: "Publish" }) },
    { locator: page.getByRole("group", { name: "Preview controls" }) },
  ]);
  const siteLayout = page.getByText("Site layout", { exact: true }).first();
  await siteLayout.scrollIntoViewIfNeeded();
  await capture(page, "branding-02-site-layout.png", siteLayout.locator("xpath=ancestor::section[1]"), [
    { locator: siteLayout },
    { locator: page.getByText("Forge", { exact: true }).first() },
  ]);

  await go(page, "/admin/submissions");
  await maskSensitiveRows(page, "submissions");
  await capture(page, "submissions-01-inbox.png", main(page), [
    { locator: page.getByRole("button", { name: /Export CSV/i }) },
    { locator: page.locator("select").first() },
  ]);
  await go(page, "/admin/analytics");
  await capture(page, "analytics-01-overview.png", main(page), [
    { locator: page.locator("select").first() },
    { locator: page.locator("section, article").first() },
  ]);
  await go(page, "/admin/analytics/behavior");
  await capture(page, "analytics-02-categories.png", main(page), [
    { locator: page.getByRole("button", { name: /star/i }).first() },
    { locator: page.locator("aside.admin-sidebar").getByText("Analytics", { exact: true }) },
  ]);
  await go(page, "/admin/settings");
  const announcement = page.getByRole("group", { name: "Announcement bar" });
  await capture(page, "settings-01-form.png", announcement, [
    { locator: page.getByRole("checkbox", { name: "Show announcement bar" }), number: 1 },
    { locator: page.getByRole("textbox", { name: "Message" }), number: 2 },
    { locator: page.getByRole("textbox", { name: "Link URL (optional)" }), number: 3 },
  ]);
  await go(page, "/admin/redirects");
  await capture(page, "redirects-01-list.png", main(page), [
    { locator: page.getByRole("columnheader", { name: "Goes to" }) },
    { locator: page.getByRole("link", { name: /New Redirect/i }) },
  ]);
  await go(page, "/admin/users");
  await maskSensitiveRows(page, "users");
  await capture(page, "users-01-list.png", main(page), [
    { locator: page.getByRole("button", { name: /Invite/i }).first() },
    { locator: page.getByText(/Role/i).first() },
  ]);
  await go(page, "/admin/audit-log");
  await maskSensitiveRows(page, "audit");
  const auditFilters = (await page.locator("select, input[type='date']").all())
    .slice(0, 4)
    .map((locator) => ({ locator }));
  await capture(page, "audit-log-01-list.png", main(page), auditFilters);

  await go(page, draftHref);
  await ensureBlock(page, "Columns");
  await page.getByRole("button", { name: "Save draft" }).click();
  const alert = page.getByRole("alertdialog");
  await alert.waitFor({ state: "visible", timeout: 10_000 });
  await capture(page, "save-error-01-alert-dialog.png", alert, [
    { locator: alert.getByText(/column|block|fix/i).first() },
    { locator: alert.getByRole("button", { name: "Go to block" }) },
  ]);

  await mobileAdminShots(draftHref);
}

async function mainRun() {
  if (!PUBLIC_ONLY) {
    requiredEnv("OSI_QA_EMAIL");
    requiredEnv("OSI_QA_PASSWORD");
  }
  await mkdir(OUTPUT_DIR, { recursive: true });
  const context = await newContext();
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept());
  try {
    await publicShots(page);
    await mobilePublicShot();
    if (!PUBLIC_ONLY) await authenticatedShots(page);
  } finally {
    await context.browser()?.close();
  }

  console.log(JSON.stringify({
    baseUrl: BASE_URL,
    images: captured.length,
    captured,
    created,
    skipped,
    mismatches,
    mode: PUBLIC_ONLY ? "public-only" : "full",
  }, null, 2));
  if (!PUBLIC_ONLY && skipped.length > 0) process.exitCode = 2;
}

mainRun().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
