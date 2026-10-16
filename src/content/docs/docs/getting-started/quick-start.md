---
title: Quick start
description: Set up Valence in an existing web and Flutter project with one command, then build the host and ship your first signed bundle.
sidebar:
  order: 1
---

This page takes a project with a web app and (optionally) a Flutter app to a working Valence setup. It takes a few minutes, and most of that is the wizard waiting for you to confirm what it detected.

## Requirements

- **Node.js 22.13 or later.** The CLI is plain Node with no dependencies. It uses `node:crypto`, `node:sqlite` and `node:util`.
- **A web app that builds to static files.** SvelteKit, a Next.js static export, Astro and Vite are detected automatically. Any single-page app that outputs static files works.
- **Flutter**, for the host. If you do not have a Flutter project yet, the wizard uses `mobile/`.
- **Claude Code**, optional. It generates the Flutter host for you. Without it, the CLI still works on its own.

## Run the wizard

From your project root:

```sh
npm create valence@latest
```

The wizard sets up everything that does not need AI, in a few seconds:

1. **Detects** your web app, its package manager, an existing Flutter project and your app id. It only asks for what it cannot detect.
2. **Writes** `valence/valence.config.json`, the bridge schema and the web bridge client. It also adds `.gitattributes` and `.gitignore` entries.
3. **Generates** an Ed25519 signing key **outside the repo**, and the typed bridge code for Dart and TypeScript.
4. **Installs** the `/valence` Claude Code skill and its agents into `.claude/`, or into `~/.claude/` with `--global`.
5. **Offers to launch** `claude "/valence init"`, which builds the Flutter host, wires your web app, runs the tests and gets an independent review.

It is safe to run again. It never overwrites your config, your schema or files you have edited. Pass `--yes` to accept the detected defaults without prompts, for example in CI.

### Wizard options

| Option | Meaning |
|---|---|
| `-y`, `--yes` | Accept the detected defaults, no prompts. |
| `--web <dir>` | Which web app to use. Required when there are several and no prompt. |
| `--host <dir>` | Flutter host directory. Default: the existing Flutter app, otherwise `mobile`. |
| `--app-id <id>` | For example `com.company.app`. |
| `--ota <url>` | The static host for signed bundles. |
| `--sync <url>` | The sync API base URL. |
| `--global` | Install the skill and agents into `~/.claude` instead of `./.claude`. |
| `--force` | Replace locally edited skill, agent and `valence.mjs` files. |
| `--no-launch` | Do not offer to start Claude Code. |
| `--root <dir>` | The project root. Default: the current directory. |

## Build the host

If you use Claude Code, run:

```sh
claude "/valence init"
```

`/valence init` uses three kinds of agents: a docs scout that checks the current Flutter and store documentation, two builders working in parallel on the Flutter host and the web side, and an independent reviewer that checks the result. It finishes by writing an `AGENTS.md` section so every later contributor follows the same rules.

Without Claude Code, the spec is the contract. The [Flutter host guide](/docs/guides/host/) lists what the host has to do, and the [bundle format](/docs/reference/manifest/) and [update protocol](/docs/reference/update-protocol/) pages define the behaviour precisely.

## Ship the first release

1. Build your web app so its output exists at the path in `web.out`.
2. Build the built-in bundle that ships inside the app, for the store submission:

   ```sh
   node valence/valence.mjs bundle --store
   ```

3. Build and submit the Flutter app.
4. After that, every UI change is an over-the-air release. See [Releasing](/docs/guides/releasing/).

## Other commands

```sh
npx create-valence@latest update    # update the vendored CLI, skill and agents
npx create-valence doctor           # quick health check
npx create-valence codegen --check  # any CLI command: keygen | codegen | bundle | verify | pointer | seed | version
```

For the full audit, run `claude "/valence doctor"`. See the [CLI reference](/docs/reference/cli/).

## Next steps

- Read [How Valence works](/docs/getting-started/concepts/) to see which kind of change travels how.
- Wire your web code to native features with the [web app guide](/docs/guides/web-app/).
