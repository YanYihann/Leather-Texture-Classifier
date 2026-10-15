---
name: LeatherMind / 革识
description: Photographic leather classification and reference comparison in an aubergine material museum.
colors:
  background: "#19151d"
  sidebar: "#211b26"
  surface: "#251f2b"
  surface-raised: "#302836"
  ink: "#f1eef3"
  muted: "#b0a8b7"
  subtle: "#958c9d"
  line: "#44394e"
  accent: "#dbe68a"
  on-accent: "#20251b"
  selection: "#343729"
  danger: "#ffa6ab"
  danger-surface: "#512e39"
  on-image: "#fff8f0"
  image-shade: "#171017"
  overlay: "#100b16bf"
  light-background: "#f5f2f6"
  light-sidebar: "#e9e3ed"
  light-surface: "#fcf9fd"
  light-surface-raised: "#e7e0eb"
  light-ink: "#261e2d"
  light-muted: "#62586e"
  light-subtle: "#746980"
  light-line: "#cfc3d8"
  light-accent: "#485521"
  light-on-accent: "#f5f8e8"
  light-selection: "#e4e9cc"
  light-danger: "#9d253d"
  light-danger-surface: "#f9e1e5"
typography:
  display:
    fontFamily: "Barlow Condensed, Microsoft YaHei, sans-serif"
    fontSize: "clamp(72px, 6.1vw, 96px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-.018em"
  headline:
    fontFamily: "Manrope Variable, Microsoft YaHei, sans-serif"
    fontSize: "clamp(30px, 3vw, 44px)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.03em"
  title:
    fontFamily: "Manrope Variable, Microsoft YaHei, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope Variable, Microsoft YaHei, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Manrope Variable, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.65
  confidence:
    fontFamily: "Barlow Condensed, Microsoft YaHei, sans-serif"
    fontSize: "56px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  image-stage: "2px"
  material-image: "3px"
  thumbnail: "4px"
  option: "6px"
  icon-button: "7px"
  control: "8px"
  panel: "12px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
  space-16: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  nav-item:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "12px"
  nav-item-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.accent}"
  search-input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
  workspace-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "24px"
  filter-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.accent}"
    rounded: "{rounded.option}"
    padding: "8px 16px"
---

# Design System: LeatherMind / 革识

## Overview

**Creative North Star: "The Photographic Material Museum"**

Aubergine surfaces and porcelain text create a quiet field for leather photography; citron identifies actions, active selections and confidence. Large condensed display lettering gives the material study visual weight, while the research workbench uses compact, direct labels and clear image/result relationships. English and dark appearance are the initial defaults; Chinese and light appearance retain the same hierarchy.

The approved replacement world keeps photography central and pairs it with accessible task controls. The illustrative macro is presented as an illustrative material study; actual reference specimens retain their dataset identifiers. Spring-driven pointer pan, specimen crossfades and optional sequence playback support inspection. The sequence starts paused, and reduced motion removes pan, playback and CSS animation.

**Key Characteristics:**

- Photographic materials on aubergine or porcelain fields.
- Citron action and selection hierarchy with direct academic language.
- Condensed display lettering and compact sans-serif task typography.
- Fixed desktop left navigation and a collapsible mobile left drawer.
- Purposeful inspection motion with user-controlled playback.

This record was extracted from `src/index.css`, `src/App.tsx` and the browser inference services after implementation. The approved direction and its explicitly changed regions are recorded in `.impeccable/surface-contract.md`. Screenshots under `.impeccable/review/` cover desktop widths 1280, 1440 and 1920, mobile width 390, Chinese, light theme, archive, history and classification. The original-comp automatic workflow remains incomplete at `spec`: no measured reproduction specification, hero/final pixel diff or automated comp-gate pass is claimed. `.impeccable/manual-acceptance.md` and `DEPLOYMENT.md` provide acceptance and deployment evidence; this design record does not replace those review artifacts.

## Colors

The interface combines muted purple-black neutrals with a pale citron accent; warm browns and burgundy shadows come from the material photographs.

### Primary

- **Citron** (`accent`): upload actions, the emphasized classification word, selected candidates, active navigation, focus outlines and positive model availability.
- **Citron foreground** (`on-accent`): readable text on filled actions and native text selection.
- **Olive selection** (`selection`): subdued selected navigation, candidate and filter backgrounds.

### Neutral

- **Aubergine ground** (`background`): page field and image-preview ground.
- **Rail aubergine** (`sidebar`): continuous left navigation field.
- **Material panel** (`surface`) and **raised aubergine** (`surface-raised`): workspaces, empty states and hover feedback.
- **Porcelain ink** (`ink`): headings and main labels; **muted lavender** (`muted`): explanatory text; **subtle lavender** (`subtle`): secondary status and breadcrumb details.
- **Plum line** (`line`): rail, toolbar and record separators, control borders and upload bounds.
- **Image porcelain** (`on-image`), **image plum** (`image-shade`) and **transparent plum overlay** (`overlay`): photo controls, caption legibility and dialog backdrops. These roles persist across appearance modes.
- **Rose danger** (`danger`) and **burgundy danger surface** (`danger-surface`): destructive actions with a confirmation dialog.
- **Light appearance**: all `light-*` tokens map to the corresponding unprefixed role when the root has `data-theme='light'`. Its primary becomes olive; the photo-specific colors retain their dark-photo behavior.

