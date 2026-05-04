# echelon — Roadmap

## Milestones

- Eval v2: `eval-v2.md`
- MVP runtime: debugging-first local CLI and benchmark engine
- Adaptive routing loop: failed-path memory, transition triggers, drift detection
- First proof report: routed policy vs simple baselines on debugging-v1

## Dependencies

- blinded dataset contract
- debugging-world schema and synthetic case set
- executable baseline policies
- trace schema and telemetry
- benchmark runner and report output

## Risks

- routed policy ties simple heuristics instead of clearly beating them
- synthetic worlds may be too easy or too artificial
- label-match progress may outpace real outcome gains
- framework drift may outrun benchmark discipline
