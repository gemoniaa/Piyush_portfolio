# Piyush Nandi portfolio

A plain HTML, CSS and JavaScript site. There is nothing to install or build.

## Add or change content
`index.html` is the landing page with the loading screen and the 3D scroll. `portfolio.html` is the portfolio itself.

Everything comes from `config.js`. You never need to edit `index.html` or `main.js`.

- Photos for the 3D ring: put the image in `assets/clicks/` or `assets/events/`, then add a line to `gallery` in `config.js`.
- Certificates: put the image in `assets/certs/`, then add a line to `certs`.
- Event photos: put the image in `assets/events/`, then add a line to `events`.
- Posters and videos: put the files in `assets/creative/`, then add a line to `creative`.
- Instagram: paste the link into `links.instagram` and the button appears.
- Resume: replace `assets/Piyush_Nandi_Resume.pdf` with the new file, keeping the same name.
- Experience and education lines: edit `experience` and `education` in `config.js`.

- Logos: `assets/logos/` holds the SRM, KV, CHiPSET bulb, Canva, CapCut, Claude and GitHub logos, plus the CHiPSET logo shown in Experience.
- Ending of the landing page: a 3D laptop opens and its button takes you into the portfolio. The photo on its screen is `screen` in `config.js`.
- Loading screen: SRM, KV and the CHiPSET bulb spin in and out one after another inside orbit rings, and the bulb glows. The loading screen sits in a movie-set lighting rig: four lamps flicker on like faulty bulbs, then settle and brighten as the page loads. The styles are in `landing.css` (see `.studio` and `.lamp`) and the markup in `index.html`.
- Landing page logo pop-outs: they are listed in `landing.js`, in the `logoSet` lines. Change a logo, its position or its spin there.

## Put it on GitHub Pages
1. Create a new repository on GitHub, for example `portfolio`.
2. Upload everything inside this folder, so `index.html` and `portfolio.html` sit at the top of the repository.
3. Open Settings, then Pages. Under Source choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://gemoniaa.github.io/portfolio/`.

## Test on your computer
Double click `index.html`. For the photo glow to read colours from new photos, run a small server instead:
`python -m http.server 8000`, then open `http://localhost:8000`.

## Creative portfolio page

- `creative.html` is the separate page for posters and videos. The portfolio page only has a link card to it.
- Add your work by uploading files into `assets/creative/` on GitHub (sub-folders become the filter tabs). `creative-auto.js` finds them by itself, about a minute after you commit. This works on `yourname.github.io/repo` addresses; on your own domain, set `repo` in `config.js`. The script `python3 tools/build-creative-list.py` is an optional backup.
- The page loads 18 pieces at a time as you scroll, so a long list stays fast. Click a piece to open it, then use the arrows or swipe.

## Scroll effects on the portfolio page

They live in `scroll3d.js` and the end of `style.css`: progress line, section dots, 3D reveals, hero depth, stacking project cards, a glowing timeline for Experience and Education, a floor grid, and a gallery ring that spins as you scroll past. Visitors with reduced motion turned on get a calm version.

## Photos and posters that appear by themselves (Vercel or GitHub Pages)

Just upload files to GitHub. Nothing else to edit.

- `assets/clicks/`: new photos join the 3D ring.
- `assets/creative/`: new posters and videos join the creative page (sub-folders become filter tabs).
- On Vercel, `vercel.json` runs `tools/build-lists.js` on every deploy. After you commit, wait about a minute for Vercel to redeploy and the new photo shows up. In Vercel, Settings, Build and Development, leave Build Command and Output Directory on their defaults so `vercel.json` is used.
- To keep a photo off the ring, add its path to `hide` at the top of `config.js`.
- On a `yourname.github.io/repo` address `creative-auto.js` also finds new creative files straight from GitHub.

## Phones

The page is locked to a fixed zoom. The landing page camera has a top speed, so one swipe moves about one scene.

## Private editor (secret mode)

At the very bottom of `portfolio.html` and `creative.html`, in the footer next to "Terms and conditions", there is a nearly invisible dot. Tap it and enter the code to unlock private mode. A small "Private mode" pill appears with Edit and Lock buttons.

In the editor you can change your name, headline, intro, email, links, resume and main photo, and add, edit, reorder or delete projects, experience, education, languages, certificates, posts and events, gallery photos and creative work (posters and videos, with a category for each). Pick files straight from your phone or computer.

- Everything you change is saved on that device at once, and you see it on the page when you press Done. Visitors do not see it yet.
- Press Publish in the Publish tab to send it to everyone. It makes one commit to your repository (new files go to `assets/uploads/`, the text goes to `content.js`), and GitHub Pages or Vercel updates the site within a minute.
- On each device you use, paste a GitHub token once (the Publish tab explains how to make one). That token is what really lets you publish, so keep it private.
- The code is checked in the browser, so it only keeps casual visitors out. Nobody can publish without your token.
- `boot.js` loads the site and the secret button, `admin.js` is the editor, `content.js` is what you published. You never need to edit them.
- If you add the same section by hand in `config.js` later, the editor's published version wins for that section.
