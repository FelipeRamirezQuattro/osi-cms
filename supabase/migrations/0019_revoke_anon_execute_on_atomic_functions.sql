-- The security advisor flags every atomic/audit function from 0017 as
-- callable by the `anon` role via PostgREST RPC, even though that
-- migration already ran `revoke all ... from public` + `grant execute
-- ... to authenticated` for each one. Supabase projects grant `execute
-- on all functions in schema public` to `anon`/`authenticated` as a
-- default privilege at project bootstrap, independent of the `public`
-- pseudo-role revoke — so a newly created function is still directly
-- executable by `anon` until that grant is revoked from `anon`
-- explicitly. Each function already rejects an unauthenticated caller
-- internally (`has_capability(...)` resolves to false when `auth.uid()`
-- is null), so this was not a working bypass, but exposing write RPCs to
-- anonymous callers at all is exactly what the advisor's WARN exists to
-- catch — revoke it outright rather than rely on the internal check as
-- the only layer.

revoke execute on function public.save_page_draft_atomic(uuid, jsonb, jsonb, bigint) from anon;
revoke execute on function public.publish_page_atomic(uuid, bigint) from anon;
revoke execute on function public.unpublish_page_atomic(uuid) from anon;
revoke execute on function public.delete_page_atomic(uuid) from anon;
revoke execute on function public.duplicate_page_atomic(uuid, text) from anon;
revoke execute on function public.record_audit(text, text, uuid, jsonb) from anon;
