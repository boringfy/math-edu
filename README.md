# 🧮📖🧩 Boring Quest

An elementary-school practice app for grades 1–5, built with Expo and React Native. It has three parts — **maths**, **reading comprehension** and **logic** — each with its own map and its own progress, switched between with the tab bar at the bottom of the home screen.

Work along a map, one grade at a time. On the maths side each stop is a short quiz on one subject; on the reading side each stop is one short story followed by questions about it; on the logic side each stop is a set of reasoning puzzles, half of them drawn rather than written. Answer, fix anything you got wrong, collect coins and stars, and the next stop opens up.

## Features

- **A map of 60 lessons per grade** — 300 in all, each on its own subject and getting harder as you go
- **A second map of 60 reading stories per grade** — 300 in all, each one a paragraph followed by 3–5 questions about it
- **Reading out loud** — an optional step that listens while the story is read aloud and lights up the words it hears, entirely on the device
- **A third map of 60 logic sets per grade** — 300 in all: sequences, analogies, deduction grids and drawn shape puzzles
- **Separate progress per subject**, one shared coin purse and one shared set of daily challenges
- **Coins** for every correct answer, with bonuses for clean runs and long streaks
- **Three daily challenges**, redrawn each morning, that pay out the moment you finish them
- **Combo streaks** that fire off an animation when you get three, five, seven… in a row
- **Grades 1–5**, each with its own set of question types
- **Adaptive difficulty** in free practice — three tiers per grade that move up or down based on your accuracy, remembered per grade
- **Real-world story problems** — *"There are 6 birds in a tree. How many feet do they have in total?"* — mixed in alongside plain arithmetic
- **A spread of topics** — arithmetic, story problems, geometry, length and capacity, money, and speed/distance, balanced so no quiz is all of one thing
- **Missing-operand questions** — *"10 − ? = 4"*, and the same idea as a story: *"Joe has 10 apples, gives Paul some, and now has 4 — how many did he give away?"*
- **Drawing puzzles** — *"Cut the cake into exactly 6 pieces using 3 straight cuts"*, solved by dragging cuts across the cake, with a live piece count as you go
- **Typed answers** — a built-in number pad replaces multiple choice on a share of questions, so you work the answer out instead of picking from four
- **Correction round** — every mistake is re-asked with a hint and up to three tries
- **Results and history** — score, time taken, a per-question breakdown, and your last 50 quizzes

## How it is put together

The project is two workspaces:

```
math-edu/
├── frontend/   the Expo app — Android now, iOS later
└── backend/    bakes the content into packs and serves them
```

**The app ships with no questions in it.** Every question, story and puzzle
is baked by the backend into versioned packs, which the app downloads once,
caches on the device, and then plays entirely offline. New content — and new
kinds of content — reach a child without them installing an app update.

A launch never waits on the network:

1. Whatever finished downloading last time is promoted (a one-line file write).
2. The app opens from its own cache and is immediately usable.
3. Some time later, in the background and at most once every six hours, it
   asks the server whether anything moved. Usually the answer is a 304.
4. Anything new is verified against its SHA-256 and staged. It takes effect
   **at the next restart** — so content can never change under a child
   part-way through a lesson.

With no network, or on a fresh install that has never reached the server, the
app plays the copy of the content bundled into the binary. See
[`backend/README.md`](backend/README.md) for the pack format, the publishing
and rollback story, and the rule that stops a content edit from resetting
anyone's saved progress.

## Getting started

**Requirements:** Node.js 18+, and JDK 17+ plus the Android SDK (or Xcode for
iOS) if you want to build the native app.

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

`npm run android` generates the native project, compiles it and installs it,
so the first run takes a few minutes. Subsequent runs are incremental, and
JavaScript changes hot-reload without rebuilding.

### Running against a content server

The app plays its bundled content unless it is told where to look:

