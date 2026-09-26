# App Store listing — Have Fun Learning

Every field below is ready to paste into App Store Connect. Character counts are
Apple's limits; the count in brackets is what the text actually uses.

---

## App Name — limit 30

```
Have Fun Learning
```
[17]

## Subtitle — limit 30

```
Math, logic and reading
```
[23]

Alternates, if the first reads too dry:

```
Daily practice, grades 1 to 5
```
[29]

```
Three subjects, one long map
```
[28]

---

## Promotional Text — limit 170

Editable at any time without a new build, so this is the field to change for a
seasonal push or a new grade.

```
Three subjects on one map: math, reading and logic for grades 1 to 5. It adapts to each child, saves five levels offline, and has no ads, paywall or sign-up.
```
[157]

---

## Description — limit 4000

```
Have Fun Learning is a practice app for children in grades 1 to 5. Maths, reading and logic, laid out on one long map, a few minutes at a time.


THREE SUBJECTS, ONE MAP

Math — addition and subtraction through multiplication and division, fractions, decimals, percentages, money, telling the time, length, mass and volume, geometry, coordinates, averages and reading charts.

Reading — short stories written for each grade, with comprehension questions that go past "what colour was the door".

Logic — eighteen kinds of puzzle: sequences, analogies, odd-one-out, balance scales, grids and matrices, rotation and mirroring, folding and nets.

Each subject is a trail of lessons. Finish one and the next opens. Stars show how it went.


IT ADAPTS, WITHOUT SAYING SO

Have Fun Learning keeps track of which topics are solid and which are shaky, and changes what it asks accordingly. A child who has addition cold moves along; a child who is guessing gets easier numbers and more of them. No child is ever told they are on the slow track, because there isn't one — there is a single ladder and everybody stands somewhere on it.


SCRATCH PAPER

Real working out, on the screen. A sheet of scrap paper slides up for anything worth writing down, in five colours, with an eraser. Finger mode is the default; switch on Pencil mode on iPhone or Stylus mode on Android to keep a resting hand from making marks.


READING OUT LOUD

A child can read a story aloud and watch the words light up as they are heard. The listening happens entirely on the device. No audio is recorded, and none of it is sent anywhere.


SPEED ROUNDS

Now and then a whole lesson is a timed run of quick mental arithmetic. The clock is set from how fast that particular child has been answering lately, so it stays a stretch without becoming impossible.


MORE THAN ONE CHILD

Add a profile for each child. Separate progress, separate map, separate stars. Switching takes one tap, and no one has to give up their place.


WORKS WITH NO CONNECTION

Authored questions and stories are already in the app. The endless math and logic maps keep five planned levels ready, so learning can continue offline. Connect again after those five and the next levels are refreshed around recent performance and mistakes.


DAILY REMINDER

Choose a time for a local daily learning reminder. It is optional, stays on the device and can be switched off at any time.


NO ADS. NO PAYWALL. NO SIGN-UP.

All learning content is available without payment or an account. A grown-up can optionally send a tip from Settings; tips never add coins or unlock lessons. There is no advertising SDK or third-party advertising tracker. A grown-up may opt in to first-party usage counts on first launch and turn them off in Settings.
```
[Under 4000 characters]

---

## Keywords — limit 100 characters, comma separated

Apple already indexes the app name and subtitle, so none of those words are
repeated here. No spaces after the commas — each one would cost a character.

```
kids,child,practice,grade,school,homework,arithmetic,fraction,decimal,phonics,puzzle,quiz,tutor,brain
```
[101 — trim `brain` to fit; see the note below]

Safe version:

```
kids,child,practice,grade,school,homework,arithmetic,fraction,decimal,phonics,puzzle,quiz,tutor
```
[95]

---

## What's New — limit 4000

First submission, so this is the 1.0 text:

```
The first release.

Three subjects — maths, reading and logic — for grades 1 to 5, on one map that keeps going.

Scratch paper you can actually write on, stories you can read out loud, timed speed rounds that set their own clock, five levels saved for offline play, and an optional daily reminder.
```

---

## URLs

| Field | Value | Status |
| --- | --- | --- |
| Support URL | `https://hashfront.com/math-edu/support` | website route implemented; deploy before submission |
| Marketing URL | `https://math-edu.hashfront.com` | optional |
| Privacy Policy URL | `https://hashfront.com/math-edu/privacy` | website route implemented; deploy before submission |
| Terms of Service URL | `https://hashfront.com/math-edu/terms` | linked in Settings; Apple's standard EULA remains the licence unless a custom one is supplied |

A Support URL is mandatory and Apple does check that it loads. Publish the
Hashfront website and verify the new app-specific URLs in a private browser
before entering them in App Store Connect.

---

## Category

- **Primary:** Education
- **Secondary:** Games → Educational

See `REVIEW-NOTES.md` on whether to opt into the **Kids** category. Short
version: it is a meaningful restriction and the app collects a device
identifier today, so the default answer is no.

---

## Age Rating

Review the current age-rating questionnaire against the shipped binary. Do not
pre-fill every answer as **None** without checking any generative-AI question
and whether the online tutor is enabled. The app has no ads or user chat.

One question needs care: *"Does the app contain unrestricted web access?"* —
**No.** Settings opens only the fixed Hashfront legal pages, not an arbitrary
browser or user-entered URL.
