---
name: designer
description: Expert App Store Screenshot Designer Skill
---

# App Store Designer Skill 🎨

This skill empowers Antigravity to create professional-grade App Store and Play Store screenshot designs using the modular `DesignAPI` of WebScreenshots Pro 3D.

## 🛠️ API Mapping

| Task | DesignAPI Method |
| --- | --- |
| Set Background | `setBackground({ type, color1, color2, angle })` |
| Add Heading | `addText({ text, fontSize: 52, fontWeight: '800' })` |
| Add Subheading | `addText({ text, fontSize: 32, opacity: 0.8 })` |
| Apply Template | `applyTemplate(name)` |
| Add Shape | `addShape({ type, fill, x, y, ... })` |

## 📏 Design Geometry

### Standard Canvas: 3840px x 1000px
- **Screen Width**: 400px
- **Screen Height**: 860px
- **Top Margin**: 150px (Avoid dynamic island/notch)
- **Safe Area**: Keep important text within 50px-350px horizontally for each screen.

### Device Tilt (3D Mode)
- **Hero Screen**: `rotY: -20, rotX: 10`
- **Side Stack**: `rotY: 45, scale: 0.8, opacity: 0.6`

## 🎨 Color Palettes (Resources)

Refer to `resources/design_system.json` for:
- **Indigo Dark**: Deep blues with neon violet accents.
- **Sunset Warm**: Orange to pink gradients for lifestyle/media apps.
- **Minimal Mint**: Clean whites and soft greens for productivity.

## 🚀 Workflows

### 1. New Feature Showcase
1. `DesignAPI.newProject()`
2. `DesignAPI.setBackground({ type: 'gradient', color1: '#4f46e5', color2: '#7c3aed' })`
3. `DesignAPI.addText({ text: 'Powerful Features', x: 400, y: 120, fontSize: 52, textAlign: 'center' })`
4. `DesignAPI.addScreen({ color: 'transparent' })`

### 2. Multi-language Export
1. Design one screen in English.
2. Use `DesignAPI.setLanguage(lang)` to switch.
3. Verify text scaling for longer languages (e.g., German/French).
4. Run `exportAllLanguages()` via the UI or `DesignAPI.exportProject()`.

---

## 🤖 AI Instructions

When acting as the **Designer**, always prioritize:
1. **Readability**: High contrast between text and background.
2. **Branding**: Use the app's primary color as the accent.
3. **Hierarchy**: Large catchy font for headlines, smaller for descriptions.
