# ReVideeo Documentation

> Version: 0.3.0 — Public APIs, Auto Captions with Whisper, Juicer Migration

## Navigation

| Topic | Entry Point |
|-------|-------------|
| [Architecture](ARCHITECTURE.md) | System overview, module boundaries, rendering pipelines |
| [Public API](API.md) | Frame API, Media API, Timeline API, Media Processing, Permissions |
| [Testing](TESTING.md) | Unit tests, regression, manual smoke testing, release gate |
| [Plugin Development](plugin-api/en/README.md) | Plugin manifest, lifecycle, API reference, examples |
| [User Documentation](user-docs/README.md) | Editor, timeline, media, export, settings, shortcuts |
| [AI / Internal Docs](ai-docs/00-index.md) | Juicer, actions, composition, storage, JSON structures |
| [Clean Room](clean-room/CLEAN_ROOM_SPEC.md) | EUPL clean room audit trail for `@revideeo/core` |

## Quick Reference

### For Plugin Developers

Start with the [Plugin API Overview](plugin-api/en/README.md) and the [Permissions Reference](api/permissions.md). The plugin system exposes APIs via `PluginContext` with permission-gated sub-APIs.

### For Contributors

Start with [Architecture](ARCHITECTURE.md) for system boundaries and [Testing](TESTING.md) for validation requirements.

### For End Users

Start with [User Documentation](user-docs/README.md) for editor features, timeline, media management, and export.
