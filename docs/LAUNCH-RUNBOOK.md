# Launch runbook — odessaseparator.com goes live on Tuesday 10 November 2026

Written so that someone who did not build the site can run the launch. Read
sections 1–3 once, then follow section 5 in order on the day. Every command is
meant to be pasted as written. Times are US Central (CT).

| | |
|---|---|
| **Go / no-go meeting** | Monday 9 Nov, 3:00 pm CT (checklist: section 9) |
| **Cutover** | Tuesday 10 Nov, morning (suggested 9:00 am CT, so a full working day remains to fix surprises) |
| **Rollback window** | Keep the old Wix site and its DNS records untouched for 30 days |
| **Repo / deploys** | `github.com/FelipeRamirezQuattro/osi-cms`, `main` auto-deploys to Vercel project `osi-cms` (team "jramirez-3311's projects") |
| **Database** | Supabase project `ovuhuridnalxnzwggzru` (org "Freelancer", Free plan) |

---

## 1. The things that can hurt you (read this first)

1. **Nothing is live until `main` is pushed.** The "keep the review site out of
   Google" change (W1) is committed but was **not pushed**. Until it is,
   `https://osi-cms.vercel.app/robots.txt` still says `Allow: /`
   and the review site is indexable today. Push (or ask for a push) as soon as the
   tests are green; it is safe: indexing stays off until `SITE_INDEXABLE=true`.
2. **DNS does not live where you think it does.** `odessaseparator.com` is
   *registered* at GoDaddy, but its **nameservers are Wix's** (`ns4.wixdns.net`,
   `ns5.wixdns.net`; GoDaddy's record was last updated 2 Oct 2026). Wix answers
   every DNS question for the domain, so the records you must change are in the
   **Wix** dashboard (or you must move the nameservers first — see 4.2).
   Confirm who owns the Wix account and that you can log into it **before** the
   freeze, not on launch day.
3. **Email runs on Microsoft 365 and it is wired through the same DNS zone.**
   Mail for `@odessaseparator.com` (MX, SPF, DKIM, DMARC, autodiscover) lives in
   that zone. Changing records carelessly, or moving the nameservers without
   copying every record, **stops the company's email**. Rules: only touch the
   apex `A` record(s) and the `www` record; never touch `MX`, `TXT`, `_dmarc`,
   `selector1/2._domainkey`, `autodiscover`; list them (section 3) before and
   after.
4. **Do not cancel, downgrade or disconnect the Wix plan** until the rollback
   window is over (30 days). If Wix hosts the DNS zone, cancelling it can take the
   DNS — and the email — down with it.
5. **`NEXT_PUBLIC_*` variables are baked in at build time.** Changing
   `NEXT_PUBLIC_SITE_URL` (or any variable) in Vercel does nothing until you
   **redeploy** (Deployments → the latest → ⋯ → Redeploy). After every variable
   change in this runbook, redeploy and wait for "Ready".
6. **The newsletter is switched off in production** until `NEWSLETTER_TOKEN_SECRET`
   exists (signup refuses without it), and campaigns also need
   `NEWSLETTER_MAILING_ADDRESS`. No published page carries a signup form yet.

---

## 2. How the switches work (so nobody edits code on launch day)

| Switch (Vercel → Project → Settings → Environment Variables) | Effect |
|---|---|
| `SITE_INDEXABLE=true` | Allows search engines. Honoured **only** when the request host is `odessaseparator.com` or `www.odessaseparator.com`. Any other host (the review address, previews, localhost) still gets `Disallow: /`, an empty sitemap, `X-Robots-Tag: noindex, nofollow` and a noindex meta tag, even if the variable is set there. Unset = nothing is indexable anywhere. |
| `REVIEW_HOST_REDIRECT=true` | `osi-cms.vercel.app` answers every page request with a **301** to the same path on `https://odessaseparator.com`. Only that exact host is redirected: preview deployments (`osi-cms-git-….vercel.app`, `osi-cms-<hash>….vercel.app`) are untouched and stay noindex. `robots.txt`, `sitemap.xml`, `/api/*` and static files are exempt (so newsletter one-click unsubscribe links already sent from the review address keep working). |
| `NEXT_PUBLIC_SITE_URL=https://odessaseparator.com` | Origin used for canonical tags, Open Graph URLs, JSON-LD, the sitemap and **every link inside emails**. Must be exactly the final origin: https, no trailing slash, no `www`. If indexing is on and this is something else, the server logs a warning on each `robots.txt` request. |
| `EMAIL_DRY_RUN=true` | Nothing is emailed; messages are stored in the admin-only **Email outbox**. For Preview deployments and rehearsals. **Must be unset in Production.** |

