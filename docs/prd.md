# Woodworking Calculator — Product Requirements Document

**Version:** 1.0 Draft
**Date:** February 3, 2026
**Platform:** iOS (React Native / Expo)
**Styling:** NativeWind (Tailwind CSS for React Native)

---

## 1. Product Overview

### 1.1 Summary

A woodworking-focused calculator app for iOS called **WoodCalc** that supports fractional arithmetic in imperial units (feet & inches), metric units, and unit conversion. The app auto-saves calculation history, lets users favorite/annotate measurements, and provides a clean, native-feeling experience optimized for portrait orientation.

### 1.2 Target Users

- Hobbyist and professional woodworkers
- DIY home improvement enthusiasts
- Carpenters, cabinetmakers, and tradespeople
- Anyone who regularly works with fractional imperial measurements

### 1.3 Problem Statement

Standard phone calculators don't support fractional inch arithmetic. Woodworkers frequently need to add, subtract, multiply, and divide measurements like `3' 4-1/2" + 2' 7-3/4"` and get results in usable fractions — not decimals. Existing solutions are either clunky, ad-heavy, or lack basic quality-of-life features like saving and annotating measurements.

### 1.4 Design Principles

- **Woodworker-first:** Fractions and feet-inches are first-class citizens, not afterthoughts.
- **Fast & familiar:** The calculator should feel instantly usable — no learning curve.
- **Non-destructive:** Every calculation is preserved by default so nothing is ever lost.
- **Native feel:** Follow iOS conventions (swipe-to-delete, system light/dark mode, smooth transitions).

---

## 2. Technical Architecture

### 2.1 Stack

| Layer | Technology |
|---|---|
| Framework | React Native via Expo (managed workflow) |
| Styling | NativeWind (Tailwind CSS) |
| Navigation | Expo Router (file-based routing) |
| Local Storage | AsyncStorage (calculation history, settings, favorites) |
| State Management | React Context + useReducer (or Zustand if complexity grows) |
| Fraction Math | Custom utility library or `fraction.js` |
| Theme | `useColorScheme()` hook — follows system light/dark mode setting |
| Auth (future) | Placeholder in settings UI; no backend for v1 |

### 2.2 Data Models

#### Calculation Record

```
{
  id: string (uuid),
  expression: string,          // "3' 4-1/2\" + 2' 7-3/4\""
  result: string,              // "6' 0-1/4\""
  resultRaw: number,           // decimal inches for internal use
  unitSystem: "imperial" | "metric",
  isFavorited: boolean,
  description: string | null,  // user-entered short description
  createdAt: ISO 8601 timestamp,
  updatedAt: ISO 8601 timestamp
}
```

#### User Settings

```
{
  autoSave: boolean,              // default: true
  unitSystem: "imperial" | "metric",  // default: "imperial"
  fractionPrecision: 2 | 4 | 8 | 16 | 32,  // denominator, default: 16
  unitConversionEnabled: boolean, // default: false
  theme: "system"                 // v1 always follows system
}
```

---

## 3. App Structure & Navigation

### 3.1 Screen Map

```
App
├── Calculator Screen (default/home)
│   ├── Calculator keypad & display
│   ├── Measurement List (bottom sheet / modal dialog)
│   └── Top-right avatar icon → navigates to Settings
├── Settings Screen
│   ├── Auto-save toggle
│   ├── Default unit system (imperial / metric)
│   ├── Fraction precision selector
│   ├── Unit conversion toggle
│   ├── Account section (placeholder for future auth)
│   └── About / version info
└── Measurement List Screen (also accessible as modal from Calculator)
    ├── Full list of saved calculations
    ├── Swipe-to-delete gesture
    ├── Tap to edit description
    └── Favorite/pin toggle
```

### 3.2 Navigation Behavior

- App always opens to the **Calculator Screen**.
- **Measurement List** is accessible two ways: as a large modal/bottom sheet from the Calculator screen, and as a standalone screen from navigation.
- **Settings** is accessed via the avatar icon in the top-right corner of the Calculator screen.
- Back navigation follows standard iOS patterns (swipe-back gesture, back button).

---

## 4. Feature Specifications

### 4.1 Calculator — Core

#### 4.1.1 Display

- **Expression line:** Shows the full expression as running text. Wraps to multiple lines as needed. Uses a readable monospaced or semi-monospaced font.
- **Result line:** Shows the computed result below the expression, visually distinct (larger font, different color/weight).
- **Unit indicator:** Small badge or label showing current unit system (e.g., `in` / `ft-in` / `cm`).

#### 4.1.2 Keypad Layout

| Row | Keys |
|---|---|
| Row 1 | `C` (clear) · `⌫` (backspace) · `( )` · `÷` |
| Row 2 | `7` · `8` · `9` · `×` |
| Row 3 | `4` · `5` · `6` · `−` |
| Row 4 | `1` · `2` · `3` · `+` |
| Row 5 | `0` · `'` (feet) · `"` (inches) · `=` |
| Row 6 (fraction bar) | `/` · Precision quick-keys (e.g., `1/2`, `1/4`, `1/8`, `1/16`) |