**The Action and Evidence Rule.** Accent color marks interactive state and model confidence; photographic color never supplies a confidence signal.

## Typography

**Display Font:** self-hosted Barlow Condensed, with Microsoft YaHei and sans-serif fallbacks.

**Body Font:** self-hosted Manrope Variable, with Microsoft YaHei and sans-serif fallbacks.

**Character:** a dense, condensed display face gives the overview immediate impact; Manrope maintains compact task hierarchy. Chinese uses its specified fallback with a separate size and line-height treatment.

### Hierarchy

- **Display**: the `display` frontmatter role is the desktop English overview title. Chinese uses `clamp(48px, 5.3vw, 76px)` at line-height 1.18. Responsive English sizing is 72px below 1200, 80px below 960, `clamp(60px, 14vw, 88px)` below 700 and 112px from 1700; mobile Chinese is 48px.
- **Headline**: the `headline` role is the classification, archive, history and preferences page title; mobile uses 30px.
- **Title**: section titles use `title`; smaller workbench panel headings use 16px, and ordinary third-level headings use 18px.
- **Body**: the base `body` role supports an observed supporting-copy range of 11–15px. Overview description uses 15px / 1.85 and 42ch, then 16px on wide screens and 13px / 1.8 on mobile. Page descriptions use 13px and 70ch; workflow descriptions use 12px and 35ch.
- **Label**: navigation uses `label`; button labels use 13px / 600, while task metadata uses 10–12px. Secondary labels remain functional descriptors.
- **Confidence**: the `confidence` role presents the highest-ranked percentage, with a 30px percent symbol. Candidate lists and record values use tabular numerals for comparison.

**The Direct Terminology Rule.** Titles and labels describe classification, candidates, specimens and records directly, in the selected language.

## Layout

The main shell offsets a fixed left rail. The implemented default rail is 224px; this is the shipped value rather than the surface contract's provisional 220px. Its widths become 248px at 1700 and above, 200px below 1200, 184px below 960 and a 224px off-canvas drawer below 700. The default topbar is 76px; mobile uses 64px. Main content is capped at 1800px, with 40px default padding, 64px wide-desktop horizontal padding, 32px below 1200, 24px below 960 and 24px 20px below 700.

The overview hero uses `.88fr / 1.12fr` columns, a 32px gap and a 640px minimum section height. Its photo stage uses `clamp(430px, 39vw, 600px)`, then 470px below 1200, 400px below 960 and 380px below 700. Below 960, copy and photograph stack; desktop title line breaks adapt to that available width. The photo exceeds its stage by 36px in each dimension so pointer pan exposes no uncovered edge.

Classification uses `1.1fr / .9fr` input/results columns with a 32px gap, narrowing to 20px below 1200 and stacking below 960. Upload bounds use a 4:3 aspect ratio and a 360px minimum height, adapted to 320px below 1200 and 340px on mobile. Panels use 24px padding, then 20px below 1200 and 16px on mobile. Analysis actions wrap below 1200, return to a shared row when panels stack below 960, and wrap again on mobile.

Featured materials use four columns and become two below 960. The archive uses three columns, becomes two below 960 and keeps two on mobile. Archive image proportions move from 1.5 to square below 700; the other material cards use 1.35. Archive pages contain 12 specimens. Mobile search occupies a full toolbar row. History records wrap their confidence and actions while keeping the specimen, selection control and note input visible.

Spacing uses the frontmatter's four-pixel rhythm. Workflow sections add an observed 80px separation on desktop and 48px on mobile. Dialogs are bounded by viewport width and height; enlarged photography uses a maximum width of 1100px with a contained image. The document floor is 320px, and horizontal overflow is clipped at the document boundary; content must still reflow inside its own layout.

**The Left Workbench Rule.** Desktop navigation remains a visible left rail; narrow screens recover content width through the same navigation in a left drawer.

## Elevation & Depth

The shipped system uses tonal layering, fine separators and photography rather than box shadows. Panels are distinguished by surface color; an overlay darkens modal and drawer surroundings. Photo captions use a transparent-to-image-shade gradient to preserve legibility. Stacking is explicit: header 10, drawer backdrop 20, sidebar 30, and skip link 100; native modal dialogs use the browser's top layer.

**The Material Depth Rule.** Let the photographic fold carry physical depth; interface depth comes from surface tones, containment and overlays.

## Shapes

Photography has crisp, barely softened edges (`image-stage` and `material-image`); thumbnails and image overlays use the small radius roles. Buttons, navigation, fields and segmented filters use the control radius. Workbench panels, record containers, empty states and dialogs use the panel radius. One-pixel lines and a dashed upload boundary define containment. Candidate options and segment selections use the option radius. Status dots and the small navigation activity mark are circular.