```bash
npm run bake     # build the packs
npm run serve    # serve them on :8787

EXPO_PUBLIC_CONTENT_URL=http://10.0.2.2:8787 npm start
```

`10.0.2.2` is how the Android emulator reaches the host. With the variable
unset — which is how the tests run — the app never touches the network.

### Scripts

Run from the repository root:

| Command | What it does |
| --- | --- |
| `npm start` | Start the Metro dev server |
| `npm run android` | Build and run the native Android app |
| `npm run ios` | Build and run the native iOS app |
| `npm run web` | Run in the browser |
| `npm run bake` | Bake the content packs |
| `npm run serve` | Serve the baked packs |
| `npm test` | Run both suites, app and backend |

## The lesson map

Each grade is a fixed trail of **60 lessons**, played in order, divided into three difficulty bands of twenty. A lesson names its own subject — some are about `+` and `−`, some about `×` and `÷`, some about geometry, money, measuring, fractions, decimals or speed — so practice lands on one thing at a time instead of a scattershot of everything.

Difficulty only ever climbs within a grade: the first twenty lessons run on the Easy tier, the middle twenty on Normal and the last twenty on Hard, which is what decides how big the numbers get and how many answers have to be typed rather than picked. A lesson's tier comes from **where it sits** rather than from its definition, so the map re-bands itself whenever lessons are added and can never dip backwards.

The first twelve lessons of each grade are hand-written; the rest are built by `fillOut`, which widens the map as it goes — single-subject drills first, then pairs, then lessons mixing three subjects that can't be passed by remembering one method. Only the *shape* of a stop is decided this way (which topics, how many questions, whether it ends with a cake to cut); the questions themselves were always generated at play time, so no two runs of the same lesson are identical.

Finishing a lesson scores it out of three stars:

| Stars | Score on the first run |
| --- | --- |
| ★★★ | everything right |
| ★★ | 80% or better |
| ★ | 50% or better |
| — | below 50% — the lesson stays unfinished |

One star is a pass, and a pass opens the next lesson. Fall short and the correction round is a second chance: fixing enough mistakes rescues the lesson to a single star, which is enough to move on, but two and three stars stay reserved for a clean first run. Replaying a lesson can only ever improve its stars.

**Free practice** is still there under the map — a mixed quiz outside the trail, at whatever length you pick, on the adaptive difficulty described below.

## The reading map

The reading tab is the same trail, walked with stories instead of quizzes: **60 stories per grade — 300 in total, asking 1,155 questions** — played in order, scored out of three stars, each one opening the next. Each grade's map is divided into three difficulty bands of twenty.

A story is a **single paragraph**, sized for its grade — around 50 words at grade 1, growing to around 150 by grade 5 — followed by **3–5 questions** about it. The story is shown on its own first, to be read as many times as you like, and then stays on screen above every question, folded away with one tap if a question needs the room. Reading comprehension is not a memory test, so looking back is the point. It stays on screen in the correction round too.

The questions deliberately mix what they ask for, so that answering them means understanding the paragraph rather than pattern-matching one sentence:

| Kind | What it asks |
| --- | --- |
| Detail | something the paragraph states outright |
| Sequence | what happened first, next, or right after something else |
| Vocabulary | what a word or phrase means *here*, worked out from context |
| Inference | something true but never stated — why a character did that, how they felt |
| Main idea | what the whole paragraph was about, as opposed to one thing in it |

Stories live in `storyPacks/`, one file per grade, and are only ever **appended** to — the map's numbering comes from position alone, and progress is stored against the story id, so a story can be retitled but never renumbered or reordered. The six that opened each grade therefore stay first in it.

Every story is written by hand, questions and wrong answers included. Comprehension can't be generated the way `7 × 8` can: a distractor has to be wrong in an interesting way — a true statement that doesn't answer the question, a detail from the wrong part of the paragraph, a plausible reading the text rules out. Every answer's explanation points back at the sentence that settles it, so the correction round teaches where to look rather than just what was right.

