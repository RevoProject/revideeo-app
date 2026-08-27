# Proposed Server Repository Documentation Structure

> This is a proposal only. The server repository is a separate repository and must not be modified from the main repo.

## Proposed Structure

```
server/
├── README.md
├── ARCHITECTURE.md
├── TESTING.md
│
├── api/
│   ├── health.md
│   ├── process.md
│   └── juicer.md
│
├── plugins/
│   ├── lifecycle.md
│   └── whisper-runtime.md
│
└── runtime/
    ├── installation.md
    ├── python.md
    ├── whisper.md
    └── ffmpeg.md
```

## Coverage Areas

### README.md
- Server overview, setup instructions, dependencies

### ARCHITECTURE.md
- Express server structure, module responsibilities, API routes

### API Documentation
- `health.md` — GET /api/health endpoint
- `process.md` — POST /api/process endpoint, processor registry, file handling
- `juicer.md` — AI provider integration, prompt templates

### Plugin System
- `lifecycle.md` — Marketplace installation lifecycle, user approval, preflight checks
- `whisper-runtime.md` — Whisper-specific installer: preflight, venv creation, pip install, verification

### Runtime
- `installation.md` — How to install server dependencies
- `python.md` — Python runtime requirements and venv management
- `whisper.md` — openai-whisper installation, model download, CLI verification
- `ffmpeg.md` — ffmpeg availability check, audio extraction

### Key Topics to Document
- Plugin runtime lifecycle (not-installed → installing → ready → error)
- Marketplace installation flow (client request → approval → install → verify)
- Preflight validation (disk space, Python, ffmpeg)
- Isolated virtual environments (`plugin-runtime/{pluginId}/venv/`)
- PyTorch CPU runtime installation
- Whisper lazy model download (72MB tiny, larger models on first use)
- Local-only processing (no external API calls)
- Temporary file cleanup (`try/finally` with `fs.rm`)
- Structured error responses (`MediaProcessingResult` ok/error format)
- Concurrent request handling (unique temp dirs via `randomUUID`)
