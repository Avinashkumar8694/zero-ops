# Manual Task

Marker step for an external or offline manual activity.

## What This Node Does
Represents work that happens outside the engine. Unlike a user task, it does not model a formal in-engine worklist form.

## Properties
- `instruction`: Guidance for the operator or external team.

## Example
```json
{
  "instruction": "Perform physical document verification and continue once the compliance desk confirms completion."
}
```

## Validation Notes
- Keep instructions precise because this node relies on human understanding more than system-enforced structure.
