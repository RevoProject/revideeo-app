<!--
  Copyright (c) 2026 iTVT Poland Group / ReVideeo Authors
  Licensed under the European Union Public Licence v1.2 (EUPL-1.2)
  See LICENSE file in the project root for full license information.
-->

# Group Actions

## groupClips

Group selected clips together. Grouped clips move and select as one.

```json
{
  "_action": "groupClips",
  "_description": "Group selected clips together",
  "_note": "Requires 2+ clips selected"
}
```

---

## ungroupClips

Remove grouping from selected clips.

```json
{
  "_action": "ungroupClips",
  "_description": "Remove grouping from selected clips",
  "_note": "Only works on grouped clips"
}
```

---

## joinClips

Join adjacent split clips (same source, consecutive frames) back into one.

```json
{
  "_action": "joinClips",
  "_description": "Join adjacent split clips back into one",
  "_note": "Requires 2+ adjacent clips selected from same source"
}
```