> **Note:** The fraction bar (Row 6) provides quick entry for common fractions. The `/` key allows arbitrary fraction entry (e.g., `7/32`).

#### 4.1.3 Input Behavior

- Users type expressions left to right: `3` `'` `4` `1/2` `"` `+` `2` `'` `7` `3/4` `"`.
- The app parses feet (`'`), inches (`"`), and bare fractions contextually.
- Pressing `=` evaluates the full expression and displays the result.
- The original typed expression is preserved in history exactly as entered.
- Long expressions wrap naturally in the display area.

#### 4.1.4 Arithmetic

- **Supported operations:** addition (`+`), subtraction (`−`), multiplication (`×`), division (`÷`).
- **Order of operations:** Standard PEMDAS. Parentheses are supported.
- **Fraction arithmetic:** All internal math is done with exact fraction representation to avoid floating-point rounding issues.
- **Mixed numbers:** Supports input and output of mixed numbers (e.g., `3-1/2"` means 3 and one-half inches).

#### 4.1.5 Display Formatting (Auto Mode)

- **Imperial results:** Always displayed as reduced fractions at the user's chosen precision. Example: result of 3.3125 inches at 1/16 precision → `3-5/16"`. If the result exceeds 12 inches, display as feet and inches: `1' 3-5/16"`.
- **Metric results:** Always displayed as decimals (e.g., `84.1 mm`).

#### 4.1.6 Fraction Precision

- User-configurable in Settings. Options: `1/2`, `1/4`, `1/8`, `1/16`, `1/32`.
- Results are rounded to the nearest selected precision.
- Default: `1/16"`.

### 4.2 Unit Conversion

- **Activation:** Enabled/disabled via a toggle in Settings.
- **Behavior when enabled:** A conversion button appears on the Calculator screen (e.g., a `⇄` icon near the result display). Tapping it converts the current result between imperial and metric.
- **Conversion is display-only** — it does not change the stored expression or the user's default unit system.
- **Supported conversions:** Inches ↔ millimeters, Inches ↔ centimeters, Feet ↔ meters.

### 4.3 Calculation History & Auto-Save

#### 4.3.1 Auto-Save (Default: On)

- Every time the user presses `=`, the expression and result are automatically saved to the Measurement List.
- A subtle toast or indicator confirms the save (e.g., a brief checkmark animation).
- This behavior can be toggled off in Settings.

#### 4.3.2 Manual Save (When Auto-Save Is Off)

- After pressing `=`, a **save icon** (e.g., bookmark or floppy disk) appears near the result.
- Tapping the icon saves the calculation to the Measurement List.
- Unsaved calculations are lost when the user starts a new expression.

#### 4.3.3 Stored Data Per Calculation

Each saved entry stores: the original expression as typed, the computed result (formatted string), the raw numeric value, the unit system used, a favorite flag, an optional user description, and timestamps.

### 4.4 Measurement List

#### 4.4.1 Access

- **From Calculator:** Tapping a list/history icon opens the Measurement List as a large modal (bottom sheet that expands to near-full-screen).
- **Standalone:** Also accessible as a full screen if navigated to directly.

#### 4.4.2 List Item Display

Each item shows: the short description (if set, displayed prominently), the original expression, the result, and the timestamp. Favorited items show a filled star/pin icon.

#### 4.4.3 Interactions

- **Favorite/Pin:** Tap the star/pin icon on any item to toggle favorite status. Favorited items can optionally be pinned to the top of the list.
- **Add/Edit Description:** Tap on an item to open an inline edit field or a small modal where the user can type a short description (e.g., "Shelf width", "Door frame height").
- **Delete:** Native iOS swipe-left gesture reveals a red "Delete" button. Standard `UISwipeActionsConfiguration` pattern via React Native gesture handling.
- **Sort/Filter:** v1 shows items in reverse chronological order (newest first), with favorited items optionally pinned to top.

