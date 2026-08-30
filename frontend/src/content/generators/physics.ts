// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/**
 * Speed, distance and time. The same relationship asked three ways, so the
 * rearranging is the point rather than the arithmetic.
 */

const VEHICLES = ['train', 'bus', 'ferry', 'coach', 'delivery van', 'tram'];
const RIDERS = ['cyclist', 'runner', 'hiker', 'skater'];

/** distance = speed × time */
export function distanceFromSpeedTime(maxSpeed: number, maxHours: number, rng: Rng): Question {
  const vehicle = rng.pick(VEHICLES);
  const speed = rng.randInt(1, maxSpeed / 10) * 10;
  const hours = rng.randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    rng,
    `A ${vehicle} travels at ${speed} km per hour for ${hours} hours. How far does it go in km?`,
    String(distance),
    // Adding the two numbers, and being an hour out.
    numPool(distance, [speed + hours, distance - speed, distance + speed]),
    `Distance = speed × time = ${speed} × ${hours} = ${distance} km`,
    'integer',
  );
}

/** time = distance ÷ speed */
export function timeFromDistanceSpeed(maxSpeed: number, maxHours: number, rng: Rng): Question {
  const vehicle = rng.pick(VEHICLES);
  const speed = rng.randInt(1, maxSpeed / 10) * 10;
  const hours = rng.randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    rng,
    `A ${vehicle} travels ${distance} km at ${speed} km per hour. How many hours does the journey take?`,
    String(hours),
    // Multiplying when you should divide, and dividing the wrong way round.
    numPool(hours, [distance - speed, speed]),
    `Time = distance ÷ speed = ${distance} ÷ ${speed} = ${hours} hours`,
    'integer',
  );
}

/** speed = distance ÷ time */
export function speedFromDistanceTime(maxSpeed: number, maxHours: number, rng: Rng): Question {
  const who = rng.pick([...VEHICLES, ...RIDERS]);
  const speed = rng.randInt(1, maxSpeed / 5) * 5;
  const hours = rng.randInt(2, maxHours);
  const distance = speed * hours;
  return makeQuestion(
    rng,
    // No pronoun: `who` may be a person, and the prompt reads fine without one.
    `A ${who} covers ${distance} km in ${hours} hours. What is the speed in km per hour?`,
    String(speed),
    numPool(speed, [distance, hours, distance - hours]),
    `Speed = distance ÷ time = ${distance} ÷ ${hours} = ${speed} km per hour`,
    'integer',
  );
}

/** Two travellers covering the same route — a comparison of speeds. */
export function whoIsFaster(rng: Rng): Question {
  const hours = rng.randInt(2, 5);
  const fastSpeed = rng.randInt(6, 20) * 5;
  const slowSpeed = fastSpeed - rng.randInt(1, 5) * 5;
  const gap = (fastSpeed - slowSpeed) * hours;
  return makeQuestion(
    rng,
    `A train travels at ${fastSpeed} km per hour and a bus at ${slowSpeed} km per hour. After ${hours} hours, how many km ahead is the train?`,
    String(gap),
    // Comparing the speeds without accounting for the time.
    numPool(gap, [fastSpeed - slowSpeed, fastSpeed * hours, slowSpeed * hours]),
    `The train gains ${fastSpeed} - ${slowSpeed} = ${fastSpeed - slowSpeed} km each hour, so in ${hours} hours it is ${gap} km ahead`,
    'integer',
  );
}
