# 🧠 Cortex Branding Assets

Complete logo and icon package for the Cortex AI Memory System.

## 📁 File Structure

```
docs/branding/
├── svg/                              # Source vector files (scalable)
│   ├── cortex-logo.svg               # Full detailed logo with neural network design
│   ├── cortex-icon.svg               # Simplified icon (works at all sizes)
│   ├── cortex-icon-mono-dark.svg     # Monochrome for light backgrounds
│   ├── cortex-icon-mono-light.svg    # Monochrome for dark backgrounds
│   ├── cortex-logo-horizontal.svg    # Logo + wordmark horizontal layout
│   ├── cortex-logo-vertical.svg      # Logo + wordmark stacked layout
│   └── og-image.svg                  # Social media banner
│
├── png/                              # Raster images (pre-sized)
│   ├── favicon-16x16.png             # Browser tabs (standard)
│   ├── favicon-32x32.png             # Browser tabs (retina)
│   ├── favicon-48x48.png             # Browser tabs (high-DPI)
│   ├── favicon-96x96.png             # Google Chrome recommended
│   ├── apple-touch-icon.png          # iOS home screen (180x180)
│   ├── android-chrome-192x192.png    # Android Chrome icon
│   ├── android-chrome-512x512.png    # Android Chrome splash
│   ├── vscode-extension-128x128.png  # VS Code Marketplace minimum
│   ├── vscode-extension-256x256.png  # VS Code Marketplace retina
│   ├── icon-512.png                  # General purpose
│   ├── icon-1024.png                 # High resolution
│   ├── logo-512.png                  # Full logo rasterized
│   └── og-image.png                  # Social media (1200x630)
│
├── ico/
│   └── favicon.ico                   # Multi-resolution ICO (16, 32, 48)
│
├── web/
│   ├── site.webmanifest              # PWA manifest
│   └── favicon-integration.html      # HTML snippet for integration
│
└── README.md                         # This file
```

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Purple | `#8B5CF6` | Main brand color |
| Gradient Start | `#6366F1` | Indigo (gradient start) |
| Gradient End | `#A855F7` | Violet (gradient end) |
| Background Dark | `#0F0F23` | Dark mode background |
| Text Light | `#E5E7EB` | Light text on dark |
| Text Muted | `#9CA3AF` | Secondary text |

## 🚀 Quick Start

### Website Integration

1. Copy the PNG files to your `public/` directory
2. Add the HTML from `web/favicon-integration.html` to your `<head>`
3. Update URLs to match your domain

### VS Code Extension

1. Copy `png/vscode-extension-128x128.png` to your extension root as `icon.png`
2. Add to `package.json`:
```json
{
  "icon": "icon.png"
}
```

### GitHub Repository

Use `png/icon-512.png` as your repository social preview image.

### NPM Package

Use `png/icon-512.png` as your npm package icon.

## 📏 Size Reference

| Platform | Size | File |
|----------|------|------|
| Browser tab | 16×16, 32×32 | favicon-*.png |
| iOS Home | 180×180 | apple-touch-icon.png |
| Android Home | 192×192 | android-chrome-192x192.png |
| PWA Splash | 512×512 | android-chrome-512x512.png |
| VS Code Extension | 128×128+ | vscode-extension-*.png |
| Social Media | 1200×630 | og-image.png |

## 🎯 Design Concept

The Cortex logo represents:
- **Neural Network**: Central hub with connected nodes symbolizing AI memory
- **Persistent Memory**: The inner core represents stored knowledge that persists
- **Connectivity**: Radiating pathways show integration with multiple tools
- **Modern Tech**: Purple gradient represents AI/ML industry aesthetics

## 📄 License

MIT License - Free to use with attribution.

---

**Created for [Cortex](https://github.com/EcuaByte-lat/Cortex)** - Persistent memory for AI coding assistants
