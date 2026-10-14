"use client";

import { useEffect } from "react";

/**
 * Safety net for auth emails that land on the PUBLIC site instead of
 * /admin/reset-password — which is what Supabase does whenever the
 * `redirect_to` it was given isn't in its Redirect URLs allow-list (it falls
 * back to the Site URL). The fragment never reaches the server, so only the
 * browser can see it: forward a recovery/invite session to the reset page, and
 * a dead link (error in the fragment) to "request a new one".
 */
export function RecoveryLinkRedirect() {
  useEffect(() => {
    const hash = window.location.hash;
    if (/access_token=/.test(hash) && /type=(recovery|invite)/.test(hash)) {
      window.location.replace(`/admin/reset-password${hash}`);
    } else if (/error_code=otp_expired/.test(hash)) {
      window.location.replace("/admin/forgot-password?expired=1");
    }
  }, []);
  return null;
}