Grades 1–2 are mostly narrative — a lost mitten, a lemonade stand that moves to a better corner. Grades 3–5 mix stories with non-fiction, so that later grades also practise reading to *learn* something: how tide pools survive the sun, why bread rises, where the sea's salt comes from, why mapmakers hid fake streets in their maps.

### Reading out loud

Before the questions, a story can also be **read aloud**. Tapping the microphone starts listening, and the words light up green as they are heard; **60% of the story earns the star** on the button that goes on to the questions.

It is entirely optional, and never a gate. The button that skips straight to the questions is always there, a child can stop half way, and on a device that cannot listen the microphone simply isn't shown. A quiet room, a shy reader and an older tablet all still play the whole app.

Matching what was heard against the story is easier than transcribing speech, because the words are already known: the transcript is walked against the paragraph with a cursor that only moves forward, so a word repeated later in the story is credited to the place it was actually read, a word the recogniser drops is stepped over, and a word it invents is ignored. Losing your place is recoverable — hearing a word that occurs exactly once in the story is enough to re-sync on. Because it is a left-to-right fold that only ever marks words as heard, the score cannot go backwards as the live transcript grows, so words never un-highlight themselves mid-sentence.

Two things make it work on children's voices, which speech recognisers are famously bad at. The story's own vocabulary is handed to the recogniser as biasing hints, so its guesses lean towards the words that are actually coming. And the bar is participation, not pronunciation: 60% heard means *this was read aloud*, which is the thing worth encouraging.

**Nothing is recorded and no audio leaves the tablet.** Recognition is on-device only — `requiresOnDeviceRecognition`, backed by the offline language model. If a device can't do that, the feature hides itself rather than falling back to a cloud recogniser, which is a rule the tests enforce rather than a promise in a comment.

## The logic map

The third tab trains reasoning rather than knowledge: **60 puzzle sets per grade**, played in order, scored out of three stars like everything else. Every puzzle is generated, so a set is different each time it is played, and every one explains its rule afterwards — the point is to teach the pattern, not to score the child.

As on the maths map, the six sets that opened each grade are hand-written and the rest are filled out from the families that grade has met, one family at a time to begin with — so a child can settle into a kind of thinking — then pairs, and finally mixtures where the first job is working out what sort of puzzle you are even looking at.

Thirteen kinds of puzzle, in two groups. The **written** ones:

| Puzzle | Example |
| --- | --- |
| Number sequences | `4, 9, 16, 25, ?` — steps, growing gaps, doubling, squares, Fibonacci |
| Letter sequences | `G, H, J, M, ?` — constant or growing jumps along the alphabet |
| Odd one out | *shelf, chair, desk, duck* — three from one category, one from another |
| Number rules | *28, 21, 71, 70* — three share a factor, one doesn't |
| Analogies | *finger is to hand as leaf is to …?* — six relations, from young animals to opposites |
| Syllogisms | *All doops are wugs. All wugs are grints. Which must be true?* |
| Balance scales | *3 🍐 balance 1 🍌, 3 🍌 balance 1 🥕 — how many 🍐 balance 1 🥕?* |
| Deduction grids | four children, four pets, a handful of clues — who has the cat? |

…and the **drawn** ones, where nothing is written at all, so they work the same for a child who is still a shaky reader:

| Puzzle | What it asks |
| --- | --- |
| Shape series | `● ●● ●●● ?` — one more each step, or the shape cycles, or both at once |
| Grid patterns | a 2×2 or 3×3 matrix where the row sets the shape and the column the count |
| Turning | which tile is this lopsided figure after a quarter or half turn? |
| Mirrors | which tile is its reflection — as opposed to a rotation of it? |
| Odd shape out | four tiles where exactly one property splits them three against one |

