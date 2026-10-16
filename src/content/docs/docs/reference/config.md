---
title: Configuration reference
description: The fields of valence.config.json, keyring.json and baseline.json, the project layout, and the .gitattributes rules that keep bundles byte-exact.
sidebar:
  order: 2
---

## Project layout

```
<root>/
  <web app>/                  your web app (any SPA that builds to static files)
  mobile/                     Flutter host
    lib/valence/              server.dart  updater.dart  store.dart  sync.dart  bridge.dart  host.dart
                              bridge.g.dart  config.g.dart   (generated, never edited)
    assets/valence/builtin/   built-in bundle: manifest.json, manifest.json.sig, files/<sha256>
    assets/valence/seed.db    bundled SQLite seed
  valence/
    valence.config.json       app id, key id, paths, base URLs, data schemas, writable buckets
    bridge.schema.json        the bridge definition
    keyring.json              public keys {keyId: base64 raw Ed25519}, compiled into the host
    valence.mjs               the vendored CLI
  <web lib>/                  bridge.g.ts (generated) + client.ts + shim.ts
  .valence/
    baseline.json             committed: the reviewed routes and schema, lastSeq and floor
    dist-ota/                 gitignored: signed output ready to upload
```

## `valence/valence.config.json`

```json
{
  "appId": "com.example.app",
  "keyId": "k1",
  "web": {
    "out": "web/build",
    "lib": "web/src/lib/valence",
    "routes": "web/src/routes",
    "entry": "index.html",
    "connect": ["https://api.example.com"]
  },
  "host": { "dir": "mobile" },
  "ota": { "base": "https://ota.example.com" },
  "sync": { "base": "https://api.example.com/sync" },
  "data": { "schedule": 2 },
  "writable": ["notes"]
}
```

| Field | Required | Meaning |
|---|---|---|
| `appId` | yes | Reverse-DNS id such as `com.example.app`. Must match `^[a-zA-Z]\w*(\.[a-zA-Z]\w*)+$`. |
| `keyId` | yes | Which key in `keyring.json` signs bundles. Letters, digits, `_` and `-`. |
| `web.out` | yes | Where your web build writes its static output. |
| `web.lib` | yes | Where the generated `bridge.g.ts`, `client.ts` and `shim.ts` live. |
| `web.routes` | no | Your routes directory, scanned for top-level routes. SvelteKit, Next.js app router, Astro and Next.js pages router layouts are understood. |
| `web.entry` | no | The entry file inside `web.out`. Default `index.html`. |
| `web.connect` | no | Extra API origins the page may call. Added to the CSP `connect-src` next to `sync.base`. |
| `host.dir` | yes | The Flutter host directory. |
| `ota.base` | no | The static host that serves signed bundles. |
| `sync.base` | no | The sync API base URL. Its origin is added to the CSP. |
| `data` | no | Read-only buckets and their schema numbers (integers of at least 1). |
| `writable` | no | Buckets the user can write. They always use schema 1. A bucket cannot also be in `data`. |

## `valence/keyring.json`

```json
{ "k1": "<base64 raw Ed25519 public key>" }
```

Public keys only, so it is safe to commit. `keygen` adds an entry, and `codegen` compiles the keyring into `config.g.dart`. The host picks a key by the manifest's `keyId` and refuses unknown ids.

## `.valence/baseline.json`

```json
{ "storeSeq": 1760611200, "storeRoutes": ["/", "/schedule"], "storeSchema": { "version": 1, "methods": {}, "events": {}, "types": {} }, "lastSeq": 1760697600, "floor": 0 }
```

| Field | Meaning |
|---|---|
| `storeSeq` | The `seq` of the bundle last built with `bundle --store`. |
| `storeRoutes` | The top-level routes that bundle contained. New routes since then raise a warning. |
| `storeSchema` | The bridge schema that bundle shipped. It becomes additive-only. |
| `lastSeq` | The highest `seq` issued. Keeps `seq` increasing across machines. |
| `floor` | The current floor. It only goes up. |

Commit this file after every release.

## `.gitattributes`

This file is mandatory. Git for Windows' `core.autocrlf` otherwise rewrites the built-in bundle's bytes, and every hash and signature breaks. Use one pattern per line, because git ignores a line with several patterns:

```
mobile/assets/valence/** -text
*.g.dart text eol=lf
*.g.ts text eol=lf
valence/*.json text eol=lf
```

Also keep generated files out of formatters such as Prettier and Biome.

## Where the keys live

| What | Where |
|---|---|
| Private signing key | `~/.valence/keys/<appId>.<keyId>.pem`, or the `VALENCE_SIGNING_KEY` CI secret. Never in the repo. |
| Public keys | `valence/keyring.json`, committed. |

On the device, update state is kept in `<appSupport>/valence/state.json`, outside the backup. See the [update protocol](/docs/reference/update-protocol/#state-file).
