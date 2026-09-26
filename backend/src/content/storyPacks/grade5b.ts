import { StorySpec } from './storySpec';

/**
 * Two more levels for grade 5, taking the map to eight.
 *
 * The first sixty are the most demanding writing in the app: about 143 words,
 * four questions, and subjects — the replication crisis, the tragedy of the
 * commons, deep time — chosen because they need a child to hold an idea
 * rather than a fact. These twenty go further in the one direction that is
 * still open.
 *
 *   length      168-185 words in level 7, 173-211 in level 8, against about
 *               143 for the first sixty
 *   structure   an account, then an account with a tension in it, then one
 *               where the passage sets up an expectation and the last two
 *               sentences overturn it
 *   questions   four for the first ten, five for the last ten; detail falls
 *               52% / 48% / 28% and inference climbs 27% / 38% / 48%
 *
 * At this level the useful question is rarely "what did it say". It is "what
 * follows from what it said", and — for the hardest ten — "why is that the
 * opposite of what you expected". The mix is counted rather than judged by
 * feel, because a longer passage hands you more facts to ask about and the
 * curve flattens without anyone deciding that it should.
 *
 * Every answer remains findable. An inference joins sentences that may be far
 * apart in the passage; it never asks a child to supply something the passage
 * withheld.
 */