Three design rules hold the drawn puzzles together. Figures for the turning and mirror puzzles are drawn until they are **lopsided enough that all four turns and the mirror look different** — a symmetrical figure would leave the question with no single right answer. The odd-one-out tiles vary their other properties deliberately, so **only one property splits them three against one** and there is no second defensible answer. And every wrong answer is a **near miss** — the right shape with the wrong count, the figure turned the wrong way, the mirror where a rotation was asked for — rather than something a child can dismiss at a glance.

Families arrive as a grade can hold them: drawn patterns from grade 1, because they need no reading; word links and mirrors from grade 2; balance scales and number rules from grade 3; deduction grids from grade 4; formal syllogisms at grade 5. The map's later sets mix several families at once.

Deduction grids are built answer-first: the generator picks who has what, then adds clues that are true of that arrangement until brute force says only one arrangement survives, then **drops every clue the others already cover** — so the puzzle is always solvable by reasoning alone, and never has a line in it that does nothing.

## Coins

Coins reward getting things right rather than just turning up. Nothing is ever deducted; a weak run simply earns less.

| Earned for | Coins |
| --- | --- |
| Each correct answer | 2 |
| Each mistake fixed in the correction round | 1 |
| Each combo milestone reached | 3 |
| Finishing a lesson, story or puzzle set with no mistakes | 10 |
| Passing a lesson, story or puzzle set for the first time | 5 |
| Finishing a daily challenge | 15–30 |

There is one purse for the whole app, so all three parts pay into it. The results screen itemises where a session's coins came from, and the running purse sits at the top of both home screens.

## Daily challenges

Three goals are drawn each day and shown as progress bars. They are deliberately gentle — the point is that a normal session finishes at least one or two. They span all three subjects: a reading story or a puzzle set counts wherever a lesson does, so a day can be finished off in whichever part of the app you feel like.

The three are drawn one from each of these groups, so a day is never three hard goals at once:

- **Turning up** — finish a lesson or story · play 2 rounds · get 15 answers right
- **Accuracy** — get a round completely right · fix 2 mistakes · get 25 answers right
- **Streaks** — get 3 right in a row · get 5 right in a row · earn 60 coins

The draw is seeded by the date, so the same day always yields the same three, and they reset at local midnight. A goal pays out the instant its bar fills, and only once. Streak goals keep your *best* run of the day rather than adding runs together.

## Combos

Answering correctly builds a streak. It pays out at **3 in a row and every other correct answer after that** — 3, 5, 7, 9 and on — and each milestone springs a burst across the question that scales in, holds, then floats away. A counter sits in the header from two in a row so you can see the streak building, and a wrong answer quietly resets it.

The burst is the only live feedback during a quiz: individual answers still aren't marked right or wrong until the results screen, so a run is celebrated without any single mistake being called out mid-quiz.

## How difficulty works

Free practice adapts to how you are doing. Each grade has three tiers — Easy, Normal and Hard — starting at Normal. After a practice quiz:

- accuracy below **50%** steps the tier down
- accuracy of **90%** or more steps it up
- anything in between holds steady

The tier controls how big the numbers get, which question types appear, and how many questions are typed rather than multiple choice (**25% → 50% → 75%** as the tier rises). Questions that only make sense with the options visible, like *"which fraction is the largest?"*, always stay multiple choice.

Lessons on the map don't adapt — each carries a fixed tier, so the trail's difficulty is the same every time you play it.

Typed answers are graded by value rather than by text, so `5` is accepted for `5.0`, and `1/2` is accepted for `4/8`.

## Question types by grade

