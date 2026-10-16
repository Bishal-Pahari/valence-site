---
title: Update protocol
description: The host update algorithm and the activation state machine that tries a new bundle as a trial, commits it on ready(), and rolls back on failure.
sidebar:
  order: 4
---

This page is the behaviour every host must implement. It is the normative description of how a phone takes an update and how it recovers from a bad one.

## Host update algorithm

Run it on UI start, on resume and every 30 minutes in the foreground. **Never block the first paint on it.**

1. **Fetch the pointer** (5 second timeout) and decode it strictly.
   - If `pointer.seq < state.pending`, drop `pending`: the release was pulled.
   - If `pointer.seq <= current`, or it is in `bad`, or `pointer.seq <= state.pending`, stop.
2. **Rollout gate.** `fnv1a32(installId + ":" + seq) % 100 < rollout`. If it fails, stop. `installId` is a random UUID created on first launch. Never use a device id.
3. **Fetch** `manifests/<seq>.json` (at most 1 MB) and its `.sig`.
4. **Run checks 1 to 6** of the [canonical order](/docs/reference/manifest/#canonical-check-order). Any failure means stop and log. Never retry the same `seq` within the run.
5. **Check the total size.** If the files not already in the content-addressed store add up to more than the app's cap (default 50 MB), stop.
6. **Download each missing file** to a temporary name, verify its sha256 and size (check 7), then rename it to `cas/<hash>`.
7. **Data requirements.** Make sure every `requires.data` pair has been synced at least once. If the phone is offline, stop: the bundle is not pending until its data is there.
8. **Make it pending.** Write the manifest and signature, and set `state.pending = seq`. If `urgent` is set, emit `bundle.updateReady`; the web app may then call `bundle.applyUpdate`, which reloads the UI. Otherwise the bundle applies at the next UI start.

## State file

State lives in `<appSupport>/valence/state.json`. Writes are atomic: write a temporary file, flush, then rename.

```json
{ "installId": "…", "port": 23817, "current": 42, "previous": 41, "pending": 43, "trial": null, "trialFails": 0, "serving": null, "bad": [39], "floor": 40 }
```

| Field | Meaning |
|---|---|
| `current` | The last committed bundle. |
| `previous` | The bundle before it. |
| `pending` | Downloaded and verified, waiting for the next UI start. |
| `trial` | Being tried, not yet confirmed. |
| `trialFails` | How many times the trial has failed. |
| `serving` | The trial's `seq` while it is on screen and unconfirmed, otherwise `null`. |
| `bad` | Bundles marked bad on this phone. |
| `floor` | The high-water mark. It never goes down. |

## State machine

Transitions run when the host widget is about to load a bundle (UI start), **never in `main()` or a background isolate**. iOS background launches and workmanager runs must not consume a trial.

At UI start:

1. **A newer built-in bundle wins.** If the built-in bundle's `seq` is above `current` (a store update shipped it), install it through the same checks, skipping check 3. Set `previous = current` and `current = builtin`, and drop `pending` and `trial` if they are at or below it.
2. **A crashed trial.** If `serving == trial`, the last UI start showed the trial and the process died before it was confirmed. Count a failure.
3. **No trial but a pending bundle:** set `trial = pending`, clear `pending` and reset `trialFails` to 0.
4. **Serve.** If there is a trial, serve it and set `serving = trial`. Otherwise serve `current`, or the built-in bundle if there is none.

### Counting a failure

A failure is counted in exactly one place, from step 2 or from a ready timeout:

- increment `trialFails` and set `serving = null`;
- if `trialFails` reaches **2**, add the trial to `bad` and clear `trial` and `trialFails`;
- otherwise keep the trial, so the next UI start tries it once more. One failure can be a user who opened and closed the app at once.

### The ready timer

- It counts **15 seconds of foreground time**, starting at the entry page's `onPageStarted`, and pauses while the app is in the background.
- It commits **only if `app.ready()` comes from the page serving the trial**. A `ready()` from a `current` page never commits anything.
- **On commit:** `previous = current`, `current = trial`, `trial = null`, `trialFails = 0`, `serving = null`, `floor = max(floor, manifest.floor)`, then run garbage collection.
- **On timeout:** count a failure, then reload `current` right away.

### Garbage collection

It runs only after a commit.

- **Keep** the manifests for `current`, `previous`, `pending`, `trial` and the built-in bundle, with every file they reference.
- **Delete** every other manifest and file.
- **Delete** each `(bucket, schema)` pair no kept manifest requires. Writable buckets are never deleted this way.

## Rollback

Rolling back means rolling forward. Release the last good commit with `valence bundle` so it gets a new, higher `seq`, then point the channel at it. Pointing the channel at an older `seq` only cancels pending downloads, as in step 1 of the algorithm. Phones still trying a bad bundle revert on their own.

## Backups

Exclude all of `<appSupport>/valence/` from device backups, so a restore starts clean from the built-in bundle with a new `installId`. The SQLite database lives outside it and is backed up.
