# Photo Vote

A photo voting app: an admin panel to upload a pool of photos, a public voting
page where visitors rate each photo 1-10, and a CSV export of the results.

## How it's hosted (read this first)

Netlify itself only serves static files — it has no database on its own.
So this app **also uses Netlify Functions** (small serverless backend
functions, included in this project's `functions/` folder) plus **Netlify
Blobs**, Netlify's built-in storage service. Netlify Blobs stores both the
uploaded images (as the actual pixel data) and the vote records, so everyone
who visits your voting link sees the same shared pool and votes accumulate
in one place.

**You don't need to sign up for or configure any separate image host,
database, or storage bucket.** Netlify Blobs turns on automatically the
moment this site is deployed on Netlify — no extra setup, no extra
credentials, no extra cost on Netlify's free tier for a project this size.

This also means the app **will not work if you just open `index.html` as a
local file**, and won't fully work with a generic static host (GitHub Pages,
S3, etc.) — it specifically needs to run on Netlify so the Functions and
Blobs are available.

## Deploying to Netlify

**Option A — drag and drop (fastest):**
1. Zip this whole folder (or use the zip you were given).
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag the
   folder in.
3. Netlify builds it and gives you a live URL. Done.

**Option B — connect a GitHub repo (recommended if you'll make changes):**
1. Push this folder to a new GitHub repository.
2. In Netlify: **Add new site → Import an existing project**, pick the repo.
3. Build settings are already defined in `netlify.toml` (publish folder
   `public`, functions folder `functions`) — you shouldn't need to change
   anything. Click **Deploy**.

Either way, once deployed you'll get a URL like
`https://your-site-name.netlify.app`. Share that link with voters directly,
or share `.../admin.html` with yourself for the admin panel.

## Using it

- **Admin panel:** go to `/admin.html`, enter the password `admin`, and
  upload photos (drag-and-drop or the file picker). Photos are automatically
  resized in the browser before upload to keep things fast.
- **Voting page:** the homepage (`/`) shows the photo pool along the side
  (bottom on mobile). Voters click a photo, then click a score from 1-10.
  Each browser remembers locally which photos it already rated, so the same
  device won't be prompted twice for the same photo.
- **Export results:** in the admin panel, click **Export CSV** to download a
  spreadsheet with each photo's filename, vote count, average score, total
  score, and every individual score recorded.

## About the password

The admin password is hardcoded as `admin`, exactly as requested, and is
checked both in the browser and on the server. Keep in mind this is a soft
gate suitable for a casual/private link shared with trusted people — it is
**not** strong security. Since the password lives in this project's source
code, anyone with access to your deployed site's function source (or this
codebase) can see it. If you ever want something more robust, the natural
upgrade is to move the password into a Netlify environment variable and/or
add real authentication — happy to help with that if it becomes a concern.

## Local development (optional)

If you want to test locally before deploying:

```bash
npm install -g netlify-cli
npm install
netlify dev
```

`netlify dev` runs the functions and emulates Blobs locally so you can test
the full flow before pushing to production.

## Notes on limits

- Uploaded images are resized client-side to a max dimension of 1600px and
  compressed to JPEG (quality ~0.82) before upload, both to keep the voting
  page fast and to stay comfortably under Netlify Functions' request size
  limits. This keeps typical photos in the few-hundred-KB range.
- There's no hard cap on how many photos you can add, but a very large pool
  (many hundreds of photos) will make the pool sidebar and admin gallery
  slower to load since all images currently load up front.
