---
name: designer
description: Expert App Store Screenshot Designer Skill with JSON Generation
---

# App Store Designer Skill 🎨

This skill empowers Antigravity to create professional-grade App Store and Play Store screenshot designs, either via the `DesignAPI` or by generating complete **WebScreenshots Pro 3D Project JSONs**.

## 🛠️ Project JSON Specification (v1)

To restore a design, the AI can generate a JSON object with the following structure:

```json
{
  "version": 1,
  "name": "Project Name",
  "screensData": [{ "id": "screen_1", "color": "#ffffff" }],
  "languages": ["en", "es"],
  "currentLanguage": "en",
  "globalBgColor": "#f8fafc",
  "bgMode": "gradient",
  "gradColor1": "#4f46e5",
  "gradColor2": "#7c3aed",
  "gradAngle": 180,
  "imageBank": { "screenshot_1": { "en": "data:image/png;base64,..." } },
  "textBank": { 
    "header_1": { 
      "en": { "text": "Fast & Secure", "fontSize": 52, "fontWeight": "900" }, 
      "es": { "text": "Rápido y Seguro", "fontSize": 48 } 
    } 
  },
  "elements": []
}
```

### 📐 Coordinate System & Geometry
- **Main Canvas**: 3840px x 1000px.
- **Screen Units**: Standard width is 400px, height is 860px.
- **Screen Placement**: Each screen $i$ (0-indexed) starts at $X = 40 + (i \times 440)$, $Y = 100$.
- **Safe Area**: Keep headings at $Y = 150-250$ to avoid overlap with device notches.

### 🎭 Element Dictionary (`elements[]`)

| Property | Description |
| --- | --- |
| `elementType` | One of `text`, `3ddevice`, `freeimage`. |
| `left`, `top` | Position in 3840px canvas. |
| `scaleX`, `scaleY` | Scaling factors (default 1). |
| `textKey` | (For `text`) Mapping to `textBank`. |
| `imageKey` | (For `3ddevice`) Mapping to `imageBank`. |
| `rotX`, `rotY`, `rotZ` | (For `3ddevice`) 3D rotation in PI units (e.g., `-0.2`). |
| `frameColor` | Hex color of the 3D phone frame. |

## 🎨 Color Palettes & Design Principles

- **Contrast**: Use WCAG 2.1 compliant contrast for text over backgrounds.
- **Shadows**: Large headings should use a subtle shadow: `{ color: 'rgba(0,0,0,0.3)', blur: 12, offsetX: 0, offsetY: 4 }`.
- **Typography**: Default is `Inter, sans-serif`. Use `fontWeight: '900'` for impact.

## 🚀 State Generation Workflow

When asked to "build the JSON" or "generate a template":
1. **Define Visual Pillars**: Choose a color palette (e.g., "Deep Midnight with Neon Blue").
2. **Setup Screens**: Calculate $X$ positions for the required number of screens (e.g., Screen 1: 40, Screen 2: 480).
3. **Map the Bank**: Create keys for text and images to allow for localization.
4. **Assemble Elements**: Coordinate headings and 3D device tilts to create a visual flow across screens.

---

## 🤖 AI Instructions

- **No Placeholders**: Use real marketing copy for headings.
- **Localization**: Always include at least two languages (EN/ES) in the `textBank`.
- **Validation**: Ensure `imageKey` matches an entry in `imageBank` (even if using a placeholder base64 for the structure).
- **Format**: Return the JSON inside a fenced code block with `json` identifier.
