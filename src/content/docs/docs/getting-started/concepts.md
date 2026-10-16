---
title: How Valence works
description: The parts of a Valence app, which kind of change travels by store release, signed bundle or sync, and what keeps a bad release from reaching users.
sidebar:
  order: 2
---

A Valence app has four parts. Knowing which part carries which kind of change is most of what you need to use it.

## The parts

| Part | What it is | Changes by |
|---|---|---|
| **Flutter host** | The native app. It serves the web build, owns the database, runs the updater and exposes the bridge. | Store release |
| **Web bundle** | HTML, CSS, JavaScript, images and fonts: your web app's static build. | Signed over-the-air update |
| **Seed** | `seed.db`, a SQLite file bundled in the app so the first launch has data. | Store release |
| **Synced data** | Rows in native SQLite, pulled from your sync API or from static chunks on a CDN. | Sync |

The web app and the host talk through a [typed bridge](/docs/guides/bridge/). The host serves the web app from `http://127.0.0.1:<port>/` inside a WebView, so the UI is a real web page that also works as your website.

## Which change goes where

| Change | Ships by | Store review |
|---|---|---|
| UI, copy, styles, web logic | Signed OTA bundle with a staged rollout | No |
| Data, or a correction to bundled data | Sync: a new row with a higher sequence number | No |
| A new data shape for a read-only bucket | OTA bundle plus sync (bump the bucket's schema) | No |
| A new native capability | Bridge schema change, then a host release | Yes |
| A new top-level feature area or route | App release, because the OTA must not change the app's purpose | Yes |

## What an update does

1. The phone fetches a small **pointer** that names the live release and the rollout percentage.
2. It downloads the **manifest** and its signature, and verifies them in a fixed order.
3. It downloads only the **files whose hash changed**, and checks each one.
4. The new bundle waits as **pending**. It never replaces the UI in the middle of a session.
5. On the next launch it runs as a **trial**. Your web app calls `ready()` after its first meaningful paint, and that call **commits** the update.
6. If the app dies, or `ready()` does not arrive within 15 seconds of foreground time, the phone goes back to the last good bundle. A second failure marks the bundle bad on that phone.

The bundle built into the app is always the final fallback. Details are in the [update protocol](/docs/reference/update-protocol/).

## What keeps it safe

- **Signatures.** Every manifest is signed with Ed25519, and the public key is compiled into the host. While the signing key stays private, a compromised CDN cannot serve code the phone will accept.
- **Hashes.** Every file is checked against the hash and size in the signed manifest.
- **A fixed check order.** Signature, `appId`, `seq`, floor, `requires`, path, hash and size fields, then each file.
- **A locked bridge.** The bridge answers only pages the app's own server delivered, using a per-launch nonce, and decodes every message strictly.
- **Atomic state.** The update state is written to a temporary file and renamed, so a crash never leaves it half written.

## Rolling back

Rolling back means rolling forward. Release the last good commit again: it gets a new, higher `seq`, so every phone moves forward to it. Pointing the channel at an older `seq` only cancels downloads that are pending. See [Releasing](/docs/guides/releasing/#roll-back).

## Where to go next

- [Quick start](/docs/getting-started/quick-start/)
- [Web app guide](/docs/guides/web-app/)
- [Data and sync](/docs/guides/data-and-sync/)