---

## 3. Snapshot of the current DNS (captured 20 Oct 2026 with `dig`)

Re-capture on the day (`T-48h` step) and compare. These are what you restore on rollback.

| Name | Type | Value (today) | TTL seen | Touch on launch? |
|---|---|---|---|---|
| `odessaseparator.com` | **A** | `216.185.152.154`, `185.230.63.107`, `185.230.63.171`, `185.230.63.186` (Wix) | 3600 | **Yes — replace** |
| `www.odessaseparator.com` | **CNAME** | `cdn3.wixdns.net` (→ `cfd.wixdns.net`) | 3600 | **Yes — replace** |
| `odessaseparator.com` | NS | `ns4.wixdns.net`, `ns5.wixdns.net` | 86400 | No (see 4.2) |
| `odessaseparator.com` | **MX** | `10 odessaseparator-com.mail.protection.outlook.com` | 3600 | **Never** |
| `odessaseparator.com` | **TXT** (SPF) | `v=spf1 include:spf.protection.outlook.com -all` | — | **Never** |
| `_dmarc.odessaseparator.com` | **TXT** | `v=DMARC1; p=reject` | — | **Never** |
| `selector1._domainkey.odessaseparator.com` | **CNAME** | `selector1-odessaseparator-com._domainkey.odsep.onmicrosoft.com` | — | **Never** |
| `selector2._domainkey.odessaseparator.com` | **CNAME** | `selector2-odessaseparator-com._domainkey.odsep.onmicrosoft.com` | — | **Never** |
| `autodiscover.odessaseparator.com` | **CNAME** | `autodiscover.outlook.com` | — | **Never** |
| anything else in the Wix zone | ? | **Export the full list from the Wix DNS page** and attach it to the go/no-go ticket. `dig` cannot list a zone; there may be records (verification TXTs, subdomains) it can't see. | | Never |

Commands to capture/compare:

```bash
for t in A MX TXT NS; do echo "== $t"; dig +short odessaseparator.com $t; done
dig +short www.odessaseparator.com CNAME
dig +short TXT _dmarc.odessaseparator.com
dig +short CNAME selector1._domainkey.odessaseparator.com selector2._domainkey.odessaseparator.com autodiscover.odessaseparator.com
```

Vercel's recommended targets for this domain (Vercel API, 20 Oct): apex **`A 76.76.21.21`**,
`www` **`CNAME cname.vercel-dns.com`**. Use whatever the project's Domains page shows on the
day if it differs.

Today the Vercel project `osi-cms` has only `osi-cms.vercel.app`; `odessaseparator.com` has not been added.

---

## 4. Decisions to settle before the freeze

### 4.1 What goes public at launch
Only **3 products** are published (Gas Release System, ESP Chem Screen, SRP Sand Lift); 49 real products
plus 3 test records are drafts, and all 105 resources are drafts. The old Wix URLs for unpublished
products 301 to their category list on `/products` (91 redirects verified, section 7). Someone at OSI
must accept that, or approve publishing more first. See `docs/PRODUCT-READINESS.md`
(30 products are "Ready" for a read-through).

### 4.2 Where to change DNS — pick one, in this order of preference
| Option | How | Risk / rollback speed |
|---|---|---|
| **A. Edit the two records inside the Wix zone** (preferred) | In Wix: Domains → odessaseparator.com → DNS records. Replace the apex `A` records with `76.76.21.21` and the `www` CNAME with `cname.vercel-dns.com`. If Wix refuses (it may lock the "default" records while the domain is connected to a Wix site), *disconnect the domain from the Wix site first* — **not** the plan, **not** the domain — then edit. | Email untouched. Rollback = put the 5 old values back: **minutes** (TTL). |
| **B. Move DNS to GoDaddy, then edit there** | Recreate **every** record from section 3 (incl. the Wix export) in GoDaddy DNS, verify with `dig @<godaddy-ns>`, then change nameservers at GoDaddy to GoDaddy's, then edit A/CNAME. | Email at risk if one record is missed. NS changes propagate in up to ~48 h; **rollback is just as slow.** |
| **C. Nameservers to Vercel** (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) | Recreate every record in Vercel DNS first. | Same risk and speed as B. Avoid. |

