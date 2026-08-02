# 🧮 Math Quest

An adaptive elementary-school maths quiz app for grades 1–5, built with Expo and React Native.

Pick a grade, answer a short quiz, then work back through anything you got wrong. The app tracks how you did and quietly adjusts the difficulty for next time.

## Features

- **Grades 1–5**, each with its own set of question types
- **Adaptive difficulty** — three tiers per grade that move up or down based on your accuracy, remembered per grade
- **Real-world story problems** — *"There are 6 birds in a tree. How many feet do they have in total?"* — mixed in alongside plain arithmetic
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

| Grade | Arithmetic | Story problems |
| --- | --- | --- |
| 1 | addition, subtraction, three-number sums | legs and feet, wheels, giving and receiving |
| 2 | larger addition and subtraction, times tables | equal groups in packs, animals and vehicles |
| 3 | multiplication, division, big sums | sharing out evenly, money in cents, weeks to days |
| 4 | long multiplication, division, fractions | buses needed, change from a purchase, area vs. perimeter, distance |
| 5 | decimals, order of operations, comparing fractions | shopping totals, percentages, averages |

Wrong answers are deliberate near-misses rather than random numbers — confusing area with perimeter, rounding buses down instead of up, reporting a total where an average was asked for.

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
    storage.ts           history and per-grade tier persistence
    format.ts            elapsed-time formatting
  screens/               Home, Quiz, Results, Correction
  components/            ChoiceButton, NumberPad, ElapsedTimer
```

Progress is stored on the device with AsyncStorage — there is no account, no server, and nothing leaves the device.

## Testing

```bash
npm test
```

The suite checks that generated questions are internally consistent — every arithmetic prompt actually evaluates to its stated answer, choices are unique and always contain the right one, grade-1 answers stay within range, story problems never render a malformed sentence — plus the answer-grading and number-pad input rules.

## License

MIT © boringfy — see [LICENSE](LICENSE).
