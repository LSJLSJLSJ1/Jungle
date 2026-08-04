# Supabase guestbook setup

The GitHub Pages build can keep the current static site while storing guestbook
messages in Supabase.

## 1. Create the table

Create a Supabase project, open **SQL Editor**, and run:

```text
supabase/guestbook.sql
```

The script enables Row Level Security and permits only public reads and bounded
public inserts. Do not create a browser config with a `service_role` key.

## 2. Add the public project settings

Open `static/js/guestbook-config.js` and set:

```js
window.GUESTBOOK_CONFIG = Object.freeze({
    provider: 'supabase',
    url: 'https://YOUR_PROJECT_REF.supabase.co',
    anonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
});
```

The browser-visible publishable/anon key is expected here; the database RLS
policies are the security boundary. Never use a `service_role` key in this file.

## 3. Deploy

Commit and push the configuration. The existing GitHub Pages workflow rebuilds
`docs/` and deploys the site. The same site URL remains available:

```text
https://lsjlsjlsj1.github.io/Jungle/
```

If the Supabase project is paused after a long period of inactivity, resume it
from the Supabase dashboard.
