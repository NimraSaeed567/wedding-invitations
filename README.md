# Digital Wedding Invitations

Interactive, mobile-first wedding invitation websites with RSVP, guest messages, a shared photo gallery, and a password-protected admin view. Built with plain HTML, CSS, and JavaScript, using Supabase as the backend through its REST and Storage APIs.

The couple names, dates, and illustrations are demo content.

## Templates

| Folder | Style | Highlights |
|---|---|---|
| [aurelia-classic](aurelia-classic) | Envelope letter with a video hero | Scratch-to-reveal date, RSVP form, blessings wall, guest photo gallery uploads, admin panel |
| [aurelia-cinematic](aurelia-cinematic) | Full-screen cinematic video hero | Scroll lock until the intro finishes, staged text reveals, guest messages, admin panel |
| [riviera](riviera) | Mediterranean villa theme, multi-event | Event schedule, venue map, guest messages, admin panel |
| [aurelia-storybook](aurelia-storybook) | Illustrated video reel | Animated HTML reel rendered frame by frame to MP4 with Puppeteer (`video-build/`) |

## How it works

- **Frontend:** vanilla JavaScript, HTML, and CSS with responsive layouts, animations, and a strict Content Security Policy
- **Backend:** Supabase Postgres tables for RSVPs and messages, plus Supabase Storage for gallery photos, called directly through the REST API (`/rest/v1`, `/storage/v1`)
- **Admin view:** lists, moderates, and deletes RSVPs, messages, and photos
- **Fallback:** if Supabase isn't configured, forms fall back to Formspree or local storage, so every card still works as a static page

## Setup

1. Create a Supabase project with the tables and storage bucket the forms use.
2. In each card's `index.html`, replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` in the `data-sync-url` / `data-sync-key` attributes.
3. In each `main.js`, change `ADMIN_PASSWORD`. This check runs in the browser and is for demo use only. For a real event, protect admin actions with Supabase Auth and Row Level Security.
4. Open `index.html` locally, or deploy the folder to Vercel or Netlify.