| Grade | Arithmetic | Story problems | Geometry | Measurement | Money | Speed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | addition, subtraction, missing operand | legs and feet, giving and receiving, how many were given away | sides and corners | — | — | — |
| 2 | larger sums, times tables, missing operand | equal groups, animals and vehicles, how many more are needed | sides, corners, perimeter | cm to mm, lengths end to end | counting coins, change | — |
| 3 | multiplication, division, missing factor | sharing out evenly, cents, weeks to days | perimeter, area | m to cm, litres to ml, mixed units | change, how many can you buy | distance from speed and time |
| 4 | long multiplication, division, fractions, missing operand | buses needed, change from a purchase, area vs. perimeter | area, triangle area, angles, volume | km to m, capacity, differences | fewest coins, budgets, leftovers | distance, time |
| 5 | decimals, order of operations, comparing fractions | shopping totals, percentages, averages | angles, triangle area, volume, diameter | conversions, filling glasses | budgets in dollars, fewest coins | distance, time, speed, catching up |

Every grade also gets one **drawing puzzle** per quiz (for quizzes of five questions or more), and lessons built around drawing get two.

The table above is the mixed free-practice quiz. Lessons draw from the same generators, with one addition: grades 4 and 5 also get plain multi-digit addition and subtraction, so those grades can have a lesson about `+` and `−` rather than only meeting them inside longer problems.

Wrong answers are deliberate near-misses rather than random numbers — confusing area with perimeter, rounding buses down instead of up, forgetting to halve when finding a triangle's area, subtracting before converting units, or reporting a total where an average was asked for.

## The drawing puzzles

Each cut is a full chord across the cake, so a rough swipe still slices cleanly from edge to edge. The piece count comes from a simple rule: **every cut adds one piece, plus one more for each existing cut it crosses at a new point.** That is what makes the classic puzzle work — three cuts through the middle all meet at the same point, so the third adds 2 pieces rather than 3, giving 6 slices instead of 7.

Crossings that land within 8% of the cake's radius count as the same point, so "send every cut through the middle" is achievable with a finger rather than a ruler. The live piece count updates as you draw, and Undo and Start over are always available.

## Project structure

```
App.tsx                  subject tabs, screen routing, session state, rewards
src/
  types.ts               shared types
  theme.ts               colours and prompt sizing
  lib/
    generator.ts         shared question-building primitives
    questions.ts         arithmetic generators, quiz assembly, answer grading
    mapProgress.ts       stars and unlocking, shared by all three maps
    lessons.ts           the fixed lesson map
    stories.ts           the reading map, assembled from the packs below
    storyPacks/          300 hand-written stories, one file per grade
    readAloud.ts         matching a spoken transcript against a passage
    speech.ts            the recogniser, on-device only
    puzzles.ts           the logic map and its puzzle families
    logic/figures.ts     shape and grid tiles, turning and mirroring
    logic/textPuzzles.ts sequences, analogies, syllogisms, deduction
    logic/visualPuzzles.ts  drawn series, matrices, rotations, mirrors
    progress.ts          coin rates, combo milestones, daily challenges
    wordProblems.ts      real-world story-problem library
    geometry.ts          shapes, angles, area and volume
    measurement.ts       length and capacity, unit conversions
    money.ts             coins, change and budgets
    physics.ts           speed, distance and time
    drawPuzzles.ts       cut-the-cake puzzle definitions
    cakeCuts.ts          cut geometry and piece counting
    storage.ts           history, tiers, coins, map progress, the day
    format.ts            elapsed-time formatting
  screens/               Home, Quiz, Results, Correction
  components/            ChoiceButton, NumberPad, CutBoard, ElapsedTimer,
                         MapTrail, StoryPassage, ReadAloud, SubjectTabs,
                         PuzzleTile, PuzzleBoard, DailyChallenges, ComboBurst
```

The three subjects share almost everything below the content. Every puzzle and every comprehension question is an ordinary `Question`, so the quiz, correction and results screens work unchanged; a lesson, a story and a puzzle set are all a `MapStop`, so `mapProgress.ts` handles stars and unlocking for all of them and `MapTrail` draws any of the maps. What each subject supplies on its own is its content, its map's caption lines, and one extra: reading adds the passage that rides along with the questions, and logic adds a `puzzle` field carrying the tiles to draw.

