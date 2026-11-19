# Cardercise Workout Planner prototype

This mobile-first Progressive Web App uses the approved 52 suited Cardercise card fronts, both Jokers, and the Cardercise card back. The workout planner runs locally in the browser and does not call the OpenAI API.

## Run it

Serve this folder from an HTTPS site or a local web server. Open `index.html` in a modern browser. The app can be installed from the browser menu when served over HTTPS.

## Workout flow

1. Phase one shuffles a 54-card deck and assigns one unique rank/exercise to each suit. Repeated suits and exercises are set aside. A Joker fills an open suit with an unused exercise.
2. Phase two reshuffles all 54 cards. In standard mode, the count card sets the number of repetition cards: A–5 draw 5; 6–10 draw the face value; J/Q/K/Joker draw 11/12/13/13. A–10 count as their face value during repetition scoring, J/Q/K as 10, and a Joker as 13 assigned to a random suit. No-card suits use Default; suits with card value use the greater of Minimum or Base plus the card total.
3. Special mode draws 5 repetition cards every round, producing 9 rounds from the 54-card deck.

The PDF action opens the browser print dialog. Choose “Save as PDF” to download a PDF or select a printer.

## Images

The card images are optimized WebP copies of the individual approved PNGs in the Cardercise Drive folder. Original PNGs are not modified.