### 4.5 Settings Screen

#### 4.5.1 Settings Options

| Setting | Type | Default | Description |
|---|---|---|---|
| Auto-save calculations | Toggle | On | Save every calculation automatically |
| Default unit system | Segmented control | Imperial | Imperial or Metric |
| Fraction precision | Picker / segmented | 1/16 | 1/2, 1/4, 1/8, 1/16, 1/32 |
| Enable unit conversion | Toggle | Off | Show conversion button on calculator |
| Account | Section (placeholder) | — | "Sign in" placeholder for future auth |
| About | Static | — | App version, credits, support link |

#### 4.5.2 Future Auth Placeholder

- The settings screen includes an "Account" section at the top with a generic avatar, the text "Sign in to sync your measurements across devices", and a disabled/teaser "Sign In" button or a note like "Coming soon."
- No backend or auth logic is implemented in v1.

### 4.6 Theming

- The app follows the **system color scheme** (`light` or `dark` mode) using React Native's `useColorScheme()`.
- NativeWind's `dark:` variant classes are used throughout for seamless theme switching.
- **Light mode:** Clean white/light gray backgrounds, dark text, subtle borders.
- **Dark mode:** Dark gray/near-black backgrounds, light text, muted accent colors.
- Accent color: A warm, workshop-inspired tone (e.g., amber/orange `#D97706` or a muted teal) used for buttons, active states, and the `=` key. Final color TBD during design phase.

---

## 5. User Stories

### 5.1 Core Calculator

- **US-1:** As a woodworker, I want to add fractional measurements (e.g., `3-1/2" + 2-3/4"`) and get a fractional result, so I don't have to convert to decimals manually.
- **US-2:** As a user, I want to type a long multi-step expression before pressing `=`, so I can calculate complex cuts in one go.
- **US-3:** As a user, I want the display to wrap long expressions to multiple lines, so I can see the full calculation on screen.
- **US-4:** As a user, I want to enter measurements in feet and inches (e.g., `3' 4-1/2"`), so I can work with real-world dimensions naturally.

### 5.2 Unit System & Conversion

- **US-5:** As a user, I want to choose between imperial and metric as my default unit system, so the app matches how I work.
- **US-6:** As a user, I want to convert a result between imperial and metric with one tap, so I can communicate measurements in either system.
- **US-7:** As a user, I want imperial results shown as fractions and metric results shown as decimals, so results are always in the expected format.

### 5.3 History & Saving

- **US-8:** As a user, I want every calculation auto-saved by default, so I never lose a measurement.
- **US-9:** As a user, I want to turn off auto-save if I prefer to save selectively.
- **US-10:** As a user, I want to see my original typed expression in history (not just the result), so I can understand what I calculated.
- **US-11:** As a user, I want to add a short description to a saved measurement (e.g., "Shelf width"), so I can remember what it's for.
- **US-12:** As a user, I want to favorite/pin important measurements so they're easy to find.
- **US-13:** As a user, I want to swipe-to-delete a saved measurement using the standard iOS gesture.

### 5.4 Settings & Personalization

- **US-14:** As a user, I want to choose my fraction precision (1/2 through 1/32), so results match my project requirements.
- **US-15:** As a user, I want the app to follow my system light/dark mode setting automatically.

---

## 6. Screen Wireframe Descriptions

### 6.1 Calculator Screen

```
┌─────────────────────────────────┐
│ ◉ WoodCalc               [👤]  │  ← top bar: app name + avatar icon
│─────────────────────────────────│
│                                 │
│  3' 4-1/2" + 2' 7-3/4"         │  ← expression (wrapping text)
│                                 │
│                    = 6' 0-1/4"  │  ← result (right-aligned, larger)
│                          [⇄]   │  ← conversion btn (if enabled)
│─────────────────────────────────│
│  [1/2] [1/4] [1/8] [1/16]  [/] │  ← fraction quick-bar
│─────────────────────────────────│
│   C    │  ⌫   │  ( )  │   ÷   │
│────────┼───────┼───────┼───────│
│   7    │   8   │   9   │   ×   │
│────────┼───────┼───────┼───────│
│   4    │   5   │   6   │   −   │
│────────┼───────┼───────┼───────│
│   1    │   2   │   3   │   +   │
│────────┼───────┼───────┼───────│
│   0    │   '   │   "   │   =   │
│─────────────────────────────────│
│  [📋 History]    [💾 Save*]    │  ← bottom bar (* only if auto-save off)
└─────────────────────────────────┘
```