If you pick B or C, do the nameserver move a week earlier (by 2 Nov), keep Wix serving the site meanwhile, and only then do the cutover as in A.

### 4.3 Other open items (owner → date)
- Cookie consent for `osi_vid` (400-day visitor cookie): keep or make session-only? See `docs/DECISIONS.md` ("Analytics").
- Email sender: temporary vs OSI's own domain (section 6). OSI has not answered.
- `NEWSLETTER_MAILING_ADDRESS`: the client must supply a physical address before any campaign is sent.
- Default share image (Settings → default OG image) is empty: social links show no picture until someone uploads a 1200×630 JPG/PNG.
- 11 pages use a derived meta description; `docs/seo-fallbacks.csv` lists them for OSI to fill.

---

## 5. Step by step

Legend: **[Vercel]** dashboard, **[Wix]**/**[DNS]** wherever the zone is edited (4.2), **[Supabase]**
dashboard, **[Terminal]** repo root `OSI_CMS/` with `.env.local` present.

### T-14 days (Tue 27 Oct) — prepare
1. **[Terminal]** `git status` clean, `git log origin/main..main` shows what is unpushed. Push `main` (W1 must be live on `osi-cms.vercel.app`).
2. **[Terminal]** Confirm W1 in production:
   ```bash
   curl -s https://osi-cms.vercel.app/robots.txt          # expect: User-Agent: *  /  Disallow: /   (no Sitemap line)
   curl -sI https://osi-cms.vercel.app/ | grep -i x-robots-tag   # expect: x-robots-tag: noindex, nofollow
   ```
3. **[Vercel]** Add the missing Production variables (values from the owner; never paste them into chat/tickets):
   `NEWSLETTER_TOKEN_SECRET` (`openssl rand -base64 48`). Add **Preview** variables so preview builds work:
   the three `*SUPABASE*` ones, `IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL=https://osi-cms.vercel.app`, `EMAIL_DRY_RUN=true`.
4. **[Vercel]** *Project → Settings → Domains → Add* `odessaseparator.com` and `www.odessaseparator.com`.
   Set `odessaseparator.com` as the primary; set `www.odessaseparator.com` to **redirect to `odessaseparator.com`** (308).
   Both show "Invalid Configuration" until DNS changes — expected.
5. **[Wix]** Verify access, export the full DNS record list, save it with this runbook. Decide 4.2.
6. **[Supabase]** Authentication → URL Configuration: *add* (do not replace yet) `https://odessaseparator.com/**` to Redirect URLs.
7. **Google Search Console** (https://search.google.com/search-console): add a **Domain** property
   `odessaseparator.com`; it asks for a TXT record — add that one TXT record in the zone (it is additive and safe).
   The in-admin SEO reports read this property through a service account: add `GSC_SERVICE_ACCOUNT_EMAIL` as a user on it (Settings → Users and permissions), set
   `GSC_SITE_URL` to `sc-domain:odessaseparator.com` (Domain property) or `https://odessaseparator.com/` (URL-prefix property), then run `pnpm verify:gsc`.

### T-5 days (Thu 5 Nov) — email sender (section 6) and rehearsal
8. Do section 6 with the temporary or the OSI sender; send the three test messages.
9. **[Terminal]** Full test run on both layouts (see section 8) from a clean checkout of `main`; logs saved.
10. **[Vercel]** Sanity-redeploy Production from `main` so the exact commit to ship has run in production.

### T-48 hours (Sun 8 Nov, 9:00 am CT) — lower the TTL
11. **[DNS]** Set the TTL of the apex `A` and the `www` `CNAME` to **300 seconds** (5 min). Do not change values.
    If the panel has a minimum above 300, use the minimum and tell the go/no-go meeting: rollback will take that long.
12. **[Terminal]** Re-capture DNS (section 3 commands), compare to the table, and store the output. Confirm the TTL shows ≤ 300 after an hour (`dig odessaseparator.com A | grep -A4 ANSWER`).

### Mon 9 Nov — go / no-go
13. Run the checklist in section 9 at 3:00 pm CT. If any red item is not accepted, stop; nothing has changed for visitors yet.
14. **[Terminal] backup (do it right after the meeting, again in the morning):**
    ```bash
    pnpm backup:export          # writes backups/<timestamp>/ (~12 s); keep the folder somewhere private
    ```
    Also download the Storage bucket `media` (Supabase dashboard → Storage → media) — files are not in the export (docs/BACKUP-RESTORE.md).
15. **[Vercel]** Set `NEXT_PUBLIC_SITE_URL=https://odessaseparator.com` (Production). **Do not** set `SITE_INDEXABLE` or `REVIEW_HOST_REDIRECT` yet. **Redeploy.** The review site still serves, noindex, with canonicals pointing at the future address.

### Tue 10 Nov — cutover
16. **[Terminal]** Fresh `pnpm backup:export`. Re-capture DNS and store it (this is the rollback reference).
17. **[DNS] Change exactly two things:**
    - apex `odessaseparator.com` `A` → `76.76.21.21` (delete the four Wix addresses; keep a copy of them);
    - `www.odessaseparator.com` `CNAME` → `cname.vercel-dns.com`.
    Leave `MX`/`TXT`/`CNAME *_domainkey`/`autodiscover`/`_dmarc` alone. Re-run the section 3 `dig` block; the MX/TXT lines must be identical to before.
18. **[Vercel]** Domains page: both domains turn to "Valid Configuration" and a certificate is issued automatically (minutes).
    Meanwhile (from your laptop): `dig +short odessaseparator.com A` → `76.76.21.21`.
19. **[Terminal] Verify the live domain before enabling indexing** (section 7).
20. **[Vercel]** When section 7 is green, set in Production: `SITE_INDEXABLE=true` and `REVIEW_HOST_REDIRECT=true`. **Redeploy.**
21. **[Terminal]** Verify the switches:
    ```bash
    curl -s  https://odessaseparator.com/robots.txt            # Allow: /, Disallow: /admin, /preview, Sitemap: https://odessaseparator.com/sitemap.xml
    curl -sI https://odessaseparator.com/ | grep -i x-robots-tag   # no output
    curl -s  https://odessaseparator.com/sitemap.xml | grep -c '<loc>'   # > 0, every <loc> starts with https://odessaseparator.com
    curl -sI https://osi-cms.vercel.app/about-us | grep -iE '^(HTTP|location)'   # 301 → https://odessaseparator.com/about-us
    curl -s  https://osi-cms.vercel.app/robots.txt             # still Disallow: /
    ```
22. **[Supabase]** Authentication → URL Configuration: **Site URL** = `https://odessaseparator.com`; keep `https://osi-cms.vercel.app/**` and `http://localhost:3000/**` in Redirect URLs for now.
    Then check the email links (section 7, "Admin emails").
23. **Search Console:** open the property → Sitemaps → submit `https://odessaseparator.com/sitemap.xml`; URL Inspection → test the home page and one product → *Request indexing*.
24. Tell OSI the site is live. Watch Vercel *Logs* and the admin **Dashboard / Submissions** for the first hour.

### After launch
- **T+1 day:** Search Console → Pages: no "Blocked by robots.txt" / "noindex" on the live URLs. `pnpm verify:redirects https://odessaseparator.com` again.
- **T+7 days:** remove the Wix A/CNAME copies from the notes only if no rollback occurred; review Analytics → SEO.
- **T+30 days:** end of the rollback window. Only now: remove `https://osi-cms.vercel.app/**` from Supabase redirect URLs; decide the Wix plan (export the Wix zone first if it still hosts DNS).

---

## 6. Email sender setup (Resend) — and the DNS records it needs

**What exists today.** The code sends through Resend using `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, and notifies `CONTACT_NOTIFICATION_EMAIL`.
All three are unset in every environment. With them unset the contact form still saves submissions and shows success; the admin shows an
"Email is not configured" banner on the Dashboard and Submissions.

**Messages (all HTML + plain text, with the logo and colours from Branding, links built from `NEXT_PUBLIC_SITE_URL`, no tracking pixels):**
contact form → staff notification (Reply-To = the visitor) and a one-time receipt to the visitor; newsletter signup → "confirm your subscription"
→ after pressing the button, a welcome email; campaign test send; every campaign email and the welcome email carry `List-Unsubscribe` +
`List-Unsubscribe-Post` (RFC 8058 one-click). Admin invite and password reset are sent by **Supabase Auth**, not by this code (see below).

**Set up (works the same for the temporary sender and OSI's):**
1. Choose a **sending subdomain**, e.g. `updates.odessaseparator.com`, and a From address like
   `Odessa Separator <no-reply@updates.odessaseparator.com>`. A subdomain keeps this traffic away from the Microsoft 365 setup and protects the main domain's reputation.
2. **[Resend]** Domains → Add domain → `updates.odessaseparator.com`. Resend then shows the exact records; add them **as shown** in the DNS zone (they are all on the
   `send.updates…`/`resend._domainkey.updates…` names, so they do not collide with anything in section 3):

   | Record | Host | Purpose |
   |---|---|---|
   | `TXT` | `resend._domainkey.updates` | **DKIM** public key (long `p=…` value — copy/paste) |
   | `MX` | `send.updates` | bounce handling (Amazon SES feedback endpoint, priority 10) |
   | `TXT` | `send.updates` | **SPF** for the return-path (`v=spf1 include:amazonses.com ~all`) |
   | `TXT` | `_dmarc.updates` | optional, recommended: `v=DMARC1; p=none; rua=mailto:<an OSI mailbox>` |

   Wait for the domain to read **Verified** in Resend.
3. **Do not edit the apex SPF.** `odessaseparator.com` TXT is `v=spf1 include:spf.protection.outlook.com -all`. It is correct for staff mail and Resend does not need it.
4. **DMARC.** The apex policy is `p=reject` (strict) with no reporting address, and subdomains inherit it. Resend mail passes because its DKIM signature uses the sending
   domain (aligned). Check once: send to a Gmail address → ⋯ → *Show original* → `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`. If DMARC fails, do not weaken the apex policy; fix the DKIM record.
5. **[Vercel]** Production variables: `RESEND_API_KEY` (a key restricted to *Sending access* on that domain), `RESEND_FROM_EMAIL`, `CONTACT_NOTIFICATION_EMAIL` (an OSI mailbox),
   `NEWSLETTER_MAILING_ADDRESS`. Redeploy.
6. **Test (3 messages):** admin → Email marketing → Campaigns → any draft → *Send test*; the public Contact form once (use "PRUEBA CC" as the name); *Forgot password* for your own admin account.
   Confirm: arrives in the inbox (not spam), from the right name, logo shows, buttons point at `https://odessaseparator.com/...`.
7. **Temporary sender:** the owner of the temporary domain performs steps 1–5 with their domain; later switching to OSI's is changing three variables and redeploying — no code.
8. **Admin invites and password-reset emails (Supabase Auth).** They use Supabase's built-in mail server, which is heavily rate-limited and from a generic address.
   Recommended before launch: **[Supabase]** Authentication → SMTP Settings → enable custom SMTP using Resend (host `smtp.resend.com`, port `465`, user `resend`, password = the Resend API key,
   sender = the same no-reply address). Templates (Authentication → Email Templates) must link to
   `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (Reset Password) and `…&type=invite` (Invite user); a template that still uses `{{ .ConfirmationURL }}` will break behind mail scanners.

---

## 7. Verification on the live domain (after step 18, before step 20)

**Everything on the page is `https://odessaseparator.com`; test www too.**

```bash
# 1. Padlock / certificate, apex and www (issuer should be Let's Encrypt; "Verify return code: 0 (ok)")
for h in odessaseparator.com www.odessaseparator.com; do
  echo "== $h"; echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null | openssl x509 -noout -subject -issuer -dates
  curl -sI https://$h/ | grep -iE '^(HTTP|location|strict-transport)'
done
# www must 308 to the apex; http must go to https:
curl -sI http://odessaseparator.com/ | grep -iE '^(HTTP|location)'
# 2. All legacy redirects, no redirect following (prints OK/MISMATCH per path, exit code 1 on any problem)
pnpm verify:redirects https://odessaseparator.com --csv=/tmp/redirects-live.csv
pnpm verify:redirects https://www.odessaseparator.com --no-destination-check     # www hop: expect mismatches only because every Location is the apex
```

Expected for #2 on the apex: `91 paths … ok 91, mismatch 0, error 0` (the count is whatever is in the `redirects` table; the script prints it). In a browser also open
`https://www.odessaseparator.com/about-us` (lands on the apex) and look for the padlock without warnings.

**Functional (in a browser, once, on the live domain):**
- [ ] Home, a product page, a services page render with images; the Forge/Classic layout is the intended one (admin → Branding → Site layout).
- [ ] **Contact form** — submit with name `PRUEBA CC runbook`: success message; the row appears in admin → Submissions; staff mailbox gets the notification; the test address gets the receipt.
- [ ] **Newsletter sign-up** — only if a page carries the block (none does today). Otherwise skip and write "N/A" in the go-live log.
- [ ] **Admin emails** — admin login works; *Forgot password* sends a mail whose button goes to `https://odessaseparator.com/admin/auth/confirm?...`, pressing it opens the reset form.
- [ ] `https://odessaseparator.com/search?q=gas` returns products; `https://odessaseparator.com/this-does-not-exist` is a 404 page with the site header.
- [ ] Browser address bar after clicking through 5 pages never shows `osi-cms.vercel.app`.

---

## 8. Test evidence to attach (from the repo, before the meeting)

```bash
pnpm lint && pnpm exec tsc --noEmit && pnpm test:unit && pnpm build           # all green
# both layouts, against a production build on two ports, logs kept in files:
OSI_LAYOUT_OVERRIDE=classic EMAIL_DRY_RUN=true pnpm exec next start -p 3000 &
OSI_LAYOUT_OVERRIDE=forge   EMAIL_DRY_RUN=true pnpm exec next start -p 3100 &
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 OSI_LAYOUT_OVERRIDE=classic pnpm exec playwright test --reporter=list > e2e-classic.log 2>&1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 OSI_LAYOUT_OVERRIDE=forge   pnpm exec playwright test --reporter=list > e2e-forge.log 2>&1
lsof -ti:3000 -ti:3100 | xargs kill -9          # stop the servers (NOT `pkill -f "next start"`: the process is named next-server)
git checkout -- prototypes/osi-theme-showcase/screenshots   # the suite rewrites these images
```

Note: the e2e suite briefly **publishes and then deletes** one "PRUEBA CC" page (`admin-page-revisions.spec.ts`) and writes a few "PRUEBA CC" rows
(contact submissions, analytics) to the live database. Run it before the launch week, not during it. The email-flow specs need migration `0056_email_outbox.sql` applied and a server started with `EMAIL_DRY_RUN=true`; without the table they skip.

---

## 9. Go / no-go checklist — Monday 9 November, 3:00 pm CT

Mark each **GO**, **NO-GO** or **ACCEPTED RISK** (name + reason). Any NO-GO stops the cutover.

**Site**
- [ ] `main` is pushed; Production shows the latest commit as "Ready"; lint, tsc, unit tests, build green; e2e **classic** and **forge** logs attached with 0 failures.
- [ ] `curl https://osi-cms.vercel.app/robots.txt` → `Disallow: /` and the noindex header (W1 live).
- [ ] `pnpm verify:redirects https://osi-cms.vercel.app` → 0 mismatches.
- [ ] OSI has approved what is public at launch (4.1) in writing.
- [ ] `docs/seo-fallbacks.csv` sent to OSI; accepted that generic descriptions go live if they don't reply.
- [ ] Contact details on the Contact/Locations pages are the ones OSI wants public.

**DNS / domain**
- [ ] Who edits DNS, and where (4.2), is decided; that person has logged in and screenshots of the current records are saved.
- [ ] Full zone export from Wix saved; section 3 table matches.
- [ ] TTL on apex A and www CNAME is ≤ 300 (screenshot or `dig`).
- [ ] `odessaseparator.com` and `www.` are added to the Vercel project; www → apex redirect configured.
- [ ] Wix plan will **not** be touched for 30 days (written down).

**Email**
- [ ] Sender domain Verified in Resend; the 3 test messages passed SPF/DKIM/DMARC and reached the inbox (or the decision to launch without email is recorded: forms still save, nobody is notified — the banner explains it).
- [ ] `CONTACT_NOTIFICATION_EMAIL` is a monitored mailbox.
- [ ] Supabase Auth: redirect URL for the new domain added; custom SMTP decision made; reset email tested.
- [ ] Apex MX/SPF/DMARC/DKIM/autodiscover records untouched (compare `dig`).

**Data**
- [ ] `pnpm backup:export` run today; folder stored privately; `media` bucket downloaded.
- [ ] Admin accounts: at least two admins can log in to the production site.
- [ ] Analytics cookie decision (`osi_vid`) recorded.

**People / rollback**
- [ ] Named person on call 9:00 am–6:00 pm CT on Tuesday, with DNS + Vercel + Supabase access.
- [ ] Rollback (section 10) read aloud; the 5 old DNS values are in the notes.
- [ ] Search Console property verified.

---

## 10. Rollback — send traffic back to Wix

Use if the live site is broken in a way you can't fix in ~30 minutes, or OSI says stop.

1. **[DNS]** Restore exactly what section 3 recorded:
   - apex `odessaseparator.com` `A` → `216.185.152.154`, `185.230.63.107`, `185.230.63.171`, `185.230.63.186`
   - `www.odessaseparator.com` `CNAME` → `cdn3.wixdns.net`
   - (If you reconnected anything in Wix in step 4.2/A, reconnect the domain to the Wix site in the Wix dashboard instead — it rewrites those records itself.)
   Do not touch MX/TXT/DKIM/autodiscover — they were never changed.
2. **[Vercel]** Production variables: **unset `REVIEW_HOST_REDIRECT`** (otherwise the review address keeps 301-ing to a domain that now serves Wix) and unset `SITE_INDEXABLE`; redeploy.
   (Faster alternative: Deployments → previous deployment → ⋯ → *Instant Rollback*.)
3. **[Supabase]** Authentication → Site URL back to `https://osi-cms.vercel.app`.
4. **[Search Console]** nothing to undo; pages that were crawled stay in the index as the Wix site is back at the same URLs.
5. Verify: `dig +short odessaseparator.com A` shows the Wix addresses; `https://odessaseparator.com` shows the Wix site; `https://osi-cms.vercel.app` loads (noindex).

**How long it takes:** with TTL 300 s, most visitors are back within **5–10 minutes**; the worst case is the TTL you set (so up to the old 1 hour for resolvers that never re-queried).
Browsers that have already seen the new site may keep the HTTPS-only (HSTS) setting for odessaseparator.com; that is harmless because Wix serves HTTPS for the domain too.
If you moved nameservers (4.2 B/C), rollback is a nameserver change and takes **up to ~48 hours**, which is the reason to prefer option A.

---

## 11. Backup and recovery

Follow `docs/BACKUP-RESTORE.md`. Rehearsed on 20 Oct 2026 against a throwaway Postgres: export 11 s (45 tables, 8,217 rows, 8.7 MB), schema rebuild 5 s, restore 1 s, counts identical.
Known gaps (it does **not** cover admin logins, uploaded files, or a Supabase-managed restore; the Supabase organization is on the Free plan with no automatic backups) are listed there. Run
`pnpm backup:export` before the cutover and again before any later risky change.

---

## 12. Quick reference

| Need | Command / place |
|---|---|
| All env vars and what each does | `.env.example`; section 2 above |
| Check every legacy redirect | `pnpm verify:redirects <base-url> [--csv=file] [--no-destination-check]` |
| Fallback titles/descriptions OSI should fill | `pnpm report:seo-fallbacks` → `docs/seo-fallbacks.csv` |
| Which products can be published next | `pnpm report:product-readiness` → `docs/PRODUCT-READINESS.md` |
| Back up the database | `pnpm backup:export` |
| See messages the site "sent" in a dry run | admin → Admin → **Email outbox** (admins only; needs migration 0056 and `EMAIL_DRY_RUN=true`) |
| Create an admin | `pnpm create-admin <email>` (uses `NEXT_PUBLIC_SITE_URL` for the invite link) |
| Production Vercel project | `osi-cms` (`prj_uKK9PZKsROFc9AdgSLQWfcIHnQoy`) |
