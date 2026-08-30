/**
 * Which question kinds a grade may be asked, and at what settings.
 *
 * This is the ORIGINAL curriculum: the fixed 5x3 grid of (grade, tier) that
 * the 60 authored lessons per grade are built from. It is frozen. The packs
 * baked from it are pinned by `goldenHash.test.ts`, and the lessons that draw
 * on them are pinned by `stopIds.test.ts` — a child thirty stops into grade 3
 * keeps the map they know.
 *
 * Difficulty past those 60 lessons is not described here at all. It lives in
 * `src/factories`, on one continuous `d` scale that runs past where this grid
 * stops. This file feeds the bake; that one feeds the endless levels.
 *
 * It lives in `content/` rather than `generators/` on purpose: the generators
 * are shipped to the device, and none of this is. What the device needs is a
 * factory and a difficulty, not a grade and a tier.
 */

import { Grade, Question, Tier, TopicKey } from '../contract';
import { Gen, ambient } from '../generators/generator';
import { circleDiameter, cornersOfShape, cuboidVolume, missingAngleQuadrilateral, missingAngleStraightLine, missingAngleTriangle, sidesOfShape, squareArea, squarePerimeter, triangleArea } from '../generators/geometry';
import { containerTotal, howManyGlasses, lengthConversion, lengthDifference, liquidLeft, litresToMillilitres, mixedLengthTotal, totalLength } from '../generators/measurement';
import { changeInCents, coinTotal, fewestCoins, howManyCanBuy, howManyCanBuyDollars, moneyLeftOver } from '../generators/money';
import { digitPlace, evenOrOdd, expandedForm, greatestOrSmallest, placeParts, roundToTen, skipCount, stepBy } from '../generators/numberSense';
import { distanceFromSpeedTime, speedFromDistanceTime, timeFromDistanceSpeed, whoIsFaster } from '../generators/physics';
import { addition, decimalAddSub, decimalMultiplication, division, dotArray, doubleOrHalf, fractionAddSub, largestFraction, missingAddend, missingDivisionPart, missingFactor, missingSubtractionPart, multiplication, orderOfOperations, repeatedAddition, subtraction, tableDivision, tableMultiplication, tripleAddition } from '../generators/questions';
import { elapsedMinutes, hoursToMinutes, readClock, timeLater, whichClock } from '../generators/time';
import { averageProblem, busesProblem, changeProblem, coinsProblem, fractionOfSetProblem, gaveSomeAwayStory, howManyMoreNeeded, joinStory, legsProblem, moneyDecimalProblem, packsProblem, percentProblem, receivedSomeStory, rectangleProblem, shareEquallyProblem, takeAwayStory, weekDaysProblem, wheelsProblem } from '../generators/wordProblems';

/**
 * Every question kind a grade can be asked, split by topic so a lesson can be
 * about one thing. Arithmetic is broken into '+ −' and '× ÷' rather than left
 * as one pool.
 *
 * Pools that don't apply to a grade come back empty, and the bake skips them
 * (`mathPools`), so a lesson never has to check what its grade supports.
 */
