# Blog CMS

A simple, self-hosted blog with a built-in editor and a publish API. Next.js, Supabase, Vercel.

I run my own blog on it: **[blog.serdarsalim.com](https://blog.serdarsalim.com/)**

[![blog.serdarsalim.com](docs/screenshot.png)](https://blog.serdarsalim.com/)

## What you get

- Articles and link posts, with categories and search
- Edit in the browser after Google sign-in, or publish from any script via `POST /api/publish` ([docs](docs/publish-api.md))
- RSS, sitemap and Open Graph images out of the box
- Renamed posts keep their old URLs working

## Run it

```bash
npm install
npm run dev
```

You'll need a Supabase project and a Google OAuth client. Env var names are in [.env.example](.env.example).

## License

[AGPL-3.0](LICENSE)
