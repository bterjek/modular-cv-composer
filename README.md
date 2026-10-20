# Modular CV Composer

Modular CV Composer helps you keep several versions of your CV without rebuilding each one from scratch. You can import existing PDF or Word CVs, collect their content in a reusable library, and choose which experience, skills and wording belong in each application. The library keeps the underlying career facts together while allowing different descriptions to emphasise different aspects of the same work.

Each saved CV is an independent copy, so changing one application does not change your other CVs or the library. The editor handles the layout and provides a measured A4 preview, with a classical two-page template as the starting point. You can save other styles using the supported layout settings and attach a document as a visual reference, although the app does not automatically reproduce an arbitrary uploaded design.

If you prefer to compare your CV with a job description in a chat client, you can export the relevant context and review a proposed revision before saving it as a new CV. There is no AI account or API key to configure in the app. Imports also have a review step: the app extracts text from PDF and DOCX files, but you should check the suggested sections, dates and role boundaries before accepting them. Scanned documents need OCR elsewhere first.

## Set up your own installation

The easiest way to run the app is with Docker. These instructions run it on your own computer at **http://localhost:3000**, with your data stored in a folder beside the code. The local setup works on both Apple silicon and Intel Macs; the same Docker Compose commands can also be used on Linux or in a suitable Windows terminal.

You need Git and a running Docker installation with Docker Compose support. Docker Desktop is one option; OrbStack also works on macOS. You do not need to install Node.js or a separate database for this setup.

### 1. Download the repository

Open a terminal in the folder where you want to keep the app, then run:

```sh
git clone https://github.com/bterjek/modular-cv-composer.git
cd modular-cv-composer
```

Choose a normal local folder rather than one synced through iCloud Drive, Dropbox or a similar service, because the app will keep a live SQLite database there.

### 2. Set your administrator email

Create a file named `.env` in the `modular-cv-composer` folder, next to `compose.local.yaml`. Put the following line in it, replacing the example with your own email address:

```env
ADMIN_EMAIL=you@example.com
```

This tells the app who may create the first administrator account. You will choose your password in the signup form; it does not go in this file. The app prints the signup link in its logs rather than sending an email.

For this local setup, the single line above is enough. The supplied `.env.example` is intended as a reference for hosted deployments and includes settings that need changing for local use.

### 3. Build and start the app

Make sure Docker is running, then run this from the repository folder:

```sh
docker compose -f compose.local.yaml up -d --build --wait
```

The first build can take several minutes because it installs the app and the browser used to produce PDFs. Docker also creates the database and applies its migrations automatically.

Use `compose.local.yaml` throughout these instructions. The repository also contains a separate `compose.yaml` for other deployment arrangements, with different storage and network settings.

### 4. Create your administrator account

Read the startup log:

```sh
docker compose -f compose.local.yaml logs app
```

Find the line beginning with `[bootstrap] No admin yet` and open the signup link shown there. Enter your name, the same email address you put in `.env`, and a password.

The link is valid for 24 hours and can be used once. If it expires before you register, restart the app and read the log again to get a new one:

```sh
docker compose -f compose.local.yaml restart app
docker compose -f compose.local.yaml logs --since 2m app
```

Your administrator account can use the full app, so you do not need to invite yourself as a second user. Once an administrator exists, restarting the app no longer generates a first-admin signup link.

### 5. Start building your library