export function lessonPools(grade: Grade, tier: Tier): Record<TopicKey, Gen[]> {
  const empty: Record<TopicKey, Gen[]> = {
    addSub: [],
    mulDiv: [],
    fractions: [],
    decimals: [],
    order: [],
    word: wordProblemsFor(grade, tier),
    geometry: geometryFor(grade, tier),
    measurement: measurementFor(grade, tier),
    money: moneyFor(grade, tier),
    speed: physicsFor(grade, tier),
    time: timeFor(grade, tier),
    place: numberSenseFor(grade, tier),
  };

  switch (grade) {
    case 1: {
      const limit = tier === 1 ? 10 : 20;
      empty.addSub = [
        () => addition(limit, ambient),
        () => subtraction(limit, ambient),
        () => missingAddend(limit, ambient),
        () => missingSubtractionPart(limit, ambient),
      ];
      if (tier === 3) empty.addSub.push(() => tripleAddition(9, ambient));
      break;
    }
    case 2: {
      const limit = tier === 1 ? 50 : tier === 2 ? 100 : 200;
      const tables = tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
      empty.addSub = [
        () => addition(limit, ambient),
        () => subtraction(limit, ambient),
        () => missingAddend(limit, ambient),
        () => missingSubtractionPart(limit, ambient),
        () => tripleAddition(tier === 1 ? 9 : 20, ambient),
      ];
      empty.mulDiv = [
        () => tableMultiplication(tables, 10, ambient),
        () => tableDivision(tables, tier === 1 ? 5 : 10, ambient),
        () => doubleOrHalf(tier === 1 ? 20 : 50, ambient),
        () => dotArray(tier === 1 ? 4 : 5, tier === 1 ? 5 : 6, ambient),
        () => repeatedAddition(tables, tier === 1 ? 3 : 5, ambient),
      ];
      if (tier >= 2) empty.mulDiv.push(() => missingFactor(5, ambient));
      break;
    }
    case 3: {
      const maxFactor = tier === 1 ? 5 : tier === 2 ? 10 : 12;
      const limit = tier === 1 ? 300 : 1000;
      empty.addSub = [
        () => addition(limit, ambient),
        () => subtraction(limit, ambient),
        () => missingAddend(limit, ambient),
        () => missingSubtractionPart(limit, ambient),
      ];
      empty.mulDiv = [
        () => multiplication([2, maxFactor], [2, maxFactor], ambient),
        () => division(maxFactor, maxFactor, ambient),
        () => missingFactor(maxFactor, ambient),
        () => missingDivisionPart(maxFactor, maxFactor, ambient),
      ];
      break;
    }
    case 4: {
      const limit = tier === 1 ? 500 : tier === 2 ? 2000 : 9999;
      const bigFactor: [number, number] =
        tier === 1 ? [11, 49] : tier === 2 ? [11, 99] : [101, 999];
      empty.addSub = [
        () => addition(limit, ambient),
        () => subtraction(limit, ambient),
        () => missingAddend(limit, ambient),
        () => missingSubtractionPart(limit, ambient),
      ];
      empty.mulDiv = [
        () => multiplication(bigFactor, [2, 9], ambient),
        () => division(9, tier === 1 ? 20 : 99, ambient),
        () => missingFactor(tier === 1 ? 9 : 12, ambient),
        () => missingDivisionPart(9, tier === 1 ? 20 : 50, ambient),
      ];
      empty.fractions = [() => fractionAddSub(ambient)];
      break;
    }
    case 5: {
      const limit = tier === 1 ? 2000 : 9999;
      const decimals = tier === 1 ? 1 : 2;
      empty.addSub = [
        () => addition(limit, ambient),
        () => subtraction(limit, ambient),
        () => missingSubtractionPart(limit, ambient),
      ];
      empty.mulDiv = [
        () => multiplication([11, 99], [2, 12], ambient),
        () => division(12, 99, ambient),
        () => missingFactor(12, ambient),
        () => missingDivisionPart(12, 50, ambient),
      ];
      empty.fractions = [() => fractionAddSub(ambient), () => largestFraction(ambient)];
      empty.decimals = [() => decimalAddSub(decimals, ambient), () => decimalMultiplication(ambient)];
      empty.order = [() => orderOfOperations(false, ambient)];
      if (tier >= 2) empty.order.push(() => orderOfOperations(true, ambient));
      break;
    }
  }
  return empty;
}

