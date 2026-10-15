# LeatherMind / 革识

<!-- impeccable:product-schema 1 -->

## Platform
web

## Product Purpose
Identify leather textures from an uploaded or captured photograph, compare the three strongest model candidates, and maintain recognition records.

## Capabilities and Constraints
- Existing repository: React 19, TypeScript, Vite, Express, Motion, Lucide, and a Python/PyTorch ResNet50 inference service.
- Existing workflows: image upload, camera capture, Top-3 recognition, reference images, searchable history, notes, deletion, Chinese/English, and light/dark themes.
- The local dataset contains 203 indexed categories. Their identifiers are not established commercial material names.
- Classification confidence is model output, not validated accuracy. Do not reuse the incumbent unsubstantiated 99.2% accuracy claim.
- The user explicitly authorized public browser model deployment on 2026-10-03 after the incumbent Cloudflare inference tunnel failed. Default inference uses unchanged float32 ResNet50 weights exported to ONNX, running in a web worker. Images stay on the visitor's device. Model files are public.
- Default history is local browser storage, bounded to 30 records, with notes, selection, deletion and JSON export. Optional server mode retains the existing Express/PyTorch shared history service.
- Vercel hosts the complete default application, model and WebAssembly runtime at leather.yanyihan.top. A first classification downloads approximately 95.6 MB of model data plus the runtime; CacheStorage retains it when available. No external inference tunnel is required.

## Brand Commitments
The user authorizes a substantial redesign or rebuild without retaining the incumbent visual style. They request smooth interactions and animations and explicit desktop adaptation. Godly.design and Siteinspire are visual references. They approved direction A with a left navigation rail, default English with Chinese/English switching, direct academic terminology instead of metaphorical headlines, and a more visually impactful homepage with appropriate animation.

## Evidence on Hand
The source application, README, classes.json, local model and dataset, and public/images/home.png are available. No independently validated performance benchmark, testimonials, or customer logos were supplied.

## Open Decisions
- User confirmed retaining upload/camera recognition, Top-3 comparison, Chinese/English, theme switching, and history management, with a material archive and desktop workbench on 2026-10-03.
- Audience inferred from the application: leather-material researchers and people comparing leather textures. This has not been separately confirmed.
- The user selected visual mockups before implementation and approved A with explicit structural and copy changes on 2026-10-03.

## Product Principles
Preserve real recognition workflows. Describe model and network failures honestly. Keep material imagery central. Support keyboard use, reduced motion, and responsive desktop/mobile layouts.
