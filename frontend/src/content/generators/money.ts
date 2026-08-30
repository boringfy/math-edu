// GENERATED FILE — DO NOT EDIT.
// Copied from backend/src/generators by `npm run sync:shared`.
// Change the original and re-run that; edits here are overwritten.

import { Question } from '../contract';
import { Rng, makeQuestion, numPool } from './generator';

/** Counting coins, working out change, and what a fixed budget can buy. */

/** Coin values in cents, largest first — greedy change works on this set. */
const COINS = [25, 10, 5, 1];

const SHOP_ITEMS = ['sticker', 'pencil', 'rubber', 'marble', 'balloon', 'sweet', 'badge'];

const NAMES = ['Mia', 'Leo', 'Ava', 'Noah', 'Zoe', 'Omar', 'Lily', 'Sam'];

/** Adds up a handful of coins of two or three kinds. */
export function coinTotal(kinds: number, rng: Rng): Question {
  const name = rng.pick(NAMES);
  // 1c coins would make the sums tedious rather than interesting.
  const values = COINS.filter((v) => v !== 1);
  // Pick distinct coin kinds, biggest first so the sentence reads naturally.
  const chosen: { value: number; count: number }[] = [];
  const pool = [...values];
  for (let i = 0; i < kinds && pool.length > 0; i++) {
    const value = rng.pick(pool);
    pool.splice(pool.indexOf(value), 1);
    chosen.push({ value, count: rng.randInt(1, 5) });
  }
  chosen.sort((a, b) => b.value - a.value);

  const total = chosen.reduce((sum, c) => sum + c.value * c.count, 0);
  const parts = chosen.map((c) => `${c.count} ${c.value}-cent coin${c.count > 1 ? 's' : ''}`);
  const listed =
    parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  const working = chosen.map((c) => `${c.count} × ${c.value} = ${c.value * c.count}`).join(', ');
  const coinCount = chosen.reduce((sum, c) => sum + c.count, 0);

  return makeQuestion(
    rng,
    `${name} has ${listed}. How many cents is that altogether?`,
    String(total),
    // Counting the coins rather than their value, and adding the values once each.
    numPool(total, [coinCount, chosen.reduce((sum, c) => sum + c.value, 0)]),
    `${working} — altogether ${total} cents`,
    'integer',
  );
}

/** Change owed after paying with a round amount. */
export function changeInCents(maxPrice: number, rng: Rng): Question {
  const name = rng.pick(NAMES);
  const item = rng.pick(SHOP_ITEMS);
  const price = rng.randInt(5, maxPrice);
  // Pay with the next round 50 or 100 up, so the sum stays believable.
  const paid = price < 50 ? 50 : 100;
  const change = paid - price;
  return makeQuestion(
    rng,
    `A ${item} costs ${price} cents. ${name} pays with ${paid} cents. How much change in cents?`,
    String(change),
    // Adding instead of subtracting, and answering with the price paid.
    numPool(change, [paid + price, price, paid]),
    `${paid} - ${price} = ${change} cents`,
    'integer',
  );
}

/** The fewest coins that make a given amount. */
export function fewestCoins(maxAmount: number, rng: Rng): Question {
  const amount = rng.randInt(6, maxAmount);
  let left = amount;
  const used: number[] = [];
  for (const coin of COINS) {
    while (left >= coin) {
      left -= coin;
      used.push(coin);
    }
  }
  const breakdown = COINS.filter((c) => used.includes(c))
    .map((c) => `${used.filter((u) => u === c).length} × ${c}c`)
    .join(' + ');

  return makeQuestion(
    rng,
    `Using 25c, 10c, 5c and 1c coins, what is the smallest number of coins that makes ${amount} cents?`,
    String(used.length),
    // Paying entirely in 5s and 1s, or in 1s alone, takes more coins.
    numPool(used.length, [Math.ceil(amount / 5), used.length + 2]),
    `${breakdown} — that's ${used.length} coins`,
    'integer',
  );
}

/** How many items a fixed budget stretches to. */
export function howManyCanBuy(maxBudget: number, rng: Rng): Question {
  const name = rng.pick(NAMES);
  const item = rng.pick(SHOP_ITEMS);
  const price = rng.randInt(3, 25);
  const budget = rng.randInt(Math.max(price * 2, 20), maxBudget);
  const affordable = Math.floor(budget / price);
  return makeQuestion(
    rng,
    `${name} has ${budget} cents. One ${item} costs ${price} cents. How many can ${name} buy?`,
    String(affordable),
    // Rounding up instead of down, and reporting the money rather than the count.
    numPool(affordable, [affordable + 1, budget - price, price]),
    `${budget} ÷ ${price} = ${affordable} with some left over, so ${name} can buy ${affordable}`,
    'integer',
  );
}

/** The leftover after spending as much of a budget as possible. */
export function moneyLeftOver(maxBudget: number, rng: Rng): Question {
  const name = rng.pick(NAMES);
  const item = rng.pick(SHOP_ITEMS);
  const price = rng.randInt(4, 25);
  const budget = rng.randInt(Math.max(price * 2, 20), maxBudget);
  const affordable = Math.floor(budget / price);
  const left = budget - affordable * price;
  return makeQuestion(
    rng,
    `${name} has ${budget} cents and buys as many ${item}s as possible at ${price} cents each. How many cents are left over?`,
    String(left),
    // Answering with the number bought, or with the money spent.
    numPool(left, [affordable, affordable * price, budget - price]),
    `${name} buys ${affordable} for ${affordable * price} cents, leaving ${budget} - ${affordable * price} = ${left} cents`,
    'integer',
  );
}

/** Budgeting in dollars and cents, where the price has a decimal point. */
export function howManyCanBuyDollars(rng: Rng): Question {
  const name = rng.pick(NAMES);
  const item = rng.pick(['notebook', 'comic', 'smoothie', 'poster', 'keyring']);
  const price = rng.randInt(5, 24) / 2; // 2.5 … 12.0
  const budget = rng.pick([20, 25, 30, 40, 50]);
  const affordable = Math.floor(budget / price);
  const fmt = (n: number) => n.toFixed(2);
  return makeQuestion(
    rng,
    `${name} has $${budget}. One ${item} costs $${fmt(price)}. How many can ${name} buy?`,
    String(affordable),
    numPool(affordable, [affordable + 1, budget]),
    `$${budget} ÷ $${fmt(price)} = ${affordable} whole ${item}s`,
    'integer',
  );
}