Open [http://localhost:3000](http://localhost:3000) and sign in. Go to **Import CVs**, upload a PDF or DOCX CV, and review the extracted content before adding it to your library. From **My CVs**, you can work on the imported CV or create a new one using existing entries and anything you want to write from scratch.

Use the preview to check the result before exporting. If a CV exceeds two pages, the app asks you to edit it before allowing an export; it does not silently remove content or shrink the text to fit. The [workflow guide](docs/COMPOSER.md) explains editing, alternative wording, chat exchange and templates in more detail.

## Your data and other users

The local configuration mounts the repository's `data` folder into the container at `/data`. Your accounts, library, imported documents and saved CVs live in `data/composer.sqlite`, with automatic backups in `data/backups`. Rebuilding or replacing the container reconnects it to that same folder, which is why your content remains after an update.

The `data` folder and `.env` are excluded from Git and Docker builds. Someone cloning this repository gets their own installation and creates their own administrator account; they do not receive your saved data or access to your running app.

To let someone use your installation, create an invitation in **Admin** and give them the signup link. The local configuration only accepts connections from your own computer, so an invitation alone does not make it reachable remotely. See [local hosting](docs/LOCAL-HOSTING.md) for the additional work involved in providing remote access.

Automatic backups are kept on the same computer as the database. Keep a separate copy of those backups somewhere else if you need protection against a lost or failed machine. Avoid copying the live database while the app is running; use a completed backup, or stop the app before copying the whole `data` folder.

## Update, stop and restart

To update an existing installation, run these commands from its repository folder:

```sh
git pull --ff-only origin main
docker compose -f compose.local.yaml build --build-arg APP_VERSION="$(git rev-parse --short=12 HEAD)"
docker compose -f compose.local.yaml up -d --no-build --wait
```

This rebuilds the app, records the Git revision in the image, and replaces the running container while keeping your existing data. Pending database migrations run when the app starts. Keep a recent backup before updating.

To stop the app without removing its data:

```sh
docker compose -f compose.local.yaml stop
```

To start it again:

```sh
docker compose -f compose.local.yaml start
```

If something goes wrong, check the container status and logs:

```sh
docker compose -f compose.local.yaml ps
docker compose -f compose.local.yaml logs --tail 100 app
```

Keep signup links and other account details private when sharing logs for help. If Docker reports that port 3000 is already in use, stop the other service using that port before starting this installation.

## Development

The app uses SvelteKit and TypeScript, with SQLite through Drizzle ORM and Zod for validation. PDF exports use Chromium through Playwright, and the bundled Inter and Source Serif 4 fonts are included in exports. Docker packages the application and its PDF renderer together.

For development outside Docker, install Node.js 22 or later and a local Chrome or Chromium browser. From the repository folder, run:

```sh
npm ci
npm run db:migrate
ADMIN_EMAIL=you@example.com npm run dev
```

With the default development settings, this uses `data/dev.sqlite` and serves the app at **http://localhost:5173**. The first-admin signup link appears in the terminal. These commands use shell environment variables; the Docker `.env` file is not a substitute for passing `ADMIN_EMAIL` to this command. Set `CHROMIUM_PATH` to your browser executable when you need PDF rendering outside Docker.

The main verification commands are:

```sh
npm run check
npm test
CHROMIUM_PATH=/path/to/chrome-or-chromium npm run verify
```

The full verification command runs type checking, automated tests, a production build and browser checks in sequence. Test definitions and results are retained under `tests/<commit-sha>/`, with working-tree runs labelled separately. Browser and PDF coverage require `CHROMIUM_PATH`; the optional visual-export test also requires `VISUAL_OUT`. Historical records in `tests` are archives rather than additional test suites.

For a database change, update [the schema documentation](docs/SCHEMA.md) and `src/lib/server/db/schema.ts`, then run `npm run db:generate` and include the generated migration from `drizzle/` with the change.

## Further reading

The [workflow guide](docs/COMPOSER.md) is the best place to start once the app is running. More detailed guides cover [imports](docs/IMPORTING.md), [matching imported content to your library](docs/RECONCILIATION.md), [the library model](docs/LIBRARY.md), and [A4 layout and export](docs/CLASSICAL-A4.md).

For operating an installation, see [accounts and invitations](docs/AUTH.md), [local hosting](docs/LOCAL-HOSTING.md), [deployment](docs/DEPLOY.md), [backup options](docs/BACKUP-OPTIONS.md), and [snapshots and privacy](docs/SNAPSHOTS-AND-PRIVACY.md).

The older category, job-targeting and snapshot workflows remain available under **Earlier assembly tools**. Their behaviour is documented in the [editor guide](docs/EDITOR.md), [rendering guide](docs/RENDERING.md) and [job-ad terms guide](docs/TERMS.md). The [backlog](docs/BACKLOG.md) records ideas that have not yet been implemented.