### 6.2 Measurement List (Modal / Screen)

```
┌─────────────────────────────────┐
│  Saved Measurements      [Done]│
│─────────────────────────────────│
│  ★ Shelf width                  │  ← description (bold)
│    3' 4-1/2" + 2' 7-3/4"       │  ← original expression
│    = 6' 0-1/4"          2m ago  │  ← result + timestamp
│─────────────────────────────────│
│  ☆ (no description)             │
│    12-3/8" - 4-1/16"            │
│    = 8-5/16"           15m ago  │
│─────────────────────────────────│
│        ← swipe left to delete → │
│              [🗑 Delete]        │
└─────────────────────────────────┘
```

### 6.3 Settings Screen

```
┌─────────────────────────────────┐
│  ← Settings                    │
│─────────────────────────────────│
│  ACCOUNT                        │
│  [👤] Sign in for cloud sync    │
│        Coming soon              │
│─────────────────────────────────│
│  CALCULATOR                     │
│  Auto-save calculations  [●━━] │
│  Default units       [Imperial▾]│
│  Fraction precision     [1/16▾]│
│  Unit conversion         [━━●] │
│─────────────────────────────────│
│  DATA                           │
│  Clear all history    [Clear ⚠]│
│─────────────────────────────────│
│  ABOUT                          │
│  Version 1.0.0                  │
│  Send feedback                  │
└─────────────────────────────────┘
```

---

## 7. Edge Cases & Validation

- **Division by zero:** Display a friendly error message ("Cannot divide by zero") without crashing. Do not save to history.
- **Invalid expressions:** If the user presses `=` on a malformed expression (e.g., `3' + `), display an inline error and do not save.
- **Overflow:** Extremely large numbers should be handled gracefully; display a warning if the result exceeds a reasonable range.
- **Precision rounding:** When rounding to the chosen fraction precision, always round to the **nearest** value (e.g., 5/12 at 1/8 precision → 3/8, not 4/8).
- **Empty history:** Show a friendly empty state in the Measurement List (e.g., "No measurements yet. Start calculating!").
- **Description length:** Cap short descriptions at 60 characters.
- **Storage limits:** AsyncStorage has a ~6MB limit on iOS. For v1 this is more than sufficient, but consider pagination or cleanup for power users in future versions.

---

## 8. Accessibility

- All buttons have accessible labels (e.g., the `×` key reads as "multiply," not "times symbol").
- Sufficient color contrast in both light and dark modes (WCAG AA minimum).
- VoiceOver support for calculator display (reads the expression and result).
- Tap targets are minimum 44×44 points per iOS HIG.

---

## 9. Phased Roadmap

### Phase 1 — MVP (v1.0)

- Calculator with fractional arithmetic (feet & inches)
- Auto-save & manual save
- Measurement list with favorite, description, swipe-to-delete
- Settings page (auto-save, units, precision, conversion toggle)
- Light/dark mode (system-following)
- Auth placeholder in settings

### Phase 2 — Enhancements (v1.x)

- Unit conversion button on calculator
- Metric mode with decimal display
- Haptic feedback on keypress
- Calculation history search
- Export measurements (share sheet / copy to clipboard)

### Phase 3 — Growth (v2.0)

- User auth (Apple Sign-In / email)
- Cloud sync of measurements
- Project-based folders for organizing measurements
- Board feet calculator (specialty mode)
- iPad layout support
- Widget for recent measurements

---

## 10. Success Metrics

- **Retention:** 30-day retention rate > 40%
- **Session depth:** Average calculations per session > 3
- **Save rate:** > 60% of calculations are favorited or described
- **App Store rating:** Target 4.5+ stars
- **Crash-free rate:** > 99.5%

---

## 11. Resolved Questions

1. **Fraction quick-bar:** Fixed set — `1/2`, `1/4`, `1/8`, `1/16` plus a `/` key for custom fractions. Not configurable.
2. **Tapping saved measurements:** View-only. The measurement list is for reference; tapping opens the description editor, not the calculator. This keeps the UX simple and avoids ambiguity.
3. **Clear all history:** Yes, available in Settings under a "Danger Zone" or "Data" section. Requires a confirmation dialog ("Delete all saved measurements? This cannot be undone.") with a destructive-style red confirm button.
4. **App name:** **WoodCalc**

---

*End of PRD — v1.0*