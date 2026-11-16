# Next Up

A personal to-do list with categories, priorities, a "Do this next" card and a calendar.
Hosted on Vercel, data and sign-in in Supabase.

## Files
- `index.html` – the page
- `styles.css` – the look
- `app.js` – everything the app does
- `config.js` – the Supabase project URL and publishable key
- `supabase/setup.sql` – run once in the Supabase SQL Editor to create the tables
- `manifest.webmanifest`, `icons/` – home screen name and icon
- `sw.js` – offline support: keeps the app's files on the device so it opens without internet

## How updates go live
Save a change to this repository and Vercel publishes it automatically within about a minute.

## Offline
The app keeps a copy of your tasks on each device and queues changes made without internet. They are sent to Supabase automatically when the connection is back.
