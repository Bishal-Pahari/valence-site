---
title: CLI reference
description: Every command and flag of the valence CLI (keygen, codegen, bundle, verify, pointer, seed) and the create-valence wizard, with example output.
sidebar:
  order: 1
---

Valence has two command-line entry points. The **wizard** (`create-valence`) sets up a project and passes any other command through to the **CLI** (`valence.mjs`), which the wizard also copies into your repo so CI needs no install. Both need Node.js 22.13 or later, and the CLI has no dependencies.

```sh
node valence/valence.mjs <command> [options]     # the vendored CLI
npx create-valence@latest <command> [options]    # the wizard, which also forwards CLI commands
```

All CLI commands read `valence/valence.config.json` and print their result as JSON on success. On failure they print `valence: <message>` to stderr and exit with status 1. Add `--root <dir>` to run against another project root (default `.`). `--help` or `-h` prints the usage text.

## `version`

Prints the CLI version. `/valence doctor` compares it with the skill's copy.

## `keygen`

Creates a new Ed25519 key in `~/.valence/keys/<appId>.<keyId>.pem` (mode `0600`) and adds the public half to `valence/keyring.json`.

```json
{ "file": "/home/you/.valence/keys/com.example.app.k1.pem", "publicKey": "<base64 raw key>" }
```

It refuses to write inside a git work tree, to reuse a `keyId` already in the keyring, or to overwrite an existing key file. To rotate, set a new `keyId` in the config and run it again.

## `codegen [--check]`

Reads `valence/bridge.schema.json`, `valence.config.json` and `keyring.json`, and writes `bridge.g.ts`, `bridge.g.dart` and `config.g.dart`. It only rewrites files whose content changed.

| Flag | Meaning |
|---|---|
| `--check` | Write nothing. Exit non-zero and list the stale files if any generated file differs. Run it in CI. |

It also enforces the additive-only rules against the schema recorded by the last `bundle --store`. See the [bridge guide](/docs/guides/bridge/#evolve-the-schema-safely).

## `bundle`

Signs the web build.

```sh
node valence/valence.mjs bundle [--builtin | --store] [--floor N] [--requires-bridge N] [--urgent] [--key file]
```

| Flag | Meaning |
|---|---|
| *(none)* | Write a signed OTA bundle to `.valence/dist-ota/<appId>/`, ready to upload. |
| `--builtin` | Write the built-in bundle into the host's `assets/valence/builtin/` instead. |
| `--store` | Like `--builtin`, for a build you submit to the stores. Also records the reviewed routes and bridge schema in `.valence/baseline.json`. |
| `--floor N` | Set the manifest's floor. Must not be below the current floor. |
| `--requires-bridge N` | The minimum host bridge version. Defaults to the schema `version`. |
| `--urgent` | Set `urgent: true` in the manifest. |
| `--key <file>` | Sign with this private key file instead of the default path. Cannot be combined with `VALENCE_SIGNING_KEY`. |

Output:

```json
{ "seq": 1760611200, "files": 41, "manifest": ".valence/dist-ota/com.example.app/manifests/1760611200.json" }
```

`seq` is `max(clock seconds, baseline.lastSeq + 1, baseline.storeSeq + 1, highest local manifest + 1)`, so it stays increasing even with a slow clock or two builds in one second. Warnings (a new top-level route, a `.wasm` file) go to stderr as `warning: ...`.

## `verify`

Checks a manifest, its signature and every file.

```sh
node valence/valence.mjs verify --manifest <manifest.json> --files <files dir>
```

```json
{ "ok": true, "seq": 1760611200, "files": 41 }
```

Both flags are required. It checks the signature, the `appId`, the `seq` and floor, that the entry is in the file list, that every path is safe, and every file's hash and size.

## `pointer`

Writes the channel pointer.

```sh
node valence/valence.mjs pointer [--channel production] [--seq N] --rollout 0..100
```

| Flag | Meaning |
|---|---|
| `--channel <name>` | The channel name, letters, digits, `_` and `-`. Default `production`. |
| `--seq N` | Which manifest to point at. Default: the highest in `dist-ota`. |
| `--rollout 0..100` | **Required.** The percentage of phones that may take the update. |

```json
{ "file": ".valence/dist-ota/com.example.app/channels/production.json", "seq": 1760611200, "rollout": 10 }
```

## `seed`

Builds the SQLite seed from JSON files.

```sh
node valence/valence.mjs seed --from <dir>
```

Each `<bucket>.json` in the directory holds `{ "schema": n, "rows": [{ "k", "v", "u", "d" }] }`. The output is the host's `assets/valence/seed.db`. See [Data and sync](/docs/guides/data-and-sync/#seed-the-first-launch).

```json
{ "out": "mobile/assets/valence/seed.db", "counts": { "schedule": 120 } }
```

## The wizard: `create-valence`

| Command | Meaning |
|---|---|
| `npx create-valence@latest [init]` | Detect the project, write config, keys and generated code, install the Claude skill, and offer to launch Claude Code. |
| `npx create-valence@latest update` | Update the vendored CLI, skill and agents to this version. Edits you made are kept, with backups. |
| `npx create-valence@latest doctor` | Quick health check. The full audit is `claude "/valence doctor"`. |
| `npx create-valence@latest <command>` | Any CLI command above. |

Options for `init` are listed in the [quick start](/docs/getting-started/quick-start/#wizard-options).

## Environment

| Variable | Meaning |
|---|---|
| `VALENCE_SIGNING_KEY` | PEM contents of the private signing key, for CI. Use instead of a key file. |

## Claude Code commands

| Command | Meaning |
|---|---|
| `/valence init` | Detect your web app, scaffold the Flutter host, keys, bridge, offline store and tests. |
| `/valence release` | Build, sign and stage an OTA bundle. Prints the upload commands and uploads only after you confirm. |
| `/valence doctor` | Read-only audit of versions, generated code, policy checks, signatures and tests. |
