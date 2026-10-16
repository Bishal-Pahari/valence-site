---
title: Bundle format
description: The static OTA host layout, the unsigned pointer, the signed manifest fields and the canonical order in which a phone verifies a bundle.
sidebar:
  order: 3
---

A release is a set of immutable files on any static host, plus one small pointer that says which release is live.

## Static host layout

```
<OTA_BASE>/<appId>/channels/<channel>.json     pointer      Cache-Control: max-age=60
<OTA_BASE>/<appId>/manifests/<seq>.json        manifest     immutable
<OTA_BASE>/<appId>/manifests/<seq>.json.sig    signature    immutable
<OTA_BASE>/<appId>/files/<sha256-hex>          file bytes   immutable, content-addressed
```

Upload order: **files, then manifests, then the pointer last.**

## The pointer

```json
{ "seq": 43, "rollout": 10 }
```

The pointer is unsigned, so the rollout can change without re-signing. Hosts decode it strictly: `seq` must be an integer of at least 1 and `rollout` an integer from 0 to 100. Anything else means "no update".

An attacker who controls the CDN can freeze phones on their current bundle, by never advancing the pointer, and can change who is in the rollout. They cannot serve unsigned code, change any signed field, push a phone below its floor or serve a manifest under a different `seq`.

## The manifest

```json
{
  "format": 1,
  "appId": "com.example.app",
  "seq": 43,
  "version": "2026.10.15+43",
  "floor": 40,
  "requires": { "bridge": 3, "data": { "schedule": 2 } },
  "entry": "index.html",
  "csp": "default-src 'self'; script-src 'self' 'sha256-…'; … frame-src 'none'; object-src 'none'",
  "urgent": false,
  "routes": ["/", "/schedule", "/settings"],
  "files": { "index.html": { "h": "<64 lowercase hex>", "n": 1834 } },
  "createdAt": "2026-10-15T10:00:00Z",
  "keyId": "k1"
}
```

| Field | Meaning |
|---|---|
| `format` | The manifest format. Currently `1`. New formats get a new number. |
| `appId` | Must equal the host's app id. |
| `seq` | A strictly increasing integer. It is the bundle's identity. |
| `version` | For display only. |
| `floor` | The lowest `seq` a phone may run after committing this bundle. Phones keep a high-water mark that never goes down. Raise it when a release fixes a security bug. |
| `requires.bridge` | The minimum host bridge version. |
| `requires.data` | The `(bucket, schema)` pairs this UI reads. See [Data and sync](/docs/guides/data-and-sync/#schema-versions-and-the-ui). |
| `entry` | The entry page inside `files`. |
| `csp` | The Content-Security-Policy for the entry page: the hashes of its inline scripts, plus `connect-src` from `sync.base` and `web.connect`. The host sends it as a header. |
| `urgent` | When `true`, the host emits `bundle.updateReady` so the web app can apply the update now. |
| `routes` | The top-level routes, compared with the last store-reviewed baseline. |
| `files` | Each path maps to `h` (the sha256 in lowercase hex) and `n` (the size in bytes). |
| `keyId` | Which key in the keyring signed this manifest. |

Each `files` path is a relative POSIX path with no empty, `.` or `..` segment, no leading `/`, no backslash and no NUL character.

## The signature

`<seq>.json.sig` is the base64 Ed25519 signature over the **exact manifest bytes**, with no trailing newline. Hosts trim whitespace anyway. The host embeds a keyring `{keyId: publicKey}` and picks the key by `keyId` with an own-property lookup.

## Canonical check order

Every host and every tool verifies in this order, and any failure stops the update:

1. Ed25519 signature over the exact bytes.
2. `appId`.
3. `seq == pointer.seq`.
4. `seq >= state.floor`.
5. `requires`.
6. Every path, hash and size field is well formed.
7. Each downloaded file's sha256 and size.

`valence verify` runs the checks that apply to a bundle on disk. The host runs all seven during an update, described in the [update protocol](/docs/reference/update-protocol/).
