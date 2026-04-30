# vero-booking

Public-facing customer booking app for V3RO — deployed to `book.v3ro.co.uk`.

This is a standalone Vite + React + Tailwind app, **completely separate from the internal Vero Control dashboard** (`vero-concierge`). It is designed to be visited by end customers (e.g. a homeowner finding a plumber on Google) and calls the same Supabase Edge Functions as the dashboard using the public anon key.

---

## Architecture

```
book.v3ro.co.uk/book/:slug
        │
        ├── Fetches customer_account by slug (Supabase REST API, anon key)
        ├── Calls check-availability Edge Function (Google Calendar FreeBusy)
        └── Calls confirm-booking Edge Function (writes bookings table + Google Calendar + SMS)
```

No auth. No internal components. No shadcn. Just React + Tailwind + react-query + react-hook-form.

---

## Setup

```bash
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Visit `http://localhost:3000/book/your-slug`

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL (EU) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key — **not** the service role key |

---

## Deployment

Designed for Vercel or Netlify as a static site with SPA routing:

**Vercel**: Zero-config. Set the two env vars in the Vercel dashboard. Add a custom domain: `book.v3ro.co.uk`.

**Netlify**: Add a `_redirects` file containing `/* /index.html 200` (for client-side routing). Set env vars in Site Settings.

**Custom domain DNS**: Point `book.v3ro.co.uk` CNAME to Vercel/Netlify. Enable HTTPS.

---

## Booking URL format

Customers reach their booking page via:
```
https://book.v3ro.co.uk/book/{slug}
```

The `slug` is set in `customer_account.slug` in Supabase. Vero Control generates and displays the full URL in Settings → Booking Link.

---

## Related

- Internal dashboard: [vero-concierge](https://github.com/Waldopounce/vero-concierge)
- Edge Functions: `check-availability`, `confirm-booking` in `vero-concierge/supabase/functions/`
- JIRA ticket: V3RO-72
