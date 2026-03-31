# UG Trade Evaluator

A mobile-first web app for evaluating dinosaur trades in the Meta Quest game **Untamed Grounds (UG)**.

## Setup

```bash
npm install
npm run dev
```

App runs at **http://localhost:5174**

## How it works

- Add up to 5 dinos on each side of the trade
- Set each dino's level (1–100) with the slider
- The app calculates total value and rates the trade:
  - **Fair** (≤10% difference) — green
  - **Slightly Uneven** (10–25%) — yellow
  - **Uneven** (25–50%) — orange
  - **Very One-Sided** (>50%) — red
- Value formula: `base × (1 + level / 100)`
- Edit dino base levels in Settings (⚙️) — saved to localStorage