Question pools are split two ways. `generateQuiz` builds the mixed free-practice quiz by weighting whole topics against each other; `lessonPools` splits the same generators finer — arithmetic into `+ −` and `× ÷` — so a lesson can draw from one subject. Pools that don't apply to a grade come back empty and drop out of the allocation, so a lesson never has to check what its grade supports.

Topics are weighted rather than hardcoded per quiz: pools that are empty for a grade (speed problems before grade 3, say) drop out and their share is spread across the rest, so the question count always adds up exactly.

Progress is stored on the device with AsyncStorage — there is no account, no server, and nothing leaves the device. That holds for the microphone too: reading aloud is recognised on-device, no audio is recorded or kept, and if a device can't recognise speech offline the feature is withheld rather than sent to a server.

## Testing

```bash
npm test
```

The suite checks that generated questions are internally consistent — every equation balances once the answer is substituted back in (including missing-operand prompts like `10 - ? = 4`), choices are unique and always contain the right one, grade-1 answers stay within range, and no generator renders a malformed sentence. It also covers the answer-grading rules, the number-pad input rules, and the cut geometry: one cut makes two pieces, two crossing cuts make four, three through the middle make six, and three in general position make seven.

For the map and the rewards it checks that every grade has the same fixed set of lessons, that difficulty never dips as a grade goes on, that each lesson only points at pools its grade actually has, and that a `+ −` lesson really does stay off `×` and `÷`. Coins, combo milestones and the daily draw are tested as plain functions — a stronger run always earns more than a weaker one, streak goals keep the best run rather than adding runs up, and a finished goal pays exactly once.

The reading library is hand-written, so the suite guards it the way a proofreader would: every paragraph sits inside its grade's word-count band and the bands climb grade by grade, every story asks 3–5 questions and checks at least two different kinds of comprehension, and every question has exactly one right answer, three distinct wrong ones and an explanation that points back at the text. Ids are checked for uniqueness across the whole library, and the story map is checked to unlock independently of the lesson map.

Reading aloud is scored by a pure function, so it is tested without a microphone anywhere in sight: a story read straight through scores 100%, case and punctuation are ignored, a repeated word is credited to the place it was actually read, a skipped word is stepped over and an invented one dropped, a unique word re-syncs after a large skip while a common one never leaps ahead, and saying the story twice cannot score above full marks. Two properties are checked across every story in the library: the passage survives being split into per-word spans without losing a single space, and the score never decreases as the live transcript grows word by word. The component is driven through a stand-in recogniser: the privacy rule is a test — a device without on-device support is never allowed to start listening — alongside the permission refusal, the wait for the offline model, a pause not ending the session, Android ending a turn mid-story being restarted, and the pass at exactly 60%.

The logic puzzles are checked as properties rather than by example, because they are generated: four quarter turns return a figure to where it started and a quarter turn moves the top row to the right-hand column; the figures offered for turning are lopsided enough that all four turns and the mirror differ; every odd-one-out has exactly one property splitting the tiles three against one; every deduction grid has exactly one arrangement consistent with its clues; letter runs never fall off the end of the alphabet, and number runs stay positive and whole while the answer genuinely continues them. Every drawn puzzle is checked to offer four different pictures.

The screens are rendered with `react-test-renderer` and driven the way a player would drive them: tapping a stop on the map, then answering by choice, by number pad or by cutting the cake, depending on what each question asks. `src/__tests__/app.test.tsx` plays a whole lesson end to end and asserts what lands in storage — coins banked, stars recorded, the next lesson opened — plus the correction round rescuing a failed lesson to a single star, and the challenges resetting when the stored day is stale. It does the same across the tab bar for the other two: a story played end to end lands its stars on the reading map only, files its result under reading, and keeps the paragraph on screen through both the questions and the correction round; a puzzle set lands on the logic map alone, and every one of its answers is drawn.

## License

MIT © boringfy — see [LICENSE](LICENSE).