export const GRADE_5B: StorySpec[] = [
  /* ---------------------------------------------------- level 7 (61-70) -- */
  {
    title: 'The Rule That Ate Itself',
    icon: '📏',
    text: `A hospital decided to measure how long patients waited in its emergency department, and set a target: nobody should wait more than four hours. Waiting times fell. They fell so reliably that the figures began to look strange — a great many patients were recorded as being seen at three hours and fifty minutes, and almost none at four hours and ten. Investigators found several things happening at once. Some patients were being moved to a different ward, which stopped the clock without treating anyone. Some were held in ambulances outside the door, because the clock started at the door. And some departments had simply become extremely good at the last twenty minutes. The target had been chosen as a way of measuring care. Once it became the thing being managed, it stopped measuring care and started measuring how well the department managed the target. The four-hour figure itself was never the problem. It had been chosen because it was roughly what good care looked like at the time it was picked, and it went on being reported long after it had stopped describing that.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the target?',
        answer: 'Nobody waiting more than four hours',
        distractors: ['Nobody waiting more than one hour', 'Seeing every patient in ten minutes', 'Treating a set number each day'],
        explanation: 'The hospital set a target that nobody should wait more than four hours.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did holding patients in ambulances help the figures?',
        answer: 'The clock only started at the door',
        distractors: [
          'Ambulances had their own doctors',
          'It reduced the number of patients',
          'Ambulance time was counted double',
        ],
        explanation: 'The clock started at the door, so time spent outside it was not measured.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why is the cluster just before four hours suspicious?',
        answer: 'Real waiting times would not bunch at the deadline',
        distractors: [
          'It shows the clocks were wrong',
          'It proves the staff were slow',
          'Four hours is an unusual length',
        ],
        explanation:
          'A great many patients recorded at three hours fifty and almost none just after four is a pattern made by the target, not by illness.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What is the passage really about?',
        answer: 'A measure stops working once it becomes the goal',
        distractors: [
          'Hospitals are badly run',
          'Four hours is too long to wait',
          'Targets should be stricter',
        ],
        explanation:
          'It was chosen to measure care, and once managed it measured only how well the target was managed.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Trees That Were Counted Wrong',
    icon: '🌲',
    text: `For decades, the standard way to estimate how much carbon a forest held was to measure a sample of trees, take an average, and multiply. It seemed obviously sound. Then a team measuring an old-growth forest in Borneo found the method was underestimating the total by a large margin, and the reason was that the distribution is not the sort averages describe well. In that forest, roughly one per cent of the trees held about half the carbon: a small number of very old giants, far larger than anything in the sample plots, which had been laid out in places convenient to walk to. The averages were accurate. The sampling was not. Correcting it changed the estimated carbon of some forests by more than a third, which changed what those forests were worth to leave standing. The lesson generalises badly in one direction and well in another: it is not that averages are useless, but that an average is a summary of a sample, and a sample laid out for the convenience of the people carrying the equipment is not a summary of a forest.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the standard method?',
        answer: 'Measure a sample, average it, multiply',
        distractors: [
          'Weigh every tree',
          'Photograph the canopy from above',
          'Count the trees only',
        ],
        explanation: 'The standard way was to measure a sample of trees, take an average and multiply.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How much of the carbon did one per cent of trees hold?',
        answer: 'About half',
        distractors: ['About one per cent', 'A third', 'Almost none'],
        explanation: 'Roughly one per cent of the trees held about half the carbon.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did the sample plots miss the giants?',
        answer: 'They were laid out where it was easy to walk',
        distractors: [
          'Giants are hidden by the canopy',
          'The team measured too quickly',
          'Giants had already been felled',
        ],
        explanation:
          'The plots were in places convenient to walk to, and the giants were far larger than anything in them.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the passage say the averages were accurate?',
        answer: 'The error was in what was sampled, not the arithmetic',
        distractors: [
          'The averages were rounded correctly',
          'Two teams checked the sums',
          'The averages were later revised',
        ],
        explanation: 'It states the averages were accurate and the sampling was not.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Prisoners Who Were Asked to Guess',
    icon: '⚖️',
    text: `A study of parole decisions looked at more than a thousand rulings by experienced judges and found something nobody had predicted. The single strongest predictor of whether a prisoner was granted parole was not the seriousness of the offence, the time already served, or the prisoner's record. It was how long it had been since the judge last ate. Immediately after a break, roughly two-thirds of applications succeeded. Just before the next break, the rate approached zero. The judges were not aware of it and rejected the finding when it was put to them. The most likely explanation offered is that granting parole is the harder decision — it requires accepting responsibility for a risk — and that a tired mind defaults to the safer, easier answer, which is to change nothing. Later work has argued the effect is smaller than first reported and confounded by how cases are ordered through the day. What survives the argument is uncomfortable enough: a decision everyone involved believes is being made on the evidence is measurably shaped by something nobody would defend as relevant.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many rulings did the study examine?',
        answer: 'More than a thousand',
        distractors: ['About a hundred', 'Exactly two-thirds', 'A dozen'],
        explanation: 'The study looked at more than a thousand rulings by experienced judges.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What predicted the outcome best?',
        answer: 'Time since the judge last ate',
        distractors: [
          'The seriousness of the offence',
          'Time already served',
          'The prisoner’s record',
        ],
        explanation: 'The strongest predictor was how long it had been since the judge last ate.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why would tiredness favour refusal?',
        answer: 'Refusing changes nothing and carries no risk',
        distractors: [
          'Refusing takes less time to write',
          'Judges are told to refuse when unsure',
          'Refusal cases are simpler in law',
        ],
        explanation:
          'Granting requires accepting responsibility for a risk; a tired mind defaults to the easier answer of changing nothing.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does it matter that the judges rejected the finding?',
        answer: 'The effect works without being noticed',
        distractors: [
          'The study was probably wrong',
          'Judges are dishonest',
          'The data had been misread',
        ],
        explanation:
          'They were not aware of it, which is what makes a pattern this strong possible in the first place.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Island With Two Clocks',
    icon: '🕰️',
    text: `Until 1883, almost every town in the United States kept its own time, set by the sun at that place. Noon in one town was several minutes off noon in the next, and nobody minded, because nobody could travel fast enough for it to matter. The railways changed that. A train timetable has to say one thing, and a train crossing several towns in an afternoon could not honour all their noons at once. Collisions on single-track lines made the problem lethal rather than merely awkward. So the railway companies — not any government — divided the country into zones and declared a standard time in each. Some towns refused for years and kept both: a station clock on railway time and a courthouse clock on the sun. The government did not make it law until 1918, thirty-five years after everyone was already using it. The pattern is common enough to have a name in legal history. A practice spreads because it solves a problem for the people who need it solved, and the law arrives afterwards to write down what has already become true.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How was local time set before 1883?',
        answer: 'By the sun at that place',
        distractors: ['By the nearest city', 'By the railway', 'By government decree'],
        explanation: 'Almost every town kept its own time, set by the sun at that place.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Who created the time zones?',
        answer: 'The railway companies',
        distractors: ['The government', 'Astronomers', 'The towns themselves'],
        explanation: 'The railway companies — not any government — divided the country into zones.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did the railways make local time dangerous?',
        answer: 'Trains on one track could not share a timetable',
        distractors: [
          'Trains ran faster than the sun moved',
          'Drivers could not read clocks',
          'Passengers missed their trains',
        ],
        explanation:
          'A timetable must say one thing, and collisions on single-track lines made mismatched time lethal.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does the 1918 date show?',
        answer: 'The law followed a change that had already happened',
        distractors: [
          'The railways had been acting illegally',
          'Time zones were unpopular',
          'The government invented the idea',
        ],
        explanation: 'It became law thirty-five years after everyone was already using it.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Cure That Needed a Disease',
    icon: '🧪',
    text: `A drug developed to treat high blood pressure performed poorly in trials, and the company was preparing to abandon it. During the wind-down, the trial nurses noticed something in the reports: participants were unusually reluctant to return unused tablets. This was not the sort of observation that appears in a results table. Someone followed it up, and the drug went on to become one of the most commercially successful medicines ever made, for an entirely different condition. The scientific literature calls this kind of discovery serendipitous, which is accurate but slightly misleading. Nothing about it was luck in the sense of a coin landing well. The compound had a real effect that the trial was not designed to detect, and it was found because somebody treated an odd detail as information rather than noise. The trial was not badly run. It was measuring the thing it had been designed to measure, carefully, and the discovery came from the margins of the paperwork rather than from the results themselves.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the drug originally for?',
        answer: 'High blood pressure',
        distractors: ['Pain relief', 'Infection', 'Sleep'],
        explanation: 'It was developed to treat high blood pressure and performed poorly in trials.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the nurses notice?',
        answer: 'Participants would not return unused tablets',
        distractors: [
          'Blood pressure was rising',
          'Participants dropped out early',
          'The tablets were the wrong colour',
        ],
        explanation: 'Participants were unusually reluctant to return unused tablets.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was the reluctance a clue?',
        answer: 'People keep something they have found a use for',
        distractors: [
          'They were selling the tablets',
          'They had forgotten the rules',
          'They disliked the nurses',
        ],
        explanation:
          'Unwillingness to give the tablets back suggested the drug was doing something the trial was not measuring.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the passage question the word "serendipitous"?',
        answer: 'Someone still had to treat the oddity as evidence',
        distractors: [
          'The discovery was planned all along',
          'The word means the opposite',
          'Luck plays no part in science',
        ],
        explanation:
          'It was not a coin landing well: a real effect was found because somebody treated a detail as information rather than noise.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Wall That Recorded the Weather',
    icon: '🧱',
    text: `In the dry valleys of the American southwest there are cliff dwellings built with wooden roof beams, and those beams have preserved a climate record of extraordinary precision. Tree rings vary in width with rainfall, and the sequence of wide and narrow years forms a pattern that can be matched, like a barcode, between one timber and another. By overlapping beams of different ages — a living tree, a beam from a colonial house, a beam from a ruin — researchers built a continuous year-by-year record reaching back more than two thousand years. It shows a drought lasting decades in the late thirteenth century, at exactly the time the dwellings were abandoned. That is not proof that the drought emptied them. It is, however, a coincidence the surviving oral histories of the region also describe. Two independent records agreeing is not proof either, since both could be wrong together. What it does is move the question from whether something happened to what else would have to be true if it did.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What makes tree rings vary in width?',
        answer: 'Rainfall',
        distractors: ['Wind', 'The age of the tree', 'Soil colour'],
        explanation: 'Tree rings vary in width with rainfall.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How far back does the record reach?',
        answer: 'More than two thousand years',
        distractors: ['Two hundred years', 'The thirteenth century only', 'Ten thousand years'],
        explanation: 'Overlapping beams built a continuous record reaching back more than two thousand years.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why must beams of different ages be overlapped?',
        answer: 'No single timber covers the whole span',
        distractors: [
          'Old beams are unreliable',
          'It makes the pattern wider',
          'To check the rings twice',
        ],
        explanation:
          'A living tree, a colonial beam and a ruin beam are chained by matching patterns to make one long record.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is the passage careful about the drought?',
        answer: 'Timing together is not the same as cause',
        distractors: [
          'The dates are uncertain',
          'The oral histories disagree',
          'Droughts were common then',
        ],
        explanation:
          'It says plainly that this is not proof the drought emptied the dwellings, only a coincidence.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Committee That Chose Nothing',
    icon: '🗳️',
    text: `A city asked residents to choose between three designs for a new square. Design A won a plurality with 40 per cent, B took 35 and C took 25. A was declared the winner. A researcher then asked the same residents a second question: for each pair of designs, which do you prefer? The answers showed that B beat A when the two were compared directly, and B beat C as well. Almost everyone who had voted for C preferred B to A. So the design most people preferred to each of the others had come second, and the design a majority actively disliked had won, purely because the votes against it were split. The city ran the vote again using the paired comparisons. B won. Nobody had changed their mind about anything. There is no counting method that is fair in every sense at once — this has been proved formally — so choosing one is choosing which kind of fairness matters most. The city's mistake was not picking the wrong method. It was not noticing it had picked one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What share did design A get?',
        answer: '40 per cent',
        distractors: ['35 per cent', '25 per cent', 'A majority'],
        explanation: 'A won a plurality with 40 per cent, B took 35 and C took 25.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the paired comparisons show?',
        answer: 'B beat both A and C head to head',
        distractors: [
          'A beat both the others',
          'C was most popular',
          'The result was a tie',
        ],
        explanation: 'B beat A when compared directly, and B beat C as well.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did A win the first vote?',
        answer: 'The votes against it were split between B and C',
        distractors: [
          'It was genuinely most popular',
          'C voters did not turn out',
          'It was listed first',
        ],
        explanation:
          'A majority disliked A, but that majority divided itself between B and C.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "nobody had changed their mind" tell you?',
        answer: 'The method, not the opinions, decided the winner',
        distractors: [
          'The second vote was rigged',
          'People were confused',
          'The designs were altered',
        ],
        explanation:
          'The same preferences produced a different winner once the counting method changed.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Fish That Were Not There',
    icon: '🐟',
    text: `Each generation of fishers reports the sea as roughly normal, with a bad year here and a good one there. Interviews across three generations in one Californian port found each group naming a different fish as the ordinary catch and a different size as unremarkable. The oldest described a species the youngest had never seen landed. The youngest described their own childhood as the good old days. None of them was mistaken about their own experience, and none had noticed a decline, because each was comparing the present with the sea they had personally started from. A biologist gave the effect a name: shifting baselines. The danger it poses is not that people lie about the past. It is that a slow loss, measured against a memory that resets every generation, never registers as a loss at all. The same effect has since been documented for birdsong, for air quality in cities, and for how dark the night sky is. In each case people asked to describe the change accurately report their own lifetime, which is exactly the window too short to see it.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many generations were interviewed?',
        answer: 'Three',
        distractors: ['Two', 'Ten', 'One'],
        explanation: 'Interviews were carried out across three generations in one Californian port.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the youngest group call the good old days?',
        answer: 'Their own childhood',
        distractors: [
          'The oldest group’s youth',
          'Before the port was built',
          'Last year',
        ],
        explanation: 'The youngest described their own childhood as the good old days.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did nobody notice a decline?',
        answer: 'Each compared the present with their own starting point',
        distractors: [
          'The records were lost',
          'Fishers were not paying attention',
          'The decline was very recent',
        ],
        explanation:
          'Each was comparing the present with the sea they had personally started from, so none saw a fall.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is a resetting memory dangerous?',
        answer: 'A slow loss never appears as a loss',
        distractors: [
          'People deliberately forget',
          'Old fishers exaggerate',
          'Scientists cannot count fish',
        ],
        explanation:
          'Measured against a baseline that resets each generation, a steady decline never registers.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Signature in the Forgery',
    icon: '🖼️',
    text: `A painting sold as a seventeenth-century Dutch work was questioned not because of the brushwork, which was superb, but because of a pigment. A tiny sample contained titanium white, which was not manufactured until the twentieth century. That alone settled it. What interested investigators more was what they found underneath: the forger had painted over a genuine but worthless period canvas, so that the age of the fibres and the craquelure would survive examination. He had understood exactly which tests would be run and defeated most of them. He was caught by the one thing he could not source authentically, because the material had not existed. In interviews afterwards he was asked whether he regretted using the pigment. He said he had known the risk. He simply could not paint the sky he wanted without it. Several of his works are still hanging in public collections, reattributed but not removed, on the grounds that a painting good enough to fool a century of specialists is worth looking at whoever made it.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What gave the forgery away?',
        answer: 'A pigment invented in the twentieth century',
        distractors: ['Poor brushwork', 'A wrong signature', 'The canvas size'],
        explanation: 'A sample contained titanium white, not manufactured until the twentieth century.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What was underneath the painting?',
        answer: 'A genuine but worthless period canvas',
        distractors: [
          'A second forgery',
          'A blank modern board',
          'A sketch by the same artist',
        ],
        explanation: 'The forger had painted over a genuine but worthless period canvas.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why paint over an old canvas?',
        answer: 'So the fibres and cracking would pass inspection',
        distractors: [
          'It was cheaper than new canvas',
          'The old paint showed through nicely',
          'To hide the earlier painting',
        ],
        explanation:
          'He used it so the age of the fibres and the craquelure would survive examination.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does his answer about the pigment reveal?',
        answer: 'He valued the painting over the deception',
        distractors: [
          'He did not know the pigment was modern',
          'He wanted to be caught',
          'He had no other paint available',
        ],
        explanation:
          'He knew the risk and accepted it because he could not paint the sky he wanted without it.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Village That Refused the Road',
    icon: '🛣️',
    text: `When a bypass was proposed for a village on a busy route, the campaign against it was led by the shopkeepers. This surprised the planners, who had expected traffic-weary residents to be the objectors and business to be in favour. The shopkeepers had looked at nine comparable villages bypassed in the previous twenty years. In seven of them, passing trade had fallen by more than half within three years and the high street had not recovered. Quiet, it turned out, was not the same as prosperous. The residents wanted the bypass and got it. Six years on, the village is measurably pleasanter to live in and has two shops where it had eleven. Both sides were right about what they predicted. They had simply been arguing about different things without ever saying so. Planning inquiries now routinely ask objectors to state what they are trying to protect, in those terms, before any evidence is heard. It does not resolve the disagreement. It stops two sides spending a year producing figures that were never going to meet.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Who led the campaign against the bypass?',
        answer: 'The shopkeepers',
        distractors: ['The residents', 'The planners', 'The drivers'],
        explanation: 'The campaign against it was led by the shopkeepers.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What had happened in seven of the nine villages?',
        answer: 'Passing trade fell by more than half',
        distractors: [
          'The bypass was cancelled',
          'Shops doubled in number',
          'Traffic returned within a year',
        ],
        explanation: 'In seven, passing trade fell by more than half within three years.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why were the planners surprised?',
        answer: 'They expected business to want the road',
        distractors: [
          'They had not studied other villages',
          'The residents objected too',
          'The shopkeepers had no evidence',
        ],
        explanation:
          'They had expected traffic-weary residents to object and business to be in favour.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "arguing about different things" mean here?',
        answer: 'One side meant liveability, the other meant livelihood',
        distractors: [
          'They disagreed about the route',
          'One side had the facts wrong',
          'They were arguing about money only',
        ],
        explanation:
          'The village became pleasanter and lost nine shops: both predictions came true because they measured different goods.',
        skill: 'mainIdea',
      },
    ],
  },

  /* ---------------------------------------------------- level 8 (71-80) -- */
  {
    title: 'The Study Everyone Cited',
    icon: '📄',
    text: `A paper published in 1998 proposed a link between a childhood vaccine and a developmental condition. It described twelve children. It had no control group, and the children had not been selected at random — several had been referred through a solicitor preparing litigation. Within a few years, attempts to reproduce the finding in populations of hundreds of thousands had all failed, and an investigation established that data in the original had been altered. The paper was retracted and its lead author struck off. None of that undid its effect. Vaccination rates fell for a decade in several countries, and measles, which had been close to eliminated, returned and killed children. The episode is now taught less as a story about one dishonest paper than as a story about how a claim, once it has been repeated widely enough, becomes independent of the evidence that started it. Retracting a paper is a straightforward administrative act. Retracting a belief is not. Studies of corrections have found that repeating a false claim in order to deny it can strengthen the memory of the claim while the denial fades, which puts anyone trying to correct the record in an awkward position: the most obvious way to do it is one of the least effective.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many children did the paper describe?',
        answer: 'Twelve',
        distractors: ['Twelve hundred', 'Hundreds of thousands', 'Two'],
        explanation: 'It described twelve children, with no control group.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How had several of the children been referred?',
        answer: 'Through a solicitor preparing litigation',
        distractors: [
          'By their family doctors',
          'At random from a register',
          'By a children’s hospital',
        ],
        explanation: 'Several had been referred through a solicitor preparing litigation.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the lack of a control group matter?',
        answer: 'There is nothing to compare the twelve against',
        distractors: [
          'Twelve is an unlucky number',
          'Controls make studies cheaper',
          'It breaks medical law',
        ],
        explanation:
          'Without a comparison group there is no way to tell whether the pattern differs from chance.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did retraction not undo the harm?',
        answer: 'The claim had spread beyond the paper',
        distractors: [
          'The retraction was kept secret',
          'The author published it again',
          'Doctors ignored the retraction',
        ],
        explanation:
          'Rates fell for a decade afterwards: the claim had become independent of the evidence that started it.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the last sentence saying?',
        answer: 'Correcting a record is easy; changing what people believe is not',
        distractors: [
          'Papers should never be retracted',
          'Beliefs cannot be changed at all',
          'Administration is too slow',
        ],
        explanation:
          'Retracting the paper was an administrative act; the belief it created outlived it.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Machine That Learned the Ruler',
    icon: '🤖',
    text: `A system trained to spot skin cancer from photographs performed better than dermatologists on the test set, and worse than useless in a clinic. The reason took months to find. In the training images, lesions a doctor had already judged suspicious were often photographed alongside a ruler, to record their size. Benign moles usually were not. The system had learned, entirely reasonably given what it was shown, that a ruler in the frame means cancer. It was not detecting disease. It was detecting the photographer's prior opinion, encoded in the picture. The result was worse than a system that simply guessed, because it was confident and its confidence tracked something real — just not the thing anyone wanted. Every training set carries the habits of whoever assembled it, and a model has no way of telling which patterns it finds are the ones you meant. The fix that worked was not a cleverer model. It was going back to the clinic and photographing every lesion the same way, ruler or no ruler, which took eight months and produced a far less interesting paper.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was often photographed beside suspicious lesions?',
        answer: 'A ruler',
        distractors: ['A coin', 'A label', 'A colour chart'],
        explanation: 'Lesions a doctor judged suspicious were often photographed alongside a ruler.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the test set fail to expose the flaw?',
        answer: 'It carried the same photographic habit',
        distractors: [
          'It was too small to be useful',
          'It was scored by the same doctors',
          'It contained no cancers at all',
        ],
        explanation:
          'The shortcut was in how the images were taken, so a test set drawn from the same images rewarded it too.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What had the system actually learned to detect?',
        answer: 'The photographer’s prior opinion',
        distractors: [
          'The size of the lesion',
          'The colour of the skin',
          'The quality of the camera',
        ],
        explanation:
          'It detected a doctor’s existing suspicion, encoded in the picture by the presence of a ruler.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why was it worse than a system that guessed?',
        answer: 'It was confident about the wrong signal',
        distractors: [
          'It was slower to run',
          'It cost more to build',
          'It refused difficult cases',
        ],
        explanation:
          'Its confidence tracked something real — just not the thing anyone wanted — so it misled rather than admitted ignorance.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What general point does the passage make?',
        answer: 'A model cannot tell which patterns you meant it to find',
        distractors: [
          'Machines should not be used in medicine',
          'Dermatologists are better than machines',
          'Photographs are unreliable evidence',
        ],
        explanation:
          'Every training set carries its assemblers’ habits, and the model has no way to know which patterns were intended.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Country That Counted Happiness',
    icon: '📊',
    text: `A national government decided that measuring the economy alone was giving it a distorted picture, and began publishing a broader index alongside it: health, education, time use, community, ecology. Almost immediately the index made trade-offs visible that the economic figures had hidden. A proposed mine scored well on income and badly on almost everything else, and the debate about it became a debate about which of those numbers the country actually wanted to maximise — which is a political question, and had previously been settled by default in favour of whichever number was being published. Critics pointed out, correctly, that measuring community or contentment is far softer than measuring output. The government's reply was that leaving something unmeasured does not hold it constant. It weights it at zero, which is a stronger claim than any of the soft numbers make, and one nobody has to defend because it never appears in a table. The index has not replaced the economic figures and was never meant to. Both are published, side by side, and the arguments have become noisier and considerably more honest about what is being traded for what.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the broader index include?',
        answer: 'Health, education, time use, community, ecology',
        distractors: [
          'Income and employment only',
          'Population and land area',
          'Exports and imports',
        ],
        explanation: 'The index covered health, education, time use, community and ecology.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the index turn the mine into a political question?',
        answer: 'It forced a choice between goods that conflict',
        distractors: [
          'It proved the mine was unprofitable',
          'It gave the decision to residents',
          'It showed the figures were wrong',
        ],
        explanation:
          'Scoring well on income and badly on everything else made visible a trade-off the economic figures had hidden.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What had previously settled such debates?',
        answer: 'Whichever number was being published',
        distractors: [
          'A public vote',
          'The courts',
          'The mining companies',
        ],
        explanation:
          'The question had previously been settled by default in favour of whichever number was published.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "weights it at zero" mean?',
        answer: 'Leaving something out treats it as worth nothing',
        distractors: [
          'The measurement was inaccurate',
          'The value was too small to record',
          'It was measured and found to be zero',
        ],
        explanation:
          'Not measuring something does not hold it constant; it assigns it no value in the decision.',
        skill: 'vocabulary',
      },
      {
        id: 'q5',
        prompt: 'Why is the unmeasured claim "stronger" yet undefended?',
        answer: 'It asserts a value of nothing without ever being stated',
        distractors: [
          'It is backed by better evidence',
          'Economists agree with it',
          'It is written into law',
        ],
        explanation:
          'A zero weight is a bolder claim than any soft number makes, and it escapes scrutiny by never appearing in a table.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Bridge Nobody Would Sign',
    icon: '🏗️',
    text: `A structure is signed off by an engineer who takes personal legal responsibility for it. In one well-documented case, a designer recalculated a building he had already certified after a student telephoned with a question about wind loading on its unusual base. The student was right. The building, as built, could have failed in a storm severe enough to be expected roughly once in sixteen years. The engineer told the owners, the city and the insurers, and the repairs were carried out at night, over three months, without public announcement, while a hurricane watch ran offshore. The episode became a teaching case not because a mistake was made — mistakes are ordinary — but because of what happened next. The engineer's reputation rose. Admitting the error before anything happened was treated by his profession as the strongest possible evidence that his signature meant something. The case is also cited for a less comfortable reason. The error was found because a student was willing to telephone a famous engineer and suggest he was wrong, and most of the near-misses in the literature were found the same way, by someone junior enough to ask a naive question.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Who raised the question about wind loading?',
        answer: 'A student',
        distractors: ['The city', 'An insurer', 'Another engineer'],
        explanation: 'A student telephoned with a question about wind loading on the unusual base.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How often was the dangerous storm expected?',
        answer: 'About once in sixteen years',
        distractors: ['Once a century', 'Every three months', 'Once a year'],
        explanation: 'The building could have failed in a storm expected roughly once in sixteen years.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why were repairs done at night without announcement?',
        answer: 'To fix it quickly without causing panic',
        distractors: [
          'To save money on labour',
          'To hide it from the insurers',
          'Because the city insisted on secrecy',
        ],
        explanation:
          'Work ran at night over three months while a hurricane watch was offshore — speed mattered and alarm would not have helped.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did his reputation rise rather than fall?',
        answer: 'He reported the fault before anyone was harmed',
        distractors: [
          'The mistake was the student’s',
          'The repairs were cheap',
          'Nobody found out',
        ],
        explanation:
          'He told the owners, the city and the insurers himself, and the profession treated that as proof his signature meant something.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What makes this a teaching case?',
        answer: 'How an error was handled, not that one occurred',
        distractors: [
          'The building was unusually tall',
          'The student became famous',
          'The storm eventually arrived',
        ],
        explanation:
          'Mistakes are ordinary; the passage says the case is taught because of what happened next.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Words That Went Extinct',
    icon: '📚',
    text: `Analysis of millions of digitised books has made it possible to watch vocabulary change year by year. Most words that disappear do so quietly, replaced by a synonym. A smaller group vanishes because the thing itself has gone: names for parts of a horse harness, for jobs done by hand before machines, for illnesses since renamed. What surprised researchers was a third category. Some words fall out of use while the thing they describe is still perfectly common, and in almost every documented case the word has become socially uncomfortable rather than inaccurate. Language, on this evidence, does not simply track the world. It also tracks what a society is willing to say plainly. The clearest sign that this is happening is not that a word stops appearing. It is that it starts appearing mainly inside quotation marks, and then stops. The same records show the reverse happening too. Words rise from almost nothing to ordinary use within about a decade when a society acquires something it needs to name, and the rise is usually steeper than the fall, because naming a new thing is easier than agreeing to stop naming an old one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What has made the analysis possible?',
        answer: 'Millions of digitised books',
        distractors: [
          'Interviews with speakers',
          'Old dictionaries',
          'Newspaper archives only',
        ],
        explanation: 'Analysis of millions of digitised books lets vocabulary change be watched year by year.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why is the third group harder to account for?',
        answer: 'The word goes while the thing stays',
        distractors: [
          'The words are the oldest',
          'Nobody agrees what they meant',
          'They were only ever spoken',
        ],
        explanation:
          'The first two groups lose a word to a synonym or to the disappearance of the thing; in the third the thing is still perfectly common.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What is unusual about the third category?',
        answer: 'The thing described is still common',
        distractors: [
          'The words are very old',
          'They appear only in fiction',
          'They have no synonyms',
        ],
        explanation:
          'These words fall out of use while the thing they describe remains perfectly common.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why are quotation marks a warning sign?',
        answer: 'Writers are distancing themselves from the word',
        distractors: [
          'They mark foreign words',
          'They show the word is new',
          'Editors require them',
        ],
        explanation:
          'The word starts appearing mainly inside quotation marks and then stops — writers use it while holding it at arm’s length.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does the passage conclude about language?',
        answer: 'It tracks what a society will say plainly, not just the world',
        distractors: [
          'It always becomes simpler',
          'It changes faster than it used to',
          'It records the world accurately',
        ],
        explanation:
          'On this evidence language does not simply track the world; it tracks what people are willing to say.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Ledger That Balanced Too Well',
    icon: '🧾',
    text: `Auditors examining a company's accounts noticed nothing wrong with any individual entry. What caught their attention was the distribution of first digits. In genuine collections of numbers spanning several orders of magnitude — river lengths, populations, real invoices — the leading digit is 1 about thirty per cent of the time, and 9 under five per cent. The pattern is a consequence of how such quantities are distributed, and it is remarkably robust. People inventing numbers do not reproduce it; asked to make figures look random, they spread the leading digits far too evenly. This company's invoices were close to uniform. That is not proof of fraud, and the test has been misapplied often enough that courts treat it carefully. What it does is tell an auditor where to spend the next fortnight. The evidence that convicted came from the invoices themselves. The distribution only said which drawer to open. This is the ordinary role of statistics in an investigation, and it is routinely misunderstood in both directions: treated as proof by people who want a shortcut, and dismissed as worthless by people who have noticed it is not proof. It is neither. It is a way of deciding where to spend attention that is in short supply.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How often is the leading digit 1 in genuine data?',
        answer: 'About thirty per cent of the time',
        distractors: ['About ten per cent', 'Under five per cent', 'Exactly half'],
        explanation: 'The leading digit is 1 about thirty per cent of the time, and 9 under five.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What do people do when inventing numbers?',
        answer: 'Spread the leading digits too evenly',
        distractors: [
          'Use too many nines',
          'Repeat the same figures',
          'Round everything up',
        ],
        explanation: 'Asked to make figures look random, they spread the leading digits far too evenly.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was the uniform distribution suspicious?',
        answer: 'Real invoices do not look uniform',
        distractors: [
          'Uniform data is always faked',
          'The totals did not add up',
          'The numbers were too large',
        ],
        explanation:
          'Genuine collections follow the uneven pattern; this company’s invoices were close to uniform.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why do courts treat the test carefully?',
        answer: 'It has often been misapplied',
        distractors: [
          'It is too difficult to explain',
          'It only works on small data',
          'It is not legal evidence anywhere',
        ],
        explanation: 'The passage says the test has been misapplied often enough that courts are careful with it.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What was the test actually good for?',
        answer: 'Deciding where to look next',
        distractors: [
          'Proving guilt on its own',
          'Calculating the amount stolen',
          'Replacing the audit entirely',
        ],
        explanation:
          'It told the auditor which drawer to open; the evidence that convicted came from the invoices themselves.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Reef That Was Rebuilt Wrong',
    icon: '🪸',
    text: `An early attempt to restore a damaged reef used concrete blocks, arranged in neat rows and seeded with fast-growing coral. Within four years it looked like a success in photographs: high coral cover, visible fish. Surveys ten years later found something else. The restored area held perhaps a fifth of the species of a nearby undamaged reef, and almost none of the slow-growing structural corals that build the complex spaces small fish shelter in. The fast species had been chosen because they establish quickly, which also meant they crowded out everything else. A later project used irregular structures, mixed species including slow ones, and accepted that it would look bare for a decade. It now supports about four-fifths of the species count of the natural reef. Restoration, the team wrote, is not the same as regrowth, and looking right is not the same as working. The photographs from year four are still used in presentations about the project, now with the ten-year survey printed beside them. The team asked for that specifically. They wanted the misleading image kept rather than quietly dropped, because the mistake it encouraged is one people are still making.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the early attempt use?',
        answer: 'Concrete blocks in neat rows',
        distractors: [
          'Irregular natural rock',
          'Sunken ships',
          'Nothing but seeded coral',
        ],
        explanation: 'It used concrete blocks arranged in neat rows and seeded with fast-growing coral.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the photographs suggest success?',
        answer: 'Cover and fish show up; missing species do not',
        distractors: [
          'They were taken from a distance',
          'They were taken before the survey',
          'The camera exaggerated colour',
        ],
        explanation:
          'High coral cover and visible fish photograph well, while the absence of four-fifths of the species does not appear at all.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did the fast-growing corals cause a problem?',
        answer: 'They crowded out the slower structural species',
        distractors: [
          'They died within four years',
          'They attracted too many fish',
          'They dissolved the concrete',
        ],
        explanation:
          'They were chosen because they establish quickly, which also meant they crowded everything else out.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did the later project accept looking bare?',
        answer: 'Slow corals build the structure that matters',
        distractors: [
          'It had a smaller budget',
          'Divers preferred the look',
          'Fast corals were unavailable',
        ],
        explanation:
          'It mixed in slow species that create the complex shelter spaces, and those take a decade to show.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does the closing line mean?',
        answer: 'An ecosystem can look healthy without functioning',
        distractors: [
          'Photographs are always misleading',
          'Restoration never works',
          'Regrowth is faster than restoration',
        ],
        explanation:
          'High coral cover photographed well while holding a fifth of the species — looking right is not working.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Prize That Slowed the Work',
    icon: '🏅',
    text: `A research institute introduced a large annual prize for the most cited paper produced by its staff. Citations are a reasonable proxy for influence, and the intention was to reward work that mattered. Over six years the effect was measured. Output rose. Risk-taking fell sharply. Researchers moved towards questions likely to produce a publishable result within the year, and away from long projects that might produce nothing for five and then produce something important. Collaboration across departments dropped, because a shared paper divides the credit. Most tellingly, the number of published negative results — experiments that did not work, which are useful to everyone and are cited by almost nobody — fell close to zero. The institute did not abolish the prize. It changed it, to reward the paper that had most helped someone else's work, nominated by the person helped. Negative results reappeared within two years. So did the long projects, though more slowly, because a researcher who has spent six years learning to avoid them does not unlearn it in one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the prize reward at first?',
        answer: 'The most cited paper',
        distractors: [
          'The longest project',
          'The most collaborative paper',
          'The most negative results',
        ],
        explanation: 'It was a large annual prize for the most cited paper produced by staff.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did researchers stop working together?',
        answer: 'A shared paper splits the credit the prize rewarded',
        distractors: [
          'They were forbidden to collaborate',
          'Other departments were busier',
          'Shared work took longer to publish',
        ],
        explanation:
          'The prize went to one paper, and collaboration across departments dropped because a shared paper divides the credit.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did researchers avoid long projects?',
        answer: 'They might produce nothing citable for years',
        distractors: [
          'They were more expensive',
          'They were forbidden by the prize',
          'They required more staff',
        ],
        explanation:
          'They moved towards questions likely to publish within the year and away from five-year work.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is the fall in negative results the most telling sign?',
        answer: 'They help everyone but earn no citations',
        distractors: [
          'They are the cheapest to produce',
          'They are the hardest to publish',
          'They were never counted before',
        ],
        explanation:
          'Negative results are useful to everyone and cited by almost nobody, so the incentive erased exactly the work with value but no reward.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why does the new prize ask the person helped to nominate?',
        answer: 'It measures usefulness rather than attention',
        distractors: [
          'It is cheaper to administer',
          'Citations are hard to count',
          'It spreads the prize money wider',
        ],
        explanation:
          'Rewarding the paper that most helped someone else’s work, as judged by that person, targets what citations were only standing in for.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Map With the Wrong Coastline',
    icon: '🧭',
    text: `A stretch of Antarctic coastline appeared on charts for nearly a century in a position it does not occupy. It was placed there by a single expedition, sketched through fog at a distance, and every subsequent chart copied it, because there was no reason to doubt it and no cheap way to check. Ships planned around it. When satellite imagery finally settled the matter, the error was over sixty kilometres. What interests historians of science is not the original mistake, which was honest and understandable. It is the ninety years in between, during which the coastline was repeatedly confirmed — by navigators who found it exactly where the chart said, because they were using the chart to decide where they were. The error was self-reinforcing. Each confirmation was produced by the very document it appeared to confirm, and nobody involved did anything careless at any point. Charts now carry a marking for how a feature was surveyed, and features recorded once, from a distance, are shown differently from those confirmed on the ground. It is a small change in symbols that encodes a large change in what the chart is claiming.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How was the coastline originally recorded?',
        answer: 'Sketched through fog at a distance',
        distractors: [
          'Surveyed on foot',
          'Photographed from the air',
          'Measured from a ship at anchor',
        ],
        explanation: 'It was sketched through fog at a distance by a single expedition.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How large was the error?',
        answer: 'Over sixty kilometres',
        distractors: ['Six kilometres', 'Ninety kilometres', 'A few hundred metres'],
        explanation: 'When satellite imagery settled the matter, the error was over sixty kilometres.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did navigators keep confirming it?',
        answer: 'They used the chart to work out where they were',
        distractors: [
          'They trusted the original expedition',
          'They were told not to question it',
          'The fog was always present',
        ],
        explanation:
          'They found it exactly where the chart said because the chart was what told them their position.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "self-reinforcing" mean here?',
        answer: 'The error generated its own evidence',
        distractors: [
          'The error grew larger each year',
          'The chart was reprinted often',
          'Sailors repeated each other’s stories',
        ],
        explanation:
          'Each confirmation was produced by the very document it appeared to confirm.',
        skill: 'vocabulary',
      },
      {
        id: 'q5',
        prompt: 'Why is the last clause important?',
        answer: 'A system can fail with no one behaving badly',
        distractors: [
          'Someone should have been blamed',
          'The navigators were poorly trained',
          'The expedition lied about the coast',
        ],
        explanation:
          'Nobody did anything careless, and the error still survived ninety years — the fault was in the method, not the people.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Dam That Was Taken Down',
    icon: '🏞️',
    text: `Two dams on a river in Washington State were removed in 2011, in what was then the largest such project ever attempted. They had generated power for a century and had blocked salmon from more than a hundred kilometres of spawning ground. Nobody knew what would happen. Roughly twenty million cubic metres of sediment had built up behind them, and the models disagreed sharply about whether releasing it would smother the river downstream. It was released deliberately, over two years, rather than removed by truck, and the river carried it to the coast and rebuilt beaches that had been eroding since the dams were built. Salmon returned to the upper river within months — far sooner than predicted, and in some cases to reaches no living fish had ever seen. The most cautious models had been wrong in the same direction as the optimistic ones. The river was better at this than anyone had modelled. The result has changed how removals elsewhere are argued. The question asked now is not whether a river can recover, which this settled, but how much of the recovery depends on there being an undamaged stretch upstream to recolonise from — and on that, the honest answer is still that nobody knows.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When were the dams removed?',
        answer: '2011',
        distractors: ['1911', '2001', '2021'],
        explanation: 'Two dams on a river in Washington State were removed in 2011.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why was releasing the sediment a gamble?',
        answer: 'The models disagreed about smothering the river',
        distractors: [
          'It was cheaper than trucking it out',
          'It would raise the river bed',
          'Nobody had measured how much there was',
        ],
        explanation:
          'Twenty million cubic metres were let go deliberately while the models disagreed sharply about whether it would smother everything downstream.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did the beaches rebuild?',
        answer: 'The released sediment reached the coast again',
        distractors: [
          'Sand was trucked in',
          'Sea levels fell',
          'The salmon disturbed the sea bed',
        ],
        explanation:
          'The river carried the sediment to the coast and rebuilt beaches that had eroded since the dams were built.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does "reaches no living fish had ever seen" mean?',
        answer: 'The blockage outlasted every fish alive',
        distractors: [
          'The water was newly formed',
          'The fish were blind',
          'Those stretches were newly dug',
        ],
        explanation:
          'The dams had stood a century, so no salmon then living had ever reached that spawning ground.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is notable about the models being wrong together?',
        answer: 'Even the cautious ones underestimated the recovery',
        distractors: [
          'They were all built by one team',
          'They disagreed about the sediment',
          'They predicted the beaches correctly',
        ],
        explanation:
          'The most cautious models erred in the same direction as the optimistic ones: the river outperformed all of them.',
        skill: 'mainIdea',
      },
    ],
  },
];
