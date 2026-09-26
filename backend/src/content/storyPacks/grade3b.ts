import { StorySpec } from './storySpec';

/**
 * Two more levels for grade 3, carrying on from the first sixty.
 *
 * Those sixty sit flat: about ninety words and four questions each, all the
 * way through. These twenty climb, and along three axes at once rather than
 * simply running longer — length alone makes a story take more time, not more
 * thought.
 *
 *   length      about 110 words at the start, about 155 by the end, against
 *               the flat ninety of the first sixty
 *   structure   one thing happening, then two threads that have to be held
 *               together, then a story whose point is not what it appeared
 *               to be in the first sentence
 *   questions   four for the first ten, five for the last ten; and the mix
 *               moves from mostly "what happened" to mostly "why" and "what
 *               is this really about"
 *
 * That last axis is the one that matters and the one that quietly slips: a
 * longer story hands you more facts to ask about, so writing to length alone
 * drifts back to detail questions and the curve goes flat. The mix here is
 * counted, not felt: detail runs 59% across the old sixty, then 50% in level
 * 7 and 32% in level 8, with inference (30% / 38% / 44%) and main idea
 * (4% / 8% / 18%) taking the room it gives up.
 *
 * Every answer is findable in the text. An inference question asks a child to
 * put two sentences together, never to guess at something the story did not
 * say. The distractors are the wrong turns a child actually takes: the other
 * person in the story, the thing that happened just before, a detail that is
 * perfectly true but answers a different question.
 */
