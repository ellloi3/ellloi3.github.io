# LEGO Ninjago Smash — Simple AI Fighter Website

This is a small client-side website that simulates a Super Smash Bros-style match using 10 LEGO Ninjago characters. The "AI" chooses a random opponent and uses a simple heuristic to act during the battle.

Features:
- Landing screen with "Start" button
- Character select screen with 10 Ninjago fighters
- Turn-based battle screen (player vs AI)
- Attack and Special actions (special can miss occasionally)
- AI that chooses actions based on HP heuristics (attack / special / defend)
- Win and Lose screens with button to return to the character select

How to run:
1. Put all files (index.html, styles.css, characters.js, app.js) in the same folder.
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge).
   - No server is required (pure client-side).

Customize:
- To change characters, edit `characters.js`. You can add an `image` property and update rendering to use `<img>` tags instead of colored avatars.
- To improve AI, replace `aiChooseAction()` in `app.js` with a more advanced function (e.g., stateful strategy, reinforcement, or call out to a backend ML model).

Notes:
- The current "AI" is intentionally simple (random + heuristics) — it is easy to extend if you want a smarter opponent.
- Avatars are CSS-colored placeholders. Replace with images if you have character art.

If you want, I can:
- Convert this into a React app or add a Node/Express backend.
- Add animated attacks, sounds, and real images for each fighter.
- Add multiplayer support.
Tell me which enhancements you'd like and I can provide the updated code.
