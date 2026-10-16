---
title: Beta status
description: What is stable in Valence 0.3, what may still change before 1.0, what has not been proven yet, and how to report a problem or a vulnerability.
sidebar:
  order: 3
---

Valence is in beta. It is usable today, and the parts that protect your users are designed not to move. Other parts will change as the first apps run on it. This page says which is which, so you can decide what to build on.

## Designed to stay stable

These follow an additive-only rule: fields and methods can be added, but an existing one never changes its meaning. A breaking change would get a new `format` number or a new method name instead.

- **The bundle format** (`format: 1`): the pointer, the signed manifest and the content-addressed files. See [Bundle format](/docs/reference/manifest/).
- **The check order** a phone uses to verify a bundle: signature, `appId`, `seq`, floor, `requires`, path, hash and size fields, then each file.
- **The update protocol**: pending, trial, `ready()` to commit, two failures to mark a bundle bad, rollback by rolling forward. See [Update protocol](/docs/reference/update-protocol/).
- **The bridge schema rules**: once a store build ships a method, event or type, it cannot change or disappear; new ones need a higher `since`.

## May still change before 1.0

- **CLI commands and flags** of `valence.mjs` and the `create-valence` wizard.
- **Config fields** in `valence.config.json`, beyond the ones documented today.
- **How the Flutter host is delivered.** Today `/valence init` generates the host runtime into your app against the spec. The plan is to move it into a `valence` pub package and `client.ts` into an `@valence/bridge` npm package. Expect a migration step when that happens.
- **The docs**, as real apps find gaps.

## Not proven yet

- **No production app runs on Valence yet.** The CLI, the spec, code generation and the TypeScript client are covered by tests, and the host is generated against a test matrix, but nothing beats real users on real phones.
- **App review.** The store rules Valence follows are quoted in the [store policy guide](/docs/guides/store-policy/), but reviewers judge each app. No tool can promise approval.

If you ship with Valence during the beta, start every release at a small rollout, and keep a store build ready as your fallback plan.

## Report a problem

- **Bugs, unclear docs and missing features:** [open an issue](https://github.com/Bishal-Pahari/valence/issues/new). Include your `valence version`, your web framework and what you expected.
- **Security issues:** do not open a public issue. Use the private reporting described in the repository's `SECURITY.md`.

## What happens at 1.0

1.0 means a reference app has shipped through both stores on Valence, the host runtime is a versioned package, and the CLI and config are frozen under the same additive-only rule as the bundle format.
