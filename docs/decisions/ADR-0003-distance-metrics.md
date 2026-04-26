# ADR-0003: Distance Metrics

## Decision

Engine similarity should be computed from multiple feature families:

- worksheet structure
- formula signatures
- function-call distribution
- named-range usage
- dependency graph topology
- entitlement / benefit-processing concepts where available

## Consequence

Do not define similarity from one scalar alone. Build a weighted feature vector and expose the weights.
