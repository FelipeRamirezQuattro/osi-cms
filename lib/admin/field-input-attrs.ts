/**
 * Heuristic `type`/`inputMode`/`autoComplete`/`spellCheck` for a "text"
 * `FieldSpec` (lib/blocks/admin-fields.ts), keyed off the field's `key`
 * name — the same way `defaultForFieldSpec` and every other piece of
 * FieldRenderer presentation metadata works, since FieldSpec has no
 * dedicated slot for this (adding one would mean touching every one of
 * the ~30 block/entity files that declare a `text` field just to keep
 * the current default; a naming convention already carries enough
 * signal — "email"/"phone"/"...Url"/"...Href"/"slug" are consistent
 * across every block and entity schema in this codebase).
 *
 * Deliberately does NOT set `type="url"` for URL/href-shaped keys even
 * though several genuinely hold absolute URLs (posterImageUrl,
 * mapEmbedUrl) — many others hold relative internal paths like
 * "/about-us" (every CTA/link `href` field), and `<input type="url">`'s
 * native constraint validation requires a full absolute URL to be
 * considered valid. A relative path would fail that check silently
 * (react-hook-form's `handleSubmit` doesn't set `noValidate`, so the
 * browser's own validation runs first) and block the save. `inputMode`
 * has no such constraint-validation side effect — it only hints the
 * on-screen keyboard — so it's the safe lever for URL-shaped fields.
 *
 * `autoComplete` is "off" across the board rather than "email"/"tel"/
 * "name" tokens: those tokens exist to autofill a field with the
 * *signed-in user's own* saved profile data, but every field this
 * heuristic sees belongs to CMS content (a directory contact's phone
 * number, a block's CTA link, a location's email) — never the logged-in
 * admin's own identity. Offering the admin's own saved email/phone as an
 * autofill suggestion there would be a wrong-content bug, not a
 * convenience. (Contrast with the actual login/contact forms, which
 * really are about a person's own identity — see login-form.tsx,
 * contact-form-client.tsx — those set real autocomplete tokens
 * directly, not through this helper.)
 */

export type TextInputAttrs = {
  type: "text" | "email" | "tel";
  inputMode?: "email" | "tel" | "url";
  autoComplete: "off";
  spellCheck: boolean;
};

function isEmailKey(key: string): boolean {
  return /email/i.test(key);
}

function isPhoneKey(key: string): boolean {
  return /phone/i.test(key);
}

function isUrlKey(key: string): boolean {
  return /url$|href$/i.test(key);
}

/** Identifier-shaped fields (slugs, keys, ids, codes) — never worth spell-checking. */
function isIdentifierKey(key: string): boolean {
  return /^slug$/i.test(key) || /_code$/i.test(key) || /key$/i.test(key) || /_id$/.test(key) || /Id$/.test(key);
}

export function getTextInputAttrs(key: string): TextInputAttrs {
  if (isEmailKey(key)) {
    return { type: "email", inputMode: "email", autoComplete: "off", spellCheck: false };
  }
  if (isPhoneKey(key)) {
    return { type: "tel", inputMode: "tel", autoComplete: "off", spellCheck: false };
  }
  if (isUrlKey(key)) {
    return { type: "text", inputMode: "url", autoComplete: "off", spellCheck: false };
  }
  if (isIdentifierKey(key)) {
    return { type: "text", autoComplete: "off", spellCheck: false };
  }
  return { type: "text", autoComplete: "off", spellCheck: true };
}
