---
title: Data and sync guide
description: How Valence keeps data in native SQLite, seeds it from the app, pulls changes by sequence number, and pushes local edits with an outbox.
sidebar:
  order: 4
---

Valence stores data in native SQLite behind the bridge, not in the WebView. That is what makes the first launch work in airplane mode, and what lets a correction to bundled data ship without an app release.

## The model

Data is organised into **buckets**: named collections of key-value rows. Each row has a string key, a JSON value, and an **update sequence number** (`usn`) assigned by the server. A higher `usn` means a newer row.

```sql
CREATE TABLE kv (bucket TEXT NOT NULL, schema INTEGER NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
                 usn INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (bucket, schema, key)) WITHOUT ROWID;
CREATE TABLE bucket (name TEXT NOT NULL, schema INTEGER NOT NULL, max_usn INTEGER NOT NULL, synced_at INTEGER,
                     PRIMARY KEY (name, schema));
CREATE TABLE outbox (id TEXT PRIMARY KEY, bucket TEXT NOT NULL, key TEXT NOT NULL, value TEXT,
                     deleted INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE prefs (key TEXT PRIMARY KEY, value TEXT NOT NULL);
```

The database uses WAL mode with a 5-second busy timeout, and migrations are append-only.

There are two kinds of bucket:

| Kind | In config | Schema | Written by |
|---|---|---|---|
| **Read-only** | Listed in `data` with a schema number | May change, per version | The server |
| **Writable** | Listed in `writable` | Always `1`, never changes | The user, then pushed to the server |

A bucket cannot be both. `valence` refuses a config that lists a bucket in `data` and `writable`.

```json
{
  "data": { "schedule": 2 },
  "writable": ["notes"]
}
```

## Seed the first launch

The app ships with `seed.db`, so every screen has data before the phone has ever been online. Apple guideline 4.2.3(ii) asks you to disclose the size and prompt users if an app needs a download to work on first launch. A seed avoids the download altogether.

Write one JSON file per bucket, named after the bucket:

```json
{
  "schema": 2,
  "rows": [
    { "k": "day-1", "v": { "sessions": [] }, "u": 1240, "d": 0 },
    { "k": "day-2", "v": { "sessions": [] }, "u": 1239, "d": 0 }
  ]
}
```

Each row needs a string `k`, a value `v`, an integer `u` of at least 1, and an optional tombstone flag `d`. Then build the seed:

```sh
node valence/valence.mjs seed --from ./seed-data
```

- The schema in each file must equal the bucket's number in `valence.config.json` `data`.
- The build is **atomic**: on any error the previous `seed.db` stays untouched.
- A bucket in `data` with no seed file produces a warning. It stays empty until the first online sync.

On first launch, and after a host upgrade, the host attaches the seed and copies the rows whose `usn` is above the local `max_usn` for each `(bucket, schema)` pair.

## Pull: everything after update 1234

```
GET {SYNC_BASE}/{bucket}?since={max_usn}&schema={n}&limit=500
```

```json
{
  "bucket": "schedule",
  "schema": 2,
  "rows": [{ "k": "day-1", "v": { "sessions": [] }, "u": 1241, "d": 0 }],
  "max": 1242,
  "more": false
}
```

- Rows arrive in ascending `usn` order.
- The host applies each page in **one transaction**, moves `max_usn` to the last row's `u`, and loops while `more` is true. A dropped connection never leaves half a page.
- A row with `d: 1` is a tombstone, so the host marks it deleted. `max_usn` only moves forward.
- Rows whose key has pending outbox entries are skipped: the local write wins until the server acknowledges it.
- **A correction to bundled data is just a row with a higher `usn`.** There is no separate patch system.

Private buckets send `Authorization: Bearer <token>`.

### No backend: static chunks

For public, read-only buckets you can skip the server. Publish `{SYNC_BASE}/{bucket}/v{schema}/index.json`:

```json
[{ "from": 1, "to": 500, "file": "c-0001.json.gz" }, { "from": 501, "to": 1242, "file": "c-0002.json.gz" }]
```

Each chunk has the same `rows` shape as a pull response. The host fetches only the chunks whose `to` is above its `max_usn`.

## Push: local-first writes

`data.put` writes the `kv` row immediately with `usn = -1` and adds an `outbox` row, **in one transaction**. The UI sees its own write at once, online or not.

```
POST {SYNC_BASE}/{bucket}/push
{"ops": [{"id": "<uuid>", "k": "n1", "v": {"text": "hi"}, "d": 0}]}
```

```json
{"acked": ["<uuid>"], "rows": [{"k": "n1", "v": {"text": "hi"}, "u": 1301, "d": 0}]}
```

- Push is idempotent by op `id`.
- The server assigns the `usn` and echoes the rows back.
- The host deletes the acknowledged outbox rows, then applies the echoed rows, **except for keys that still have outbox entries**. A newer local edit waits for its own acknowledgement.
- The server keeps the **last write per key**, in arrival order. There are no CRDTs. If your app needs collaborative editing, that is a different product.
- Push is only for user-scoped, writable buckets.

## Schema versions and the UI

A read-only bucket is stored per `(bucket, schema)`. A schema change never rewrites rows in place, so a UI and its data move together.

- Before an update can become pending, the updater pulls every `(bucket, schema)` pair listed in the manifest's `requires.data` that the device does not have yet, from `since = 0`. If the phone is offline, the update waits.
- The bridge resolves `data.get(bucket, ...)` against the schema the **active bundle** requires. A trial that fails and reverts therefore still has the data its old UI expects.
- Old pairs are deleted by garbage collection only once no kept manifest requires them.
- Your server must keep serving every schema version that a live bundle still requires.

To change a read-only bucket's shape: bump its number in `data`, publish the new rows at the new schema, and release a bundle that reads them. Writable buckets cannot change schema. Their JSON may only gain optional fields, and the server migrates on read.

## When sync runs

On UI start, on resume, when connectivity returns, when the web app calls `sync.now`, and periodically in the background. Only **one sync runs at a time**, across the UI and background isolates. A lease row in `prefs` guards it: it is held for at most 2 minutes, renewed after every applied page, and a lease timestamp in the future counts as expired. On resume, the host compares each bucket's `max_usn` with what the page last saw and emits `sync.changed` for the buckets that moved.

## Next

- [Releasing](/docs/guides/releasing/)
- [Configuration reference](/docs/reference/config/)
