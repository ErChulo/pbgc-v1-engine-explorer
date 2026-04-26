# Folder Architecture

The repository separates application source code, Excel/VBA extraction tools, domain documentation, sample data, generated outputs, and legacy prototypes.

## Rule

```text
Can a user run it?             -> scripts/
Is it application logic?       -> src/
Is it VBA/Excel tooling?       -> tools/
Is it explanation?             -> docs/
Is it private data?            -> data/private/
Is it sample sanitized data?   -> data/samples/
Is it generated?               -> output/
Is it old but useful?          -> legacy/
```
