# Atria Residences

Static multi-page HTML website for Atria Residences.

## Tech Stack

- HTML, CSS, vanilla JavaScript
- No framework build step required for normal local run/deploy

## Project Structure

- Root contains the live pages (`index.html`, `about.html`, etc.)
- `figma-export/` contains generated copies for Figma import
- `tools/build-figma-export.js` rebuilds the Figma-export package

## Run Locally

### Prerequisites

- Node.js 18+ (recommended)

### Start local server

From project root:

```bash
npx --yes serve -l 4173 .
```

Open in browser:

- `http://localhost:4173`

Stop server:

- Press `Ctrl + C`

## Rebuild Figma Export (Optional)

From project root:

```bash
node tools/build-figma-export.js
```

This regenerates files in `figma-export/` and refreshes `figma-export/URLS.txt`.

## Deploy

### Option 1: Vercel (Recommended)

1. Push this project to GitHub.
2. In Vercel, click **New Project** and import the repository.
3. Configure as static site:
   - Framework preset: `Other`
   - Build command: *(leave empty)*
   - Output directory: *(leave empty, use root)*
4. Deploy.

### Option 2: Netlify

1. Connect the repository or drag-and-drop this folder in Netlify Drop.
2. Build command: *(none)*
3. Publish directory: project root (`.`)
4. Deploy.

### Option 3: GitHub Pages

1. Push project to GitHub.
2. Go to **Settings > Pages**.
3. Set source to `main` branch and root folder.
4. Save and wait for the site URL.

## Notes

- Pages are served directly as static files (`/about.html`, `/contact.html`, etc.).
- `figma-export/` is intended for design import workflows and can be deployed as static files too.
