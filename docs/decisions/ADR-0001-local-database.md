# ADR-0001: Local Database

## Decision

Use Dexie.js / IndexedDB as the initial local browser database.

## Rationale

The app is browser-first, should work without a server, and must preserve processed engine artifacts locally.

## Consequence

Application code should use an engine repository abstraction rather than direct Dexie calls everywhere.