## Components

### Buttons

Filled citron primary, outlined secondary and rose/burgundy destructive actions share a 48px minimum height and the frontmatter padding. Primary hover lifts 2px; active press moves 1px. Secondary hover adopts the raised surface. Disabled buttons use opacity .42, a not-allowed cursor and no transform. Icon buttons are 44px squares with a 7px radius; text actions have a 44px minimum height. Every interactive focus uses a 2px accent outline with 4px offset. Responsive size exceptions are grounded in `src/index.css`; they are not a mandate to shrink future controls.

### Filters and Candidate Options

The segmented archive filter uses a surface container with 4px padding; selected segments use the `filter-selected` role. Segments are 40px minimum height. Candidate rows use 48px minimum height, 8px 12px padding and the selected olive/citron relationship. `aria-pressed` describes the active filter, candidate, specimen thumbnail and favorite state. Selecting a candidate updates the reference comparison without changing the highest-ranked result summary.

### Cards / Containers

Workbench panels use `workspace-panel`; their result counterpart starts at a 555px minimum height on desktop and removes that minimum below 960. Material cards are image-led with compact metadata below the image rather than a filled enclosing card. Image hover and keyboard focus scale the photo to 1.035 over .45s and reveal the enlargement control. Favorites remain beside the dataset identifier, with filled citron star feedback. History containers use 20px 24px padding and become 16px on narrower screens.

### Inputs / Fields

Search fields use a surface fill, one-pixel line border, 48px minimum height and a visibly associated or visually hidden label. Native select controls retain their affordance with a 44px minimum height. Carets and checkbox/range accents use citron. History notes use a line-only input, a 300-character limit and save on blur; Enter triggers blur. Failure feedback uses a dismissible `role='alert'` notice rather than invented inline validation states.

### Navigation

Overview, Classification, Material archive, Scan history and Preferences are hash links with `aria-current='page'`. The selected link combines olive fill, citron text and a small activity mark. Default links use muted text; hover uses a raised surface and main ink. Below 700, the menu button toggles the left drawer with `aria-expanded`; navigation selection and the backdrop close it. A skip link targets main content. View changes reset scroll and focus the page heading. Language and appearance controls persist the visitor's selection locally.

### Photographic Material Study

The hero opens with the illustrative macro; captions distinguish it from dataset references. Previous/next controls cycle specimens and three thumbnails provide direct selection. Enlargement uses a native modal dialog. Mouse pointer inspection pans up to 11px either side through springs with stiffness 80 and damping 24. Specimen replacement crossfades over .45s. Optional sequence playback changes the active specimen every 5500ms and begins paused. Reduced motion suppresses pointer pan, sequence playback and CSS movement, while replacement opacity uses .12s. CSS reduced-motion handling removes transform feedback and leaves the scan indicator stationary.

### Classification Workbench and Records

Upload, drag/drop and camera capture feed the input panel; image previews contain the full input rather than cropping it. The result panel exposes the highest-ranked class, model confidence, three candidates, input/reference comparison and JSON export. Its polite live region announces changes. Download, initialization and inference have distinct status copy; download progress uses actual received bytes. Cancellation aborts the request and terminates the browser worker. Leaving classification stops camera tracks and cancels analysis. Failures remain actionable notices and do not fabricate successful results.

The default service path runs the approved float32 ResNet50 ONNX model in a worker on the visitor's device, independent of a production inference API. The first classification loads 95,614,159 model bytes plus the WASM runtime; CacheStorage retains the model when permitted. The status describes on-device inference. Local history retains at most 30 records, supports notes, search, sorting, selection, deletion confirmation and JSON export, and reports quota failure. Optional server mode remains a separately selected deployment configuration. Dataset labels are reference identifiers, and percentages are model confidence rather than validated accuracy.

Shipping photo provenance covers 408/408 raster assets: two illustrative macro sizes and full-size/thumbnail references for 203 dataset classes. `.impeccable/review/provenance.txt` reports 408 rasters with zero missing metadata. `scripts/embed-provenance.cjs` records the hero generation prompt and per-reference original dataset path in raster metadata. Source references remain under `src/data/materials.json`; generated imagery must keep its illustrative caption and must not be presented as a dataset specimen.

## Do's and Don'ts

### Do:

- **Do** use the existing semantic color roles across both appearance modes.
- **Do** keep direct academic terminology and language-specific title sizing.
- **Do** preserve real photographic specimens and their dataset identifiers.
- **Do** retain the left workbench navigation and the documented responsive reflow.
- **Do** pair motion with inspection or process feedback and honor reduced motion.
- **Do** keep provenance captions, measured loading progress and honest confidence labels.

### Don't:

- **Don't** substitute decorative graphics for the material photographs.
- **Don't** present illustrative imagery as dataset evidence or confidence as validated accuracy.
- **Don't** restore the superseded horizontal navigation and metaphorical default headline.
- **Don't** turn unused CSS selectors or redundant eyebrows into reusable visual rules.
- **Don't** report the incomplete original-comp automatic gate as a passed pixel comparison.
