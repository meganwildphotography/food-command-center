# 🍽️ Food Command Center (V1)

A colorful, mobile-first, offline-capable family meal app: **feed everybody, know what you need.**
It's a static PWA (HTML/CSS/JS). Data stays on your phone in `localStorage`, with no account and no server.

## Use it
- Open the live URL in Chrome on your phone, then use ⋮ → **Add to Home screen** / **Install app**.
- **FEED EVERYBODY**: pick energy + time + where food comes from, and you get ONE meal with numbered steps. Tap "Something else" if you want another.
- **Tell me** box (🎤 voice works in Chrome): "we're out of eggs", "add milk", "bought everything except bananas", "remove chicken", "leftover chicken", "Mark works tomorrow", "I have chicken, rice and cheese, what can I make?"
- **More → Backup**: Export/Import JSON.

## Files
| File | What |
|---|---|
| `index.html` | App shell + styles |
| `app.js` | UI (views, taps, voice) |
| `engine.js` | Pure logic: seed data, meals, parser, recommendations, Mark planner, price verdicts (works in Node too) |
| `sw.js`, `manifest.json`, `icons/` | Offline + install |
| `tests/engine.test.js` | `node tests/engine.test.js` |
| `tests/e2e.test.js` | Headless-browser scenarios (needs playwright-core + Chrome + local server) |

Prices in the price book marked **PLACEHOLDER** are made-up starting points, not real store prices.