/** Story problems suitable for a grade at a difficulty tier. */
export function wordProblemsFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1: {
      const limit = tier === 1 ? 10 : 20;
      const gens: Gen[] = [
        () => joinStory(limit, ambient),
        () => takeAwayStory(limit, ambient),
        () => legsProblem(limit, ambient),
        () => gaveSomeAwayStory(limit, ambient),
        () => receivedSomeStory(limit, ambient),
      ];
      if (tier >= 2) gens.push(() => wheelsProblem(limit, ambient));
      return gens;
    }
    case 2: {
      const limit = tier === 1 ? 50 : tier === 2 ? 100 : 200;
      const groupSizes = tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 10];
      return [
        () => joinStory(limit, ambient),
        () => takeAwayStory(limit, ambient),
        () => legsProblem(tier === 1 ? 24 : 48, ambient),
        () => wheelsProblem(tier === 1 ? 24 : 48, ambient),
        () => packsProblem(tier === 1 ? 5 : 10, groupSizes, ambient),
        () => gaveSomeAwayStory(limit, ambient),
        () => howManyMoreNeeded(limit, ambient),
      ];
    }
    case 3: {
      const maxFactor = tier === 1 ? 5 : tier === 2 ? 10 : 12;
      return [
        () => shareEquallyProblem(maxFactor, maxFactor, ambient),
        () => packsProblem(maxFactor, [2, 3, 4, 5, 6, 10], ambient),
        () => coinsProblem(tier === 1 ? 9 : 25, maxFactor, ambient),
        () => legsProblem(tier === 1 ? 48 : 96, ambient),
        () => weekDaysProblem(tier === 1 ? 5 : 12, ambient),
        () => howManyMoreNeeded(tier === 1 ? 50 : 200, ambient),
      ];
    }
    case 4: {
      const gens: Gen[] = [
        () => busesProblem(ambient),
        () => changeProblem(tier === 1 ? 5 : 12, tier === 1 ? 4 : 8, ambient),
        () => rectangleProblem('area', tier === 1 ? 9 : 20, ambient),
        () => rectangleProblem('perimeter', tier === 1 ? 9 : 20, ambient),
      ];
      if (tier >= 2) gens.push(() => fractionOfSetProblem(ambient));
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => moneyDecimalProblem(ambient),
        () => percentProblem(ambient),
        () => averageProblem(ambient),
      ];
      if (tier >= 2) gens.push(() => changeProblem(20, 9, ambient), () => fractionOfSetProblem(ambient));
      return gens;
    }
  }
}

/** Geometry generators for a grade at a difficulty tier. */
export function geometryFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
      return [() => sidesOfShape(ambient), () => cornersOfShape(ambient)];
    case 2:
      return [
        () => sidesOfShape(ambient),
        () => cornersOfShape(ambient),
        () => squarePerimeter(tier === 1 ? 5 : 10, ambient),
      ];
    case 3:
      return [
        () => squarePerimeter(tier === 1 ? 9 : 20, ambient),
        () => squareArea(tier === 1 ? 6 : 12, ambient),
        () => sidesOfShape(ambient),
      ];
    case 4: {
      const gens: Gen[] = [
        () => squareArea(tier === 1 ? 9 : 15, ambient),
        () => triangleArea(tier === 1 ? 8 : 16, tier === 1 ? 6 : 12, ambient),
        () => missingAngleStraightLine(ambient),
        () => cuboidVolume(tier === 1 ? 5 : 9, ambient),
      ];
      if (tier >= 2) gens.push(() => missingAngleTriangle(ambient));
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => missingAngleTriangle(ambient),
        () => triangleArea(20, 15, ambient),
        () => cuboidVolume(12, ambient),
        () => circleDiameter(ambient),
      ];
      if (tier >= 2) gens.push(() => missingAngleQuadrilateral(ambient));
      return gens;
    }
  }
}

/** Length and capacity generators for a grade at a difficulty tier. */
export function measurementFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
      // Unit conversion lands after grade 1.
      return [];
    case 2:
      return [
        () => lengthConversion(['cm'], tier === 1 ? 5 : 9, ambient),
        () => totalLength(tier === 1 ? 4 : 6, ambient),
      ];
    case 3:
      return [
        () => lengthConversion(['cm', 'm'], tier === 1 ? 5 : 9, ambient),
        () => totalLength(6, ambient),
        () => mixedLengthTotal(ambient),
        () => litresToMillilitres(tier === 1 ? 4 : 9, ambient),
      ];
    case 4: {
      const gens: Gen[] = [
        () => lengthConversion(['cm', 'm', 'km'], 9, ambient),
        () => mixedLengthTotal(ambient),
        () => containerTotal(ambient),
        () => liquidLeft(ambient),
      ];
      if (tier >= 2) gens.push(() => lengthDifference(ambient));
      return gens;
    }
    case 5:
      return [
        () => lengthConversion(['m', 'km'], 20, ambient),
        () => lengthDifference(ambient),
        () => howManyGlasses(ambient),
        () => liquidLeft(ambient),
        () => containerTotal(ambient),
      ];
  }
}

