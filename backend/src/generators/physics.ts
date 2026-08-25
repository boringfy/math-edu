import { Grade, Question, Tier } from '../contract';
import { Gen, makeQuestion, numPool, pick, randInt } from './generator';

/**
 * Speed, distance and time. The same relationship asked three ways, so the
 * rearranging is the point rather than the arithmetic.
 */

const VEHICLES = ['train', 'bus', 'ferry', 'coach', 'delivery van', 'tram'];
const RIDERS = ['cyclist', 'runner', 'hiker', 'skater'];

/** distance = speed × time */
export function distanceFromSpeedTime(maxSpeed: number, maxHours: number): Question {
  const vehicle = pick(VEHICLES);
  const speed = randInt(1, maxSpeed / 10) * 10;
  const hours = randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    `A ${vehicle} travels at ${speed} km per hour for ${hours} hours. How far does it go in km?`,
    String(distance),
    // Adding the two numbers, and being an hour out.
    numPool(distance, [speed + hours, distance - speed, distance + speed]),
    `Distance = speed × time = ${speed} × ${hours} = ${distance} km`,
    'integer',
  );
}

/** time = distance ÷ speed */
export function timeFromDistanceSpeed(maxSpeed: number, maxHours: number): Question {
  const vehicle = pick(VEHICLES);
  const speed = randInt(1, maxSpeed / 10) * 10;
  const hours = randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    `A ${vehicle} travels ${distance} km at ${speed} km per hour. How many hours does the journey take?`,
    String(hours),
    // Multiplying when you should divide, and dividing the wrong way round.
    numPool(hours, [distance - speed, speed]),
    `Time = distance ÷ speed = ${distance} ÷ ${speed} = ${hours} hours`,
    'integer',
  );
}

/** speed = distance ÷ time */
export function speedFromDistanceTime(maxSpeed: number, maxHours: number): Question {
  const who = pick([...VEHICLES, ...RIDERS]);
  const speed = randInt(1, maxSpeed / 5) * 5;
  const hours = randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    // No pronoun: `who` may be a person, and the prompt reads fine without one.
    `A ${who} covers ${distance} km in ${hours} hours. What is the speed in km per hour?`,
    String(speed),
    numPool(speed, [distance, hours, distance - hours]),
    `Speed = distance ÷ time = ${distance} ÷ ${hours} = ${speed} km per hour`,
    'integer',
  );
}

/** Two travellers covering the same route — a comparison of speeds. */
export function whoIsFaster(): Question {
  const hours = randInt(2, 5);
  const fastSpeed = randInt(6, 20) * 5;
  const slowSpeed = fastSpeed - randInt(1, 5) * 5;
  const gap = (fastSpeed - slowSpeed) * hours;
  return makeQuestion(
    `A train travels at ${fastSpeed} km per hour and a bus at ${slowSpeed} km per hour. After ${hours} hours, how many km ahead is the train?`,
    String(gap),
    // Comparing the speeds without accounting for the time.
    numPool(gap, [fastSpeed - slowSpeed, fastSpeed * hours, slowSpeed * hours]),
    `The train gains ${fastSpeed} - ${slowSpeed} = ${fastSpeed - slowSpeed} km each hour, so in ${hours} hours it is ${gap} km ahead`,
    'integer',
  );
}

/** Speed and distance generators for a grade at a difficulty tier. */
export function physicsFor(grade: Grade, tier: Tier): Gen[] {
  switch (grade) {
    case 1:
    case 2:
      // Rates need multiplication and division to be comfortable first.
      return [];
    case 3:
      return [() => distanceFromSpeedTime(tier === 1 ? 50 : 90, tier === 1 ? 4 : 6)];
    case 4: {
      const gens: Gen[] = [
        () => distanceFromSpeedTime(90, 6),
        () => timeFromDistanceSpeed(tier === 1 ? 50 : 90, 6),
      ];
      if (tier >= 2) gens.push(() => speedFromDistanceTime(60, 6));
      return gens;
    }
    case 5: {
      const gens: Gen[] = [
        () => distanceFromSpeedTime(120, 9),
        () => timeFromDistanceSpeed(120, 9),
        () => speedFromDistanceTime(80, 8),
      ];
      if (tier >= 2) gens.push(() => whoIsFaster());
      return gens;
    }
  }
}
