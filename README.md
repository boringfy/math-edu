# 🧮 Math Quest

An adaptive elementary-school maths quiz app for grades 1–5, built with Expo and React Native.

Pick a grade, answer a short quiz, then work back through anything you got wrong. The app tracks how you did and quietly adjusts the difficulty for next time.

## Features

- **Grades 1–5**, each with its own set of question types
- **Adaptive difficulty** — three tiers per grade that move up or down based on your accuracy, remembered per grade
- **Real-world story problems** — *"There are 6 birds in a tree. How many feet do they have in total?"* — mixed in alongside plain arithmetic
- **A spread of topics** — arithmetic, story problems, geometry, length and capacity, money, and speed/distance, balanced so no quiz is all of one thing
- **Missing-operand questions** — *"10 − ? = 4"*, and the same idea as a story: *"Joe has 10 apples, gives Paul some, and now has 4 — how many did he give away?"*
- **Drawing puzzles** — *"Cut the cake into exactly 6 pieces using 3 straight cuts"*, solved by dragging cuts across the cake, with a live piece count as you go
- **Typed answers** — a built-in number pad replaces multiple choice on a share of questions, so you work the answer out instead of picking from four
- **Correction round** — every mistake is re-asked with a hint and up to three tries
- **Results and history** — score, time taken, a per-question breakdown, and your last 50 quizzes

## Getting started

**Requirements:** Node.js 18+, and JDK 17+ plus the Android SDK (or Xcode for iOS) if you want to build the native app.

```bash
npm install
```

Then either start the dev server on its own:

```bash
npm start
```

…or build and install the native app on a connected device or emulator:

```bash
npm run android   # or: npm run ios
```

`npm run android` generates the native project, compiles it and installs it, so the first run takes a few minutes. Subsequent runs are incremental, and JavaScript changes hot-reload without rebuilding.

### Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` | Build and run the native Android app |
| `npm run ios` | Build and run the native iOS app |
| `npm run web` | Run in the browser |
| `npm test` | Run the test suite |

## How difficulty works

Each grade has three tiers — Easy, Normal and Hard — starting at Normal. After a quiz:

- accuracy below **50%** steps the tier down
- accuracy of **90%** or more steps it up
- anything in between holds steady

The tier controls how big the numbers get, which question types appear, and how many questions are typed rather than multiple choice (**25% → 50% → 75%** as the tier rises). Questions that only make sense with the options visible, like *"which fraction is the largest?"*, always stay multiple choice.

Typed answers are graded by value rather than by text, so `5` is accepted for `5.0`, and `1/2` is accepted for `4/8`.

## Question types by grade

| Grade | Arithmetic | Story problems | Geometry | Measurement | Money | Speed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | addition, subtraction, missing operand | legs and feet, giving and receiving, how many were given away | sides and corners | — | — | — |
| 2 | larger sums, times tables, missing operand | equal groups, animals and vehicles, how many more are needed | sides, corners, perimeter | cm to mm, lengths end to end | counting coins, change | — |
| 3 | multiplication, division, missing factor | sharing out evenly, cents, weeks to days | perimeter, area | m to cm, litres to ml, mixed units | change, how many can you buy | distance from speed and time |
| 4 | long multiplication, division, fractions, missing operand | buses needed, change from a purchase, area vs. perimeter | area, triangle area, angles, volume | km to m, capacity, differences | fewest coins, budgets, leftovers | distance, time |
| 5 | decimals, order of operations, comparing fractions | shopping totals, percentages, averages | angles, triangle area, volume, diameter | conversions, filling glasses | budgets in dollars, fewest coins | distance, time, speed, catching up |

Every grade also gets one **drawing puzzle** per quiz (for quizzes of five questions or more).

Wrong answers are deliberate near-misses rather than random numbers — confusing area with perimeter, rounding buses down instead of up, forgetting to halve when finding a triangle's area, subtracting before converting units, or reporting a total where an average was asked for.

## The drawing puzzles

Each cut is a full chord across the cake, so a rough swipe still slices cleanly from edge to edge. The piece count comes from a simple rule: **every cut adds one piece, plus one more for each existing cut it crosses at a new point.** That is what makes the classic puzzle work — three cuts through the middle all meet at the same point, so the third adds 2 pieces rather than 3, giving 6 slices instead of 7.

Crossings that land within 8% of the cake's radius count as the same point, so "send every cut through the middle" is achievable with a finger rather than a ruler. The live piece count updates as you draw, and Undo and Start over are always available.

## Project structure

```
App.tsx                  screen routing and quiz session state
src/
  types.ts               shared types
  theme.ts               colours and prompt sizing
  lib/
    generator.ts         shared question-building primitives
    questions.ts         arithmetic generators, quiz assembly, answer grading
    wordProblems.ts      real-world story-problem library
    geometry.ts          shapes, angles, area and volume
    measurement.ts       length and capacity, unit conversions
    money.ts             coins, change and budgets
    physics.ts           speed, distance and time
    drawPuzzles.ts       cut-the-cake puzzle definitions
    cakeCuts.ts          cut geometry and piece counting
    storage.ts           history and per-grade tier persistence
    format.ts            elapsed-time formatting
  screens/               Home, Quiz, Results, Correction
  components/            ChoiceButton, NumberPad, CutBoard, ElapsedTimer
```

Topics are weighted rather than hardcoded per quiz: pools that are empty for a grade (speed problems before grade 3, say) drop out and their share is spread across the rest, so the question count always adds up exactly.

Progress is stored on the device with AsyncStorage — there is no account, no server, and nothing leaves the device.

## Testing

```bash
npm test
```

The suite checks that generated questions are internally consistent — every equation balances once the answer is substituted back in (including missing-operand prompts like `10 - ? = 4`), choices are unique and always contain the right one, grade-1 answers stay within range, and no generator renders a malformed sentence. It also covers the answer-grading rules, the number-pad input rules, and the cut geometry: one cut makes two pieces, two crossing cuts make four, three through the middle make six, and three in general position make seven.

## License

MIT © boringfy — see [LICENSE](LICENSE).