/** Money generators for a grade at a difficulty tier. */
export function moneyFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
      // Coin values outgrow the grade 1 number range.
      return [];
    case 2:
      return [() => coinTotal(2, ambient), () => changeInCents(tier === 1 ? 30 : 45, ambient)];
    case 3:
      return [
        () => coinTotal(2, ambient),
        () => changeInCents(90, ambient),
        () => howManyCanBuy(tier === 1 ? 60 : 99, ambient),
      ];
    case 4: {
      const gens: Gen[] = [
        () => coinTotal(3, ambient),
        () => howManyCanBuy(99, ambient),
        () => moneyLeftOver(99, ambient),
        () => fewestCoins(tier === 1 ? 40 : 99, ambient),
      ];
      if (tier >= 2) gens.push(() => changeInCents(99, ambient));
      return gens;
    }
    case 5:
      return [
        () => howManyCanBuyDollars(ambient),
        () => fewestCoins(99, ambient),
        () => moneyLeftOver(99, ambient),
        () => coinTotal(3, ambient),
      ];
  }
}

/**
 * Number sense generators for a grade at a difficulty tier.
 *
 * Grade 2 only for now — every generator takes its size as an argument, so
 * another grade is one line here.
 */
export function numberSenseFor(grade: Grade, tier: Tier): Gen[] {
  if (grade !== 2) return [];
  const length = tier === 1 ? 2 : 3;
  const gens: Gen[] = [
    () => digitPlace(length, ambient),
    () => placeParts(length, ambient),
    () => evenOrOdd(tier === 1 ? 40 : 99, ambient),
    () => skipCount(tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 5, 10] : [3, 4, 5, 10, 25], tier === 1 ? 60 : 200, ambient),
    () => stepBy(10, tier === 1 ? 90 : 490, ambient),
  ];
  if (tier >= 2) {
    gens.push(() => expandedForm(ambient), () => greatestOrSmallest(ambient), () => roundToTen(tier === 2 ? 99 : 199, ambient));
  }
  if (tier === 3) gens.push(() => stepBy(100, 899, ambient));
  return gens;
}

/** Speed and distance generators for a grade at a difficulty tier. */
export function physicsFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
    case 2:
      // Rates need multiplication and division to be comfortable first.
      return [];
    case 3:
      return [() => distanceFromSpeedTime(tier === 1 ? 50 : 90, tier === 1 ? 4 : 6, ambient)];
    case 4: {
      const gens: Gen[] = [
        () => distanceFromSpeedTime(90, 6, ambient),
        () => timeFromDistanceSpeed(tier === 1 ? 50 : 90, 6, ambient),
      ];
      if (tier >= 2) gens.push(() => speedFromDistanceTime(60, 6, ambient));
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => distanceFromSpeedTime(120, 9, ambient),
        () => timeFromDistanceSpeed(120, 9, ambient),
        () => speedFromDistanceTime(80, 8, ambient),
      ];
      if (tier >= 2) gens.push(() => whoIsFaster(ambient));
      return gens;
    }
  }
}

/**
 * Clock generators for a grade at a difficulty tier.
 *
 * Wired into grade 2 only for now. Every generator takes its minute step as
 * an argument, so opening clocks up to another grade is one line here.
 */
export function timeFor(grade: Grade, tier: Tier): Gen[] {
  if (grade !== 2) return [];
  // Half hours, then quarters, then the five-minute marks.
  const step = tier === 1 ? 30 : tier === 2 ? 15 : 5;
  const gens: Gen[] = [
    () => readClock(step, ambient),
    () => whichClock(step, ambient),
    () => hoursToMinutes(ambient),
  ];
  if (tier >= 2) {
    gens.push(() => timeLater(step, ambient), () => elapsedMinutes(tier === 2 ? 30 : 55, ambient));
  }
  return gens;
}
