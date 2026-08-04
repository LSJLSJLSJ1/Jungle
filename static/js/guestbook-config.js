/*
 * Public browser configuration for the static guestbook.
 *
 * The anon key is safe to expose in a browser only when the database table is
 * protected by the RLS policies in supabase/guestbook.sql. Never put a
 * Supabase service_role key here.
 */
window.GUESTBOOK_CONFIG = Object.freeze({
    provider: 'supabase',
    url: '',
    anonKey: ''
});