export const GRADE_3B: StorySpec[] = [
  /* ---------------------------------------------------- level 7 (61-70) -- */
  {
    title: 'The Wrong Kind of Quiet',
    icon: '🤫',
    text: `The library was always quiet, but on Thursday it was quiet in a different way. No chairs scraped. No one was at the desk. Ade found a note taped inside the glass door: CLOSED — BURST PIPE. THURSDAY ONLY. He cupped his hands against the window and saw a yellow bucket in the middle of the carpet and a dark stain spreading around it. A man in overalls was kneeling by the radiator with a torch. Ade had come to return a book that was due that day. He posted it through the returns slot anyway, then worried the whole way home that the slot might be underwater too.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Why was the library closed?',
        answer: 'A pipe had burst',
        distractors: ['It was a holiday', 'The staff were ill', 'It was being painted'],
        explanation: 'The note on the door said CLOSED — BURST PIPE.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why was the quiet "the wrong kind"?',
        answer: 'The building was empty, not just hushed',
        distractors: [
          'Someone was shouting inside',
          'The heating had been turned off',
          'It was busier than usual',
        ],
        explanation:
          'No chairs scraped and no one was at the desk — a library is normally quiet with people in it.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did Ade go to the library that day?',
        answer: 'To return a book that was due',
        distractors: ['To borrow a new book', 'To meet a friend', 'To use a computer'],
        explanation: 'The story says he had come to return a book that was due that day.',
        skill: 'detail',
      },
      {
        id: 'q4',
        prompt: 'Why did Ade worry on the way home?',
        answer: 'The water might reach the returned book',
        distractors: [
          'He had lost the book',
          'The library might never reopen',
          'He would be charged a fine',
        ],
        explanation:
          'He had seen water spreading inside, and he had posted his book through the slot into that same building.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Grit Before Frost',
    icon: '🧂',
    text: `The gritting lorries go out at nine in the evening, hours before anyone slips on anything. Nadia's uncle drives one. She always thought it was strange to spread salt on a dry road, and she said so. He explained that salt cannot melt ice that is not there yet, but it can stop it forming. The lorry lays a thin layer while the road is still warm from the day, and the traffic crushes it into the surface. By the time the temperature drops after midnight, the salt is already in place, mixed into whatever damp is on the road. Going out at six in the morning would be too late. By then the ice has set, and the salt has to fight it instead of preventing it.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What time do the lorries go out?',
        answer: 'Nine in the evening',
        distractors: ['Six in the morning', 'Midnight', 'Noon'],
        explanation: 'The story says the gritting lorries go out at nine in the evening.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did Nadia find strange?',
        answer: 'Spreading salt on a dry road',
        distractors: [
          'Driving a lorry at night',
          'How much salt was used',
          'That her uncle drove a lorry',
        ],
        explanation: 'She thought it was strange to spread salt on a dry road, and she said so.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the traffic help?',
        answer: 'It crushes the salt into the road surface',
        distractors: [
          'It keeps the road warm',
          'It clears the salt away',
          'It dries the road out',
        ],
        explanation: 'The lorry lays a thin layer and the traffic crushes it into the surface.',
        skill: 'detail',
      },
      {
        id: 'q4',
        prompt: 'What is the whole point of gritting early?',
        answer: 'Stopping ice forming is easier than melting it',
        distractors: [
          'The roads are emptier at night',
          'Salt works better in the dark',
          'Lorries are cheaper to run in the evening',
        ],
        explanation:
          'Salt in place before midnight prevents ice; salt spread afterwards has to fight ice that has already set.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'Counting Cars on Mill Lane',
    icon: '🚗',
    text: `For his project, Sam stood at the end of Mill Lane with a clipboard and counted cars for one hour. He counted ninety-four. He wrote that Mill Lane was a busy road. His teacher asked him what time he had counted. Four o'clock, Sam said, straight after school. His teacher asked what he thought he would have counted at eleven in the morning. Sam had not thought about it. He went back on Saturday and counted at eleven, and got nineteen. He counted again at four on Sunday and got thirty-one. In the end his project was not about how busy Mill Lane was. It was about how one hour cannot tell you what a road is like.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many cars did Sam count in his first hour?',
        answer: 'Ninety-four',
        distractors: ['Nineteen', 'Thirty-one', 'Forty-nine'],
        explanation: 'He counted for one hour at four o’clock and got ninety-four.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'When did he do that first count?',
        answer: 'Four o’clock, straight after school',
        distractors: ['Eleven in the morning', 'Saturday lunchtime', 'Sunday evening'],
        explanation: 'Sam told his teacher he had counted at four, straight after school.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was the first count so much higher?',
        answer: 'He picked the busiest time of day',
        distractors: [
          'He counted for longer',
          'He counted lorries as well',
          'It was a weekday holiday',
        ],
        explanation:
          'Four o’clock is the school run; his Saturday count at eleven gave only nineteen.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What did the project end up being about?',
        answer: 'One hour cannot describe a whole road',
        distractors: [
          'Mill Lane is a busy road',
          'How to use a clipboard',
          'Saturdays are quieter than Sundays',
        ],
        explanation: 'The last line says the project was about how one hour cannot tell you what a road is like.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'A Ladder Too Short',
    icon: '🪜',
    text: `The gutter was blocked and the ladder would not reach. Mum stood in the garden holding it and looking up, and you could see her deciding not to try. She put it back in the shed. Then she went and got the hose, screwed on the long lance attachment they used for the car, and stood well back on the grass. The water went up in a high arc and knocked a wad of wet leaves off the edge of the roof, where it landed with a slap on the path. It took four goes. She never went up at all. Dad said afterwards that the clever part was not the hose. It was putting the ladder away.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was wrong with the ladder?',
        answer: 'It was not long enough',
        distractors: ['It was broken', 'It was too heavy', 'It was locked in the shed'],
        explanation: 'The gutter was blocked and the ladder would not reach.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did Mum use instead?',
        answer: 'The hose with a long lance',
        distractors: ['A broom', 'A rake tied to a pole', 'A neighbour’s ladder'],
        explanation: 'She got the hose and screwed on the long lance attachment used for the car.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'How many attempts did it take?',
        answer: 'Four',
        distractors: ['One', 'Two', 'Ten'],
        explanation: 'The story says it took four goes.',
        skill: 'sequence',
      },
      {
        id: 'q4',
        prompt: 'What did Dad mean about putting the ladder away?',
        answer: 'Knowing not to risk it was the real skill',
        distractors: [
          'The shed needed tidying',
          'The ladder was the wrong tool to own',
          'She should have asked him first',
        ],
        explanation:
          'She stood looking up and decided not to try. Dad calls that decision the clever part, not the hose.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Bell That Rang Twice',
    icon: '🔔',
    text: `Everyone knew the drill bell: three short rings, then out to the playground in a line. On the second Tuesday of term the bell went three short rings and the whole school filed out, bored, in the rain. They stood in their lines for eleven minutes, which was longer than usual. Then it rang again, three more short rings, and Mrs Okoro came out and said quietly to the teachers that they were staying where they were. A fire engine came up the road without its siren on. It turned out someone had left a tea towel on a hob in the staff kitchen. The first bell had been the practice. The second one had not.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What is the drill signal?',
        answer: 'Three short rings',
        distractors: ['One long ring', 'Two long rings', 'A siren'],
        explanation: 'The story says the drill bell is three short rings, then out in a line.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why does the story say eleven minutes was longer than usual?',
        answer: 'It was the first sign this was not a normal drill',
        distractors: [
          'The children were being punished',
          'The rain had slowed everyone down',
          'The bell had broken',
        ],
        explanation:
          'A practice ends quickly. Standing out far longer than usual came before the second bell and the fire engine.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What had actually caused the fire alarm?',
        answer: 'A tea towel left on a hob',
        distractors: ['A candle', 'Burnt toast', 'An electrical fault'],
        explanation: 'It turned out someone had left a tea towel on a hob in the staff kitchen.',
        skill: 'detail',
      },
      {
        id: 'q4',
        prompt: 'Why did Mrs Okoro tell them to stay where they were?',
        answer: 'There was now a real fire to deal with',
        distractors: [
          'The drill was not finished',
          'It had stopped raining',
          'She was counting the children',
        ],
        explanation:
          'The second bell was not the practice, and a fire engine arrived — it was no longer safe to go back in.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Round That Changed',
    icon: '📰',
    text: `Joel had done the same paper round for a year: down Alma Road, up Hill Street, back along the crescent. Forty-one houses, fifty minutes. In September the shop gave him a new list and the route made no sense to him. It doubled back on itself twice and finished at the far end of Alma Road instead of near his house. He complained. Mrs Rani, who ran the shop, showed him the list with the times written beside eight of the houses. Those eight had asked for their paper before seven-thirty. The new route was not shorter. It was ordered so the early houses came first. Joel walked further and got home later, and nobody was cross with him any more.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How long did the old round take?',
        answer: 'Fifty minutes',
        distractors: ['Forty-one minutes', 'Half an hour', 'Two hours'],
        explanation: 'The old round was forty-one houses and fifty minutes.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What was written beside eight of the houses?',
        answer: 'Times they wanted their paper by',
        distractors: ['House numbers', 'Names of customers', 'Prices'],
        explanation: 'Mrs Rani showed him times written beside eight houses that wanted delivery before seven-thirty.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was the new route arranged the way it was?',
        answer: 'So the earliest customers were served first',
        distractors: [
          'To make the round shorter',
          'To get Joel home sooner',
          'To avoid a busy road',
        ],
        explanation: 'The story says the route was ordered so the early houses came first, not to be shorter.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why was nobody cross with Joel any more?',
        answer: 'Their papers now arrived when they wanted them',
        distractors: [
          'He was faster than before',
          'He apologised to them',
          'The shop lowered its prices',
        ],
        explanation:
          'The eight houses had wanted their paper before seven-thirty, and the new order delivered to them first.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Stone with a Hole',
    icon: '🪨',
    text: `On the beach at Sker, Lily found a flat grey stone with a hole straight through the middle of it. Her grandmother called it a hag stone and said fishermen used to hang them by the door for luck. Lily wanted to know who had drilled it. Nobody had, her grandmother said. A softer patch in the rock had simply worn away faster than the rest, over a length of time neither of them could really picture — water and sand going through the same weak spot, year after year, until it went all the way through. Lily turned it over. It was not luck that made the hole. But she hung it by the door anyway.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did Lily find?',
        answer: 'A flat grey stone with a hole through it',
        distractors: ['A shell', 'A piece of green glass', 'A fossil'],
        explanation: 'She found a flat grey stone with a hole straight through the middle.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What is a hag stone said to bring?',
        answer: 'Luck',
        distractors: ['Rain', 'A good catch of crabs', 'Safe roads'],
        explanation: 'Her grandmother said fishermen hung them by the door for luck.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'What actually made the hole?',
        answer: 'A soft patch wore away over a very long time',
        distractors: [
          'A fisherman drilled it',
          'A shellfish bored through it',
          'It broke in a storm',
        ],
        explanation:
          'A softer patch wore away faster than the rest as water and sand went through the same weak spot.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does Lily hanging it up anyway suggest?',
        answer: 'Knowing how it formed did not spoil it for her',
        distractors: [
          'She did not believe her grandmother',
          'She still thought it was drilled',
          'She wanted to sell it',
        ],
        explanation:
          'She says it was not luck that made the hole, and hangs it by the door all the same.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Second Cast',
    icon: '🎭',
    text: `There were two casts for the school play, and Ife was in the second one. The second cast performed on the Thursday, to a smaller hall. She learned every line of the part and every line of two others besides, because the second cast had to be ready to fill any gap on either night. On the Wednesday, the first-cast Bottom lost his voice completely. Ife went on that night as well as her own. Afterwards a parent said it was lucky she happened to know the part. Her drama teacher, who was standing near enough to hear, said nothing at the time. Later she told Ife that luck was the wrong word for six weeks of learning lines nobody expected you to use.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When did the second cast perform?',
        answer: 'Thursday',
        distractors: ['Wednesday', 'Friday', 'Saturday'],
        explanation: 'The second cast performed on the Thursday, to a smaller hall.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why had Ife learned three parts?',
        answer: 'The second cast had to cover any gap',
        distractors: [
          'She could not decide which to play',
          'The teacher made everyone do it',
          'She wanted the biggest part',
        ],
        explanation:
          'She learned her part and two others because the second cast had to be ready to fill any gap on either night.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'What does "understudy" most nearly mean here?',
        answer: 'Someone ready to take over a part',
        distractors: [
          'Someone who studies badly',
          'Someone who writes the play',
          'Someone in the audience',
        ],
        explanation:
          'Ife had learned other parts so she could step in, and did so when the first-cast Bottom lost his voice.',
        skill: 'vocabulary',
      },
      {
        id: 'q4',
        prompt: 'Why did the drama teacher disagree with the parent?',
        answer: 'Ife had prepared for exactly that chance',
        distractors: [
          'The parent had missed the performance',
          'Ife had not really known the lines',
          'The first cast was not very good',
        ],
        explanation:
          'She said luck was the wrong word for six weeks of learning lines nobody expected you to use.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Where the Rain Goes',
    icon: '🌧️',
    text: `Behind the new houses on Fenn Road there is a shallow grassy dip about the size of a tennis court. It looks like a badly made playing field, and for most of the year it is dry enough to walk across. Marcus asked why nobody had built on it. His neighbour, who had worked on the site, said it was doing a job. When heavy rain falls on the estate, all the roofs and driveways shed it at once, far faster than the old fields ever did. The dip fills up and holds the water for a few hours, letting it soak away slowly instead of arriving in the brook all in one go. Twice it has been knee deep. The brook has not flooded since the houses went up.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What is behind the houses on Fenn Road?',
        answer: 'A shallow grassy dip',
        distractors: ['A pond', 'A car park', 'A row of trees'],
        explanation: 'There is a shallow grassy dip about the size of a tennis court.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How deep has the water been?',
        answer: 'Knee deep, twice',
        distractors: ['Ankle deep, once', 'Over head height', 'It has never filled'],
        explanation: 'The story says twice it has been knee deep.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the estate shed rain faster than fields did?',
        answer: 'Roofs and driveways cannot soak water up',
        distractors: [
          'The estate is on a steeper slope',
          'More rain falls there now',
          'The brook has been narrowed',
        ],
        explanation:
          'All the roofs and driveways shed rain at once, far faster than the old fields ever did.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What is the dip actually for?',
        answer: 'Holding rain back so the brook does not flood',
        distractors: [
          'A future playing field',
          'Land nobody was allowed to build on',
          'A place for children to play',
        ],
        explanation:
          'It fills and holds water for a few hours so it soaks away slowly instead of hitting the brook at once.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Oldest Tree on the Street',
    icon: '🌳',
    text: `The lime tree outside number 40 is older than every house on the road. You can tell because the pavement bends around it: the kerb has a curve in it that matches nothing else, and the wall of number 40 stops short and starts again on the other side. When the street was laid out in 1898 the builders had a choice, and they built around it. Twice since then the council has proposed taking it down, once for a wider road and once because a resident said the roots were lifting her path. Both times enough people wrote in. The tree has outlasted the road plan, the resident, and two of the houses, which were bombed in 1941 and rebuilt.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When was the street laid out?',
        answer: '1898',
        distractors: ['1941', '1840', '1980'],
        explanation: 'The street was laid out in 1898 and the builders built around the tree.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How can you tell the tree came first?',
        answer: 'The pavement and wall bend around it',
        distractors: [
          'A plaque says so',
          'It is taller than the houses',
          'The council keeps records',
        ],
        explanation:
          'The kerb curves to match nothing else and the wall of number 40 stops short and starts again.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why does the story mention the houses bombed in 1941?',
        answer: 'To show the tree outlasted even the buildings',
        distractors: [
          'To explain why the road is wide',
          'To date the lime tree',
          'To show the street was dangerous',
        ],
        explanation:
          'The tree has outlasted the road plan, the resident, and two houses that had to be rebuilt around it.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What has kept the tree standing?',
        answer: 'People writing in to object',
        distractors: [
          'A law protecting old trees',
          'Its roots being harmless',
          'The council running out of money',
        ],
        explanation: 'The story says both times enough people wrote in.',
        skill: 'inference',
      },
    ],
  },

  /* ---------------------------------------------------- level 8 (71-80) -- */
  {
    title: 'The Street That Was Never There',
    icon: '🗾',
    text: `On an old street map of Leeds there is a short road called Bartholomew Close, running between two real streets in a part of the city Nadine knows well. She has walked that block many times. There is no road there, and there never has been — the two buildings meet with no gap at all. For a long time some mapmakers put one invented street into each edition. It served no one travelling. It served the mapmaker: if a rival's map appeared with Bartholomew Close on it, that rival had not surveyed the city, they had copied. The invention was a signature hidden in plain sight, useful only if it was never noticed. Nadine's grandfather worked for the company that drew that map, and he would never say which street was the false one. She found it herself, years later, by walking.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What is unusual about Bartholomew Close?',
        answer: 'It does not exist',
        distractors: [
          'It is the shortest street in Leeds',
          'It was demolished',
          'It has two names',
        ],
        explanation:
          'There is no road there and never has been; the two buildings meet with no gap at all.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did mapmakers add a false street?',
        answer: 'To catch anyone copying their map',
        distractors: [
          'To fill an awkward blank space',
          'To confuse invading armies',
          'By accident, from a bad survey',
        ],
        explanation:
          'If a rival’s map showed it, that rival had not surveyed the city — they had copied.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What does the story mean by "a signature"?',
        answer: 'A private mark showing who made it',
        distractors: [
          'A name written at the bottom',
          'A stamp of approval',
          'A promise of accuracy',
        ],
        explanation:
          'The invented street was the mapmaker’s own hidden mark, proving the map was theirs.',
        skill: 'vocabulary',
      },
      {
        id: 'q4',
        prompt: 'Why was the trick "useful only if it was never noticed"?',
        answer: 'A copier who spotted it would leave it out',
        distractors: [
          'Readers would stop trusting the map',
          'The company would be fined',
          'It would have to be redrawn each year',
        ],
        explanation:
          'The trap works by being copied. Anyone who knew which street was invented would simply omit it.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does the grandfather’s silence add to the story?',
        answer: 'He kept the trick working by not telling',
        distractors: [
          'He had forgotten which street it was',
          'He was ashamed of the map',
          'He did not know about the trick',
        ],
        explanation:
          'The invention only worked while unnoticed, so refusing to name it — even to family — kept it doing its job.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'A Loaf a Day',
    icon: '🧺',
    text: `The bakery on Cross Street throws nothing away, but it did until three years ago. At six each evening whatever was left went into bags for the bin: usually eight or nine loaves, sometimes twenty on a wet Monday. Then a woman named Ceri asked whether she could take them instead. She now collects at six, cycles them to a hall on the estate, and anyone may take what they want, with no questions and no forms. The baker says the strange part is that he sells more bread than before. People who came for the free loaf discovered they liked it, and some of them now buy it on the days they can. He had assumed giving bread away would cost him bread. It did not work out that way.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What happened to the leftover bread three years ago?',
        answer: 'It was bagged up for the bin',
        distractors: [
          'It was sold cheaply',
          'It was fed to birds',
          'It was frozen for the next day',
        ],
        explanation: 'At six each evening whatever was left went into bags for the bin.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why does the baker call the outcome strange?',
        answer: 'He expected to lose sales and gained them',
        distractors: [
          'He had never met Ceri before',
          'The bread keeps longer than he thought',
          'The hall is further than he realised',
        ],
        explanation:
          'He had assumed giving bread away would cost him bread, but he now sells more than before.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why do some people now buy the bread?',
        answer: 'They tried a free loaf and liked it',
        distractors: [
          'The price has come down',
          'The free bread ran out',
          'The hall started charging',
        ],
        explanation:
          'People who came for the free loaf discovered they liked it, and buy it on the days they can.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does it matter that there are no forms?',
        answer: 'Nobody has to explain why they need it',
        distractors: [
          'It saves the baker paperwork',
          'The hall has no office',
          'Ceri cannot read handwriting',
        ],
        explanation:
          'Anyone may take what they want with no questions and no forms, so taking bread costs nobody their pride.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is this story really about?',
        answer: 'Generosity that turned out to cost nothing',
        distractors: [
          'How to run a bakery',
          'Why bread goes stale',
          'A woman who likes cycling',
        ],
        explanation:
          'The bread that was being binned now feeds people, and the baker ended up better off, not worse.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Quiet Carriage',
    icon: '🚆',
    text: `Nobody enforces the quiet carriage. There is a sticker on the window and that is all: no guard patrols it, no fine exists, and on the 7:41 from Ely it is the fullest carriage on the train. Theo watched a man take a call in it once. He said three words, looked up, saw that four people had glanced at him without saying anything, and told the caller he would ring back. Nothing else happened. Theo's mother says this is the most interesting thing about the carriage — that a rule with no punishment behind it is obeyed more carefully than the ones with signs and penalties. People choose that carriage on purpose. Having chosen it, they hold themselves to it, and a glance from a stranger is enough. On the same train, the notice about feet on seats is ignored in every carriage, including that one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What enforces the quiet carriage rule?',
        answer: 'Nothing but a sticker',
        distractors: ['A guard', 'A fine', 'An announcement each stop'],
        explanation: 'There is a sticker on the window and that is all — no patrol and no fine.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What made the man end his call?',
        answer: 'Four people glanced at him',
        distractors: [
          'A guard asked him to',
          'The signal cut out',
          'Theo said something',
        ],
        explanation: 'He looked up, saw four people had glanced at him without speaking, and rang off.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does choosing the carriage matter?',
        answer: 'People keep a rule they picked for themselves',
        distractors: [
          'It is the cheapest carriage',
          'It is nearest the doors',
          'The seats are more comfortable',
        ],
        explanation:
          'People choose it on purpose, and having chosen it they hold themselves to it.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the story mention feet on seats?',
        answer: 'To show a posted rule that nobody keeps',
        distractors: [
          'To explain why the seats are dirty',
          'To show the guard is lazy',
          'To describe the other carriages',
        ],
        explanation:
          'That notice exists everywhere and is ignored everywhere — the opposite of the unenforced quiet rule.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the point Theo’s mother is making?',
        answer: 'Rules people agree to work better than rules imposed',
        distractors: [
          'Trains should employ more guards',
          'Quiet carriages should be bigger',
          'Phone calls should be banned everywhere',
        ],
        explanation:
          'She finds it interesting that a rule with no punishment is obeyed more carefully than ones with signs and penalties.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'Weighing a Bee',
    icon: '⚖️',
    text: `A honeybee weighs about a tenth of a gram, which is far too little for an ordinary kitchen scale to notice. Researchers who need the number do not weigh one bee. They weigh a hundred, then divide. The trick works because the question is not really about any single bee — it is about bees in general — and a hundred of them together are heavy enough to register properly. Weighing one bee on a scale that reads to the nearest gram would give you zero, and zero would be wrong in a way that looks like an answer. Chika's class tried it with paperclips and a kitchen scale, which reads to two grams. One paperclip: nothing. Twenty paperclips: twenty-two grams. So a paperclip weighs about one gram, give or take, and they had measured something the scale could not see.`,
    questions: [
      {
        id: 'q1',
        prompt: 'About how much does a honeybee weigh?',
        answer: 'A tenth of a gram',
        distractors: ['A gram', 'Ten grams', 'A hundredth of a gram'],
        explanation: 'The story says a honeybee weighs about a tenth of a gram.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did one paperclip read nothing on the scale?',
        answer: 'It weighed less than the scale could detect',
        distractors: [
          'The scale was broken',
          'Paperclips weigh nothing at all',
          'It was not placed properly',
        ],
        explanation:
          'The kitchen scale reads to two grams, and a single paperclip is about one — too little for it to show.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why weigh a hundred bees instead of one?',
        answer: 'Together they are heavy enough to measure',
        distractors: [
          'Bees vary too much in size',
          'It is faster than weighing one',
          'One bee will not stay still',
        ],
        explanation:
          'A hundred are heavy enough to register properly on a scale that could not read one.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is a reading of zero worse than no reading?',
        answer: 'It looks like an answer but is false',
        distractors: [
          'It breaks the scale',
          'It cannot be written down',
          'It means the bee is missing',
        ],
        explanation:
          'The story says zero would be wrong in a way that looks like an answer.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the method in this story good for?',
        answer: 'Measuring something smaller than your instrument can read',
        distractors: [
          'Counting bees in a hive',
          'Making scales more accurate',
          'Comparing bees with paperclips',
        ],
        explanation:
          'By weighing many and dividing, the class measured something the scale could not see on its own.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Letter That Took Nine Years',
    icon: '✉️',
    text: `The envelope was postmarked 2014 and arrived in 2023, and the post office had put a small apologetic sticker on it. It had fallen behind a sorting frame in a depot in Warrington and stayed there until the frame was replaced. Inside was a birthday card for a girl called Mo, who was nine when it was written and eighteen when she read it. The person who sent it was her aunt, who had died in 2019. Mo's mother said afterwards that it was the strangest possible gift: a letter from someone who could not have known it would arrive like this, writing cheerfully about seeing her at Christmas. Mo has read it perhaps forty times. She says the odd thing is that it is a completely ordinary card. That is exactly why she keeps it.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where had the letter been?',
        answer: 'Behind a sorting frame in a depot',
        distractors: [
          'In a post box that was never emptied',
          'At the wrong address',
          'In a flooded storeroom',
        ],
        explanation:
          'It had fallen behind a sorting frame in a depot in Warrington until the frame was replaced.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How old was Mo when she read it?',
        answer: 'Eighteen',
        distractors: ['Nine', 'Fourteen', 'Twenty'],
        explanation: 'She was nine when it was written and eighteen when she read it.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the card feel strange to read now?',
        answer: 'It plans for a future that never happened',
        distractors: [
          'The handwriting is hard to read',
          'It was addressed to the wrong person',
          'It contains bad news',
        ],
        explanation:
          'Her aunt wrote cheerfully about seeing her at Christmas, not knowing the card would arrive nine years later, after her death.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does Mo keep an ordinary card?',
        answer: 'Its ordinariness is what makes it feel real',
        distractors: [
          'It is worth money now',
          'It has a rare postmark',
          'She has nothing else of her aunt’s',
        ],
        explanation:
          'She says the odd thing is that it is a completely ordinary card, and that this is exactly why she keeps it.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the story mainly about?',
        answer: 'How time changed the meaning of an everyday message',
        distractors: [
          'Mistakes made by the post office',
          'How letters are sorted',
          'A girl’s eighteenth birthday',
        ],
        explanation:
          'Nothing in the card changed; the nine years and the aunt’s death changed what reading it means.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Shop That Sold Nothing',
    icon: '🛠️',
    text: `The unit next to the chemist has a counter, a till that does not work, and shelves of things nobody may buy. There is a carpet cleaner, a tile cutter, a sewing machine, a pressure washer, eight drills. You join for four pounds a year and borrow what you need for a week. Ravi's father borrowed the tile cutter for one afternoon to do the bathroom, and it would have cost eighty pounds to buy a tool he would have used exactly once. The woman who set it up says the average electric drill in this country is used for somewhere between six and thirteen minutes in its entire life. The rest of the time it sits in a cupboard being owned. She thinks that is the odd part — not that people share tools, but that everybody bought their own in the first place.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How much does joining cost?',
        answer: 'Four pounds a year',
        distractors: ['Eighty pounds', 'Nothing', 'Four pounds a week'],
        explanation: 'You join for four pounds a year and borrow what you need for a week.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How long is the average drill used for in its whole life?',
        answer: 'Between six and thirteen minutes',
        distractors: ['About an hour', 'Six to thirteen hours', 'A week'],
        explanation:
          'The woman who set it up gives that figure for the average electric drill in this country.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was borrowing the tile cutter sensible?',
        answer: 'He needed it once and it cost eighty pounds',
        distractors: [
          'It was better than the one in the shops',
          'The chemist recommended it',
          'He could keep it for a year',
        ],
        explanation:
          'Buying would have cost eighty pounds for a tool used exactly once, for one afternoon.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "being owned" suggest about the drills in cupboards?',
        answer: 'They are possessed but never used',
        distractors: [
          'They are looked after carefully',
          'They belong to the shop',
          'They are waiting to be sold',
        ],
        explanation:
          'The phrase contrasts with being used: the drill spends its life sitting there, doing nothing but belonging to someone.',
        skill: 'vocabulary',
      },
      {
        id: 'q5',
        prompt: 'What does the woman find odd?',
        answer: 'That everyone bought their own in the first place',
        distractors: [
          'That people are willing to share',
          'That the till does not work',
          'That drills are so expensive',
        ],
        explanation:
          'She says the odd part is not that people share tools, but that everybody bought their own to begin with.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Race Nobody Won',
    icon: '🏁',
    text: `Halfway through the county cross-country, the lead runner took the wrong turn. The marshal at that corner had gone to help a boy with a twisted ankle, and the tape marking the route had come loose in the wind. Forty-one runners followed the leader up a farm track and along the wrong side of a hedge before anyone realised. Six runners, further back, took the correct turn and finished a course nearly half a mile shorter. The organisers had a decision to make, and they made it in about four minutes: no result. Nobody was awarded anything. Some parents were furious, and one wrote a long letter. The runner who had been leading said afterwards that she agreed with it, and that a medal for the six who happened to be behind her would have been worth nothing to anyone.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Why had the marshal left the corner?',
        answer: 'To help a boy with a twisted ankle',
        distractors: [
          'To fetch more tape',
          'The race had already passed',
          'To watch the finish',
        ],
        explanation: 'The marshal at that corner had gone to help a boy with a twisted ankle.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How many runners took the correct turn?',
        answer: 'Six',
        distractors: ['Forty-one', 'One', 'Nobody'],
        explanation: 'Six runners, further back, took the correct turn.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why would awarding the six medals have been unfair?',
        answer: 'They ran a much shorter course by luck',
        distractors: [
          'They had cheated deliberately',
          'They were the slowest runners',
          'They did not finish',
        ],
        explanation:
          'They finished a course nearly half a mile shorter, and only because they happened to be behind the leader.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does the leader’s reaction tell you about her?',
        answer: 'She cared more about fairness than winning',
        distractors: [
          'She was glad to avoid losing',
          'She blamed the marshal',
          'She did not enjoy running',
        ],
        explanation:
          'She had been leading and lost most by the decision, and still said she agreed with it.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why did the organisers decide on no result at all?',
        answer: 'No finishing order could be made fair',
        distractors: [
          'They ran out of medals',
          'The parents demanded it',
          'The race had to be restarted',
        ],
        explanation:
          'Two groups had run two different courses, so no ranking of them could mean anything.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Clock in the Hall',
    icon: '🕰️',
    text: `The clock in the school hall has been four minutes fast for as long as anyone can remember. Every teacher knows. Every child above Year 3 knows. New staff are told in their first week, along with where the spare keys are. Once, a caretaker corrected it, and for two days everything ran late: assemblies started with people still arriving, and the Year 6 bus left without four children. He put it back. Mr Adeyemi, who has taught there twenty-two years, says the clock is not wrong, it is early on purpose, and that the whole school has quietly built its timings around it. The bell is set from the office clock, which is right. The hall clock is what people actually look at. Nothing about the arrangement is written down anywhere.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How fast is the hall clock?',
        answer: 'Four minutes',
        distractors: ['Two minutes', 'Ten minutes', 'An hour'],
        explanation: 'The clock has been four minutes fast for as long as anyone can remember.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What happened when the caretaker corrected it?',
        answer: 'Things started running late',
        distractors: [
          'Nobody noticed',
          'The bell stopped working',
          'Everyone arrived early',
        ],
        explanation:
          'For two days assemblies began with people still arriving and a bus left without four children.',
        skill: 'sequence',
      },
      {
        id: 'q3',
        prompt: 'Why did fixing the clock cause problems?',
        answer: 'People had built their habits around it being fast',
        distractors: [
          'The new time was wrong',
          'The bell was set from it',
          'Nobody was told he had changed it',
        ],
        explanation:
          'The whole school had quietly built its timings around the clock being four minutes early.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the story mention the office clock?',
        answer: 'To show the bell itself is on the right time',
        distractors: [
          'To show two clocks are broken',
          'To explain who winds them',
          'To show the office is always late',
        ],
        explanation:
          'The bell is set from the office clock, which is right — so only what people look at is early.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the story really describing?',
        answer: 'An unwritten arrangement everyone has learned',
        distractors: [
          'A clock that needs repairing',
          'A careless caretaker',
          'How school bells work',
        ],
        explanation:
          'Every teacher and most children know; new staff are told; and nothing about it is written down anywhere.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'What the Dust Remembers',
    icon: '🧹',
    text: `When the old print works was cleared, a conservator was called before the skips arrived. She was not interested in the presses, which were going to a museum anyway. She wanted the dust. In the gaps under the floorboards, undisturbed since 1911, was a compacted layer of paper fibre, ink, coal soot and grit, and it could be read almost like the rings of a tree. The lower layers held soot from coal fires and a particular blue ink no longer made. Above that, a band with almost nothing in it at all — the four years the works stood closed during the war. Then a resumption, but with different fibres, because the paper supply had changed. She could date the closure to within a few months without opening a single record book. The records, when they were found, agreed with her.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the conservator want from the building?',
        answer: 'The dust under the floorboards',
        distractors: ['The printing presses', 'The record books', 'The floorboards themselves'],
        explanation: 'She was not interested in the presses. She wanted the dust.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What was in the lower layers?',
        answer: 'Coal soot and a blue ink no longer made',
        distractors: [
          'Sawdust and nails',
          'Sand and broken glass',
          'Nothing at all',
        ],
        explanation: 'The lower layers held soot from coal fires and a particular blue ink no longer made.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'What did the near-empty band mean?',
        answer: 'The works stood closed for four years',
        distractors: [
          'The floor had been swept',
          'A new roof kept dust out',
          'The presses were moved',
        ],
        explanation:
          'A band with almost nothing in it marks the four years the works was closed during the war.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'How could she date the closure without any records?',
        answer: 'Nothing settled while the works stood idle',
        distractors: [
          'She counted the floorboards',
          'The ink faded at a known rate',
          'A newspaper was found in the dust',
        ],
        explanation:
          'Dust only falls while work is going on, so the near-empty band marks exactly the years nothing was printed.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why does the story compare the dust to tree rings?',
        answer: 'Both store a record in ordered layers',
        distractors: [
          'Both are made of wood',
          'Both are hard to count',
          'Both come from old buildings',
        ],
        explanation:
          'The layers lie in order, and each one records what the world was like when it settled.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Museum of Ordinary Things',
    icon: '🏺',
    text: `The smallest museum in the county is one room above a butcher's, and everything in it is worthless. There is a bus ticket from 1976. A school exercise book with three pages used. A tin of travel sweets, unopened, with the sugar gone hard and grey inside. A plastic bag from a shop that closed in 1998. The man who runs it, Mr Halloran, says museums are very good at keeping the things people thought were important at the time — the medals, the treaties, the best china — and very bad at keeping the things nobody would ever bother to save. Those disappear completely, because everybody has one and nobody keeps one. He points at the plastic bag. Millions of those were made. He has never found another. Visitors sometimes ask when he is going to get something valuable. He says he already has, and that is the problem: they cannot see it yet.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where is the museum?',
        answer: 'One room above a butcher’s',
        distractors: ['In a school hall', 'Above a chemist', 'In an old church'],
        explanation: 'The smallest museum in the county is one room above a butcher’s.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What is unusual about the plastic bag?',
        answer: 'Millions were made and he has found only one',
        distractors: [
          'It is the oldest thing there',
          'It was made by hand',
          'It came from a famous shop',
        ],
        explanation: 'He points out that millions were made, and he has never found another.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why do ordinary objects disappear so completely?',
        answer: 'Everybody has one, so nobody saves one',
        distractors: [
          'They are too fragile to last',
          'Museums throw them out',
          'They are made of cheap material',
        ],
        explanation:
          'The story says those things vanish because everybody has one and nobody keeps one.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does Mr Halloran mean by "they cannot see it yet"?',
        answer: 'The value will only be obvious much later',
        distractors: [
          'The room is too dark',
          'The item is hidden away',
          'Visitors do not look carefully',
        ],
        explanation:
          'He says he already has something valuable — its worth simply is not visible to people yet.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the museum really for?',
        answer: 'Keeping what everyone else throws away',
        distractors: [
          'Showing off rare treasures',
          'Teaching about the 1970s',
          'Making money for the butcher',
        ],
        explanation:
          'Museums keep what seemed important; this one keeps what nobody would bother to save, which is why it survives nowhere else.',
        skill: 'mainIdea',
      },
    ],
  },
];
