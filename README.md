# Kpy-KMK

> **Configure your KMK keyboard in 30 seconds. Zero installation. Pure browser magic.**

![Kpy Configurator](https://img.shields.io/badge/KMK-Configurator-00D9FF?style=for-the-badge)
![Vue 3](https://img.shields.io/badge/Vue.js-3.x-4FC08D?style=for-the-badge&logo=vue.js)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=for-the-badge)

---

## 🚀 Why Kpy?

### ⚡ **FAST** ⚡ **SIMPLE** ⚡ **LIGHTWEIGHT**

- **One click** to connect, configure, and save
- **Auto-detect** your keyboard matrix
- Save configs **instantly** - no compile, no flash
- **Visual editor** - drag, drop, done
- **No dependencies** - just you and your browser

---

## 🎯 Quick Start

### 1. Hardware Setup (One Time)

1. Install [CircuitPython](https://circuitpython.org/downloads) on your keyboard
2. Download [KMK firmware](https://github.com/KMKfw/kmk_firmware)
3. Copy these files to `CIRCUITPY/`:
   - `kmk/` (folder from KMK firmware)
   - `boot.py`
   - `code.py`
   - `config.json`

### 2. Web Configuration

1. **Open Kpy** in your browser → Click **Connect**
2. **Settings** → Enter GPIO pins → **Start Matrix Identification**
3. Press each key row by row (double-press last key to move to next row) → **Finish**
4. **Keymap** → Adjust visual layout → Map your keys → **Save**

**Done.** Your keyboard is ready.

---

## 🛠 Development

```bash
git clone https://github.com/yourusername/kpy-kmk.git
cd kpy-kmk
npm install
npm run dev
```

**Production:**

```bash
npm run build
# Deploy dist/ folder to GitHub Pages, Netlify, Vercel, etc.
```

---

<div align="center">

Made with ⚡ for people who value their time.

</div>
