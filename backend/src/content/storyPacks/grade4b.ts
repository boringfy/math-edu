import { StorySpec } from './storySpec';

/**
 * Two more levels for grade 4, taking the map to eight.
 *
 * The first sixty are mostly true stories from history and science, at about
 * 115 words and four questions, and they lean hard on detail — 60% of their
 * questions ask what the passage said. These twenty keep the same character
 * and shift the weight.
 *
 *   length      117-132 words in level 7, 127-147 in level 8, against about
 *               115 for the first sixty
 *   structure   a single account, then one that holds two things in tension,
 *               then one where the interesting part is what the facts add up
 *               to rather than the facts themselves
 *   questions   four for the first ten, five for the last ten; detail falls
 *               60% / 50% / 32%, inference climbs 27% / 40% / 44% and main
 *               idea 7% / 10% / 20%
 *
 * The counted mix is the point. A longer passage offers more facts to ask
 * about, so writing to length alone quietly drifts back into recall and the
 * curve flattens while appearing to climb.
 *
 * Every answer is in the text. Inference here means holding two sentences
 * together — often two that are some distance apart — never guessing at
 * something the passage did not say.
 */
export const GRADE_4B: StorySpec[] = [
  /* ---------------------------------------------------- level 7 (61-70) -- */
  {
    title: 'The Bridge Built to Sway',
    icon: '🌉',
    text: `When engineers designed the tallest bridge towers in Japan, they did not try to make them rigid. A tower that refuses to move at all must absorb every force an earthquake sends into it, and concrete that cannot bend eventually cracks. So the towers are built to sway, by as much as a metre at the top, and to come back. Inside some of them hangs a huge weight on a track, arranged to slide the opposite way to the building. When the tower leans left, the weight slides right, and the two cancel. Visitors are sometimes alarmed to be told the structure they are standing in is moving. The engineers point out that the buildings which came down in the last great earthquake were the ones that had stayed still.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How far can the towers sway at the top?',
        answer: 'About a metre',
        distractors: ['A centimetre', 'Ten metres', 'They do not sway'],
        explanation: 'The towers are built to sway by as much as a metre at the top, and to come back.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What is inside some of the towers?',
        answer: 'A huge weight on a track',
        distractors: ['A water tank', 'Steel cables', 'An empty shaft'],
        explanation: 'A huge weight hangs on a track, arranged to slide the opposite way to the building.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the weight slide the opposite way?',
        answer: 'To cancel out the tower’s movement',
        distractors: [
          'To make the tower heavier',
          'To warn people of an earthquake',
          'To keep the lift running',
        ],
        explanation: 'When the tower leans left the weight slides right, and the two cancel.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is a rigid tower more dangerous?',
        answer: 'It must absorb every force instead of moving with it',
        distractors: [
          'It is heavier to build',
          'It is harder to repair',
          'It costs more',
        ],
        explanation:
          'Concrete that cannot bend has to take the whole force, and eventually cracks — the buildings that fell were the ones that stayed still.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Seeds That Went to the Pole',
    icon: '❄️',
    text: `Deep inside a mountain on a frozen island near the North Pole is a vault holding more than a million seed samples. It is not a laboratory and nobody works there most of the year. It is a backup. Every seed bank in the world may send duplicates of its collection to be stored, and only the depositor may take them out again. In 2015 the vault was opened for the first withdrawal in its history. A seed bank in Aleppo had been damaged by war, and researchers who had fled asked for copies of what they had sent. They grew them, harvested new seed, and sent fresh duplicates back to the mountain. The vault was emptied a little, then refilled.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many seed samples does the vault hold?',
        answer: 'More than a million',
        distractors: ['About a thousand', 'Exactly 2015', 'A few hundred'],
        explanation: 'The vault holds more than a million seed samples.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Who may withdraw seeds?',
        answer: 'Only whoever deposited them',
        distractors: ['Any researcher', 'The country that owns the island', 'Nobody, ever'],
        explanation: 'Only the depositor may take out what they sent.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did Aleppo’s researchers need the vault?',
        answer: 'Their own seed bank had been damaged by war',
        distractors: [
          'Their seeds were too old',
          'They had run out of storage',
          'They wanted new varieties',
        ],
        explanation: 'A seed bank in Aleppo had been damaged by war, and the researchers had fled.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did they send fresh duplicates back?',
        answer: 'So the backup would be complete again',
        distractors: [
          'The vault charged them a fee',
          'The old seeds had died',
          'They had no room at home',
        ],
        explanation:
          'They grew the copies, harvested new seed, and refilled what the withdrawal had taken out.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Man Who Would Not Sign',
    icon: '✒️',
    text: `In 1936 a photograph was taken at a shipyard launch in Hamburg. Hundreds of workers stand in rows with their right arms raised. One man, near the back, has his arms folded. He is looking straight ahead, and everyone around him is doing the opposite of what he is doing. For decades nobody knew who he was. Two families have since claimed him. What is agreed is that a man in that crowd decided, in the middle of a great many people doing one thing, to do something else, in the open, where it could be seen and photographed and remembered. The photograph is now used in schools. It is almost always shown enlarged, so that the folded arms are unmistakable.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where was the photograph taken?',
        answer: 'A shipyard launch in Hamburg',
        distractors: ['A school hall', 'A railway station', 'A football match'],
        explanation: 'It was taken at a shipyard launch in Hamburg in 1936.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What is the man doing?',
        answer: 'Standing with his arms folded',
        distractors: ['Raising his arm', 'Walking away', 'Covering his face'],
        explanation: 'One man near the back has his arms folded while everyone raises their right arm.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why is the photograph enlarged when it is shown?',
        answer: 'So the one difference can be seen',
        distractors: [
          'The original is damaged',
          'To show the ship',
          'To count the crowd',
        ],
        explanation: 'It is enlarged so that the folded arms are unmistakable among hundreds of raised ones.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does it matter that he did it in the open?',
        answer: 'Refusing where he could be seen carried real risk',
        distractors: [
          'He wanted to be famous',
          'It made a better photograph',
          'He was not really refusing',
        ],
        explanation:
          'He did it in the middle of a crowd, in a place where it could be seen, photographed and remembered.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The River That Runs Backwards',
    icon: '🌊',
    text: `Twice a day, the Amazon's tidal bore travels the wrong way up the river. A wall of water two or three metres high moves upstream at speeds a person cannot outrun, and it can keep going for more than half a day and hundreds of kilometres inland. It happens because the incoming tide from the Atlantic is funnelled into a river mouth that narrows, and the water piling up has nowhere else to go but forwards, against the current. Villages along the banks time their work around it. Surfers have ridden a single wave for more than half an hour. The trees along the edges have shallow roots on one side and deep roots on the other, because the water pushes them the same way, again and again, for their whole lives.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How often does the bore happen?',
        answer: 'Twice a day',
        distractors: ['Once a year', 'Every hour', 'Once a month'],
        explanation: 'Twice a day the tidal bore travels the wrong way up the river.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How high is the wall of water?',
        answer: 'Two or three metres',
        distractors: ['Half a metre', 'Thirty metres', 'It varies by season'],
        explanation: 'A wall of water two or three metres high moves upstream.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does the water travel upstream?',
        answer: 'The narrowing mouth leaves it nowhere else to go',
        distractors: [
          'The river flows uphill there',
          'Wind pushes it inland',
          'The current reverses each day',
        ],
        explanation:
          'The tide is funnelled into a mouth that narrows, and the piling water has nowhere to go but forwards.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why do the trees have uneven roots?',
        answer: 'The water pushes them one way all their lives',
        distractors: [
          'The soil is deeper on one side',
          'People plant them that way',
          'They lean towards the sun',
        ],
        explanation: 'The bore pushes them the same way again and again, for their whole lives.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Prisoner Who Drew the Birds',
    icon: '🕊️',
    text: `A man held for years in a cell with one high window began, with nothing else to do, to watch the birds that landed on the ledge. He had no paper for a long time. When he finally got some, he did not draw the cell or the door or himself. He drew the birds, from memory and from life, hundreds of them, and he got so good at it that ornithologists later used his drawings. He noted which species came in which month, and in what order they arrived each spring. When he was released he had, without meaning to, kept the most complete record anyone had of the birds of that valley across eleven years.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the man draw?',
        answer: 'Birds',
        distractors: ['His cell', 'The door', 'Other prisoners'],
        explanation: 'He drew the birds, from memory and from life, hundreds of them.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What else did he write down?',
        answer: 'Which species came in which month',
        distractors: [
          'The names of the guards',
          'The weather each day',
          'How long he had been held',
        ],
        explanation: 'He noted which species came in which month and in what order they arrived each spring.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why were his drawings useful to scientists?',
        answer: 'They were a long, unbroken record from one place',
        distractors: [
          'They were very beautiful',
          'He was a trained scientist',
          'Nobody else could draw birds',
        ],
        explanation:
          'Across eleven years from one window he built the most complete record of that valley’s birds.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does it matter that he chose the birds and not the cell?',
        answer: 'He gave his attention to the one free thing he could see',
        distractors: [
          'The cell was too dark to draw',
          'He was not allowed to draw the door',
          'Birds were easier to draw',
        ],
        explanation:
          'He had one high window and nothing else to do, and what he recorded was what came and went freely.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Vaccine They Gave Away',
    icon: '💉',
    text: `When a vaccine for polio was proven to work in 1955, it was expected to make its inventor extremely rich. Polio had been closing swimming pools and cinemas every summer, and parents everywhere were frightened. A reporter asked who owned the patent. The reply was that the people did, and that there was no patent — you could not patent the sun. Whether that was strictly true in law is still argued about; what is not argued is that no patent was ever filed, and that within a few years the vaccine had reached hundreds of millions of children in countries that could not have afforded a licence fee. The inventor died a wealthy man by no ordinary measure, and a poor one by the measure his colleagues had expected.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When was the vaccine proven to work?',
        answer: '1955',
        distractors: ['1855', '1975', '2005'],
        explanation: 'A vaccine for polio was proven to work in 1955.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the inventor say owned the patent?',
        answer: 'The people',
        distractors: ['The government', 'His university', 'A drug company'],
        explanation: 'The reply was that the people owned it, and that there was no patent.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why could the vaccine reach so many children so fast?',
        answer: 'No licence fee had to be paid for it',
        distractors: [
          'It was easy to make at home',
          'Only rich countries used it',
          'It needed only one dose',
        ],
        explanation:
          'With no patent filed, it reached countries that could not have afforded a licence fee.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does the last sentence mean?',
        answer: 'He gained something other than money',
        distractors: [
          'He lost all his savings',
          'His colleagues were richer',
          'He regretted the decision',
        ],
        explanation:
          'He was wealthy by no ordinary measure and poor by the one his colleagues had expected — money.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Island That Counted Its Cats',
    icon: '🐈‍⬛',
    text: `A small island had a problem with rats, so cats were introduced. The rats declined. So did the seabirds, which had nested there safely for thousands of years because nothing on the ground had ever hunted them. Within thirty years several species had gone from the island entirely. Removing the cats then took longer and cost more than introducing them ever had, and had to be done slowly: kill the cats too quickly and the rat population, no longer hunted, would explode before the birds could recover. The final plan ran for nineteen years and dealt with both animals at once. The birds have come back. The island is now used as an example of how much easier it is to add a species than to subtract one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Why were cats brought to the island?',
        answer: 'To deal with rats',
        distractors: ['To protect the birds', 'As pets', 'For their fur'],
        explanation: 'The island had a problem with rats, so cats were introduced.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How long did the removal plan run?',
        answer: 'Nineteen years',
        distractors: ['Thirty years', 'One year', 'Nine years'],
        explanation: 'The final plan ran for nineteen years and dealt with both animals at once.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why were the seabirds so easily caught?',
        answer: 'Nothing had ever hunted them on the ground',
        distractors: [
          'They could not fly',
          'They were very slow',
          'There were too few of them',
        ],
        explanation:
          'They had nested there safely for thousands of years because nothing on the ground had ever hunted them.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why could the cats not simply be killed quickly?',
        answer: 'The rats would then multiply unchecked',
        distractors: [
          'The cats were protected by law',
          'It would upset the islanders',
          'The birds needed the cats',
        ],
        explanation:
          'Kill the cats too fast and the rats, no longer hunted, would explode before the birds recovered.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Letters That Were Never Sent',
    icon: '📬',
    text: `A trunk bought at auction in the Netherlands turned out to hold two thousand six hundred letters, most still sealed. They had been posted in the seventeenth century to people who had moved, or died, or could not be found, and the postmaster had kept them because he was paid on delivery and hoped one day to be paid. He never was. The trunk passed down and was forgotten. Researchers who opened it three hundred years later could read the ordinary business of ordinary lives: a singer asking for money, a merchant apologising, a mother writing to a son who never got the letter. Historians usually have only what people thought worth keeping. This was a box of what nobody kept, preserved by the fact that it never arrived.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many letters were in the trunk?',
        answer: 'Two thousand six hundred',
        distractors: ['Two hundred', 'Three hundred', 'A million'],
        explanation: 'The trunk held two thousand six hundred letters, most still sealed.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the postmaster keep them?',
        answer: 'He was paid on delivery and hoped to be paid',
        distractors: [
          'He was collecting stamps',
          'He was told to keep them',
          'He could not read the addresses',
        ],
        explanation: 'He was paid on delivery and hoped one day to be paid. He never was.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why are undelivered letters valuable to historians?',
        answer: 'They show lives nobody thought worth recording',
        distractors: [
          'They are worth a lot of money',
          'They were written by famous people',
          'They are easier to read',
        ],
        explanation:
          'Historians usually have only what people thought worth keeping; this was ordinary business, kept by accident.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What preserved the letters?',
        answer: 'The fact that they never arrived',
        distractors: [
          'A careful archive',
          'The cold Dutch climate',
          'Special sealed paper',
        ],
        explanation: 'The last line says they were preserved by the fact that they never arrived.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Tunnel Dug from Both Ends',
    icon: '⛏️',
    text: `In the sixth century BC, engineers on the island of Samos dug a tunnel more than a kilometre through a mountain to bring water into a city. They started at both ends and met in the middle. There was no compass and no way to see through rock. The surveyor appears to have walked a right-angled path over the mountain, keeping careful count of each leg, and used the totals to work out the direction each team should dig. When the two tunnels met they were out by a few metres sideways and almost nothing at all vertically, and the diggers had already begun swinging their headings towards each other, which suggests they could hear one another through the stone.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How long was the tunnel?',
        answer: 'More than a kilometre',
        distractors: ['A hundred metres', 'Ten kilometres', 'Six kilometres'],
        explanation: 'They dug a tunnel more than a kilometre through a mountain.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How did the surveyor work out the directions?',
        answer: 'By pacing a right-angled path over the mountain',
        distractors: [
          'With a compass',
          'By following a stream',
          'By digging test holes',
        ],
        explanation:
          'He walked a right-angled path over the mountain, counting each leg, and used the totals.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'What suggests the teams could hear each other?',
        answer: 'They had begun turning towards one another',
        distractors: [
          'They met exactly in the middle',
          'They finished on the same day',
          'They used the same tools',
        ],
        explanation:
          'The diggers had already begun swinging their headings towards each other before they met.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is the small error impressive?',
        answer: 'They had no way to see or measure through rock',
        distractors: [
          'The mountain was very tall',
          'They worked in the dark',
          'The tunnel was very wide',
        ],
        explanation:
          'With no compass and no sight line through the mountain they met within a few metres.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Machine That Played the Question',
    icon: '📺',
    text: `A quiz machine built to answer general knowledge questions faced two champion human players in 2011 and beat them. It had no connection to the internet during the match. Everything it knew was already loaded, and its real difficulty was not knowledge but language: a clue like "this fruit is also a colour" is easy for a person and hard for a machine, because the machine must first work out what kind of thing is being asked for. It got one famous answer badly wrong, naming a Canadian city in a category about American ones, and its own confidence score for that answer was low — it had been forced to answer anyway. Watching it fail told the engineers more than watching it win.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When did the match take place?',
        answer: '2011',
        distractors: ['2001', '1911', '2021'],
        explanation: 'The machine faced two champion human players in 2011 and beat them.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Was the machine connected to the internet?',
        answer: 'No, everything was loaded beforehand',
        distractors: [
          'Yes, throughout',
          'Only for hard questions',
          'Only at the start',
        ],
        explanation: 'It had no connection during the match; everything it knew was already loaded.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why is language harder for it than knowledge?',
        answer: 'It must work out what is being asked before it can answer',
        distractors: [
          'It cannot read English',
          'It knows too many facts',
          'The clues are read aloud',
        ],
        explanation:
          'A clue like "this fruit is also a colour" requires first working out what kind of thing is wanted.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did the wrong answer teach the engineers most?',
        answer: 'It showed exactly where the machine’s understanding broke',
        distractors: [
          'It was the funniest moment',
          'It proved the machine was cheating',
          'It lost them the match',
        ],
        explanation:
          'Its low confidence on a forced answer revealed the limit; watching it fail told them more than watching it win.',
        skill: 'mainIdea',
      },
    ],
  },

  /* ---------------------------------------------------- level 8 (71-80) -- */
  {
    title: 'The Map of the Cholera Pump',
    icon: '🚰',
    text: `In 1854, cholera killed hundreds of people in a few streets of London within days. The accepted explanation was bad air. A doctor who did not believe this did something nobody had thought to do: he drew a map. He marked every death as a small black bar at the address where it happened, and the bars stacked up in a dense black clot around one water pump on Broad Street. Two results looked at first like exceptions. A workhouse full of people in the middle of the outbreak had almost no deaths — it had its own well. A brewery nearby had none at all, and its workers drank beer. Both, examined properly, pointed the same way as everything else. He persuaded the parish to remove the pump handle. He could not prove the cause; what he had was a picture that only one explanation fitted.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the accepted explanation at the time?',
        answer: 'Bad air',
        distractors: ['Dirty water', 'Rats', 'Cold weather'],
        explanation: 'The accepted explanation was bad air, which the doctor did not believe.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How did he record the deaths?',
        answer: 'As black bars on a map at each address',
        distractors: [
          'In a written list',
          'By counting funerals',
          'With coloured pins on a wall',
        ],
        explanation: 'He marked every death as a small black bar at the address where it happened.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did the workhouse have so few deaths?',
        answer: 'It had its own well',
        distractors: [
          'It was cleaner inside',
          'It was further from the pump',
          'Its people stayed indoors',
        ],
        explanation: 'The workhouse had its own well, so its people did not use the Broad Street pump.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did the brewery workers escape?',
        answer: 'They drank beer rather than pump water',
        distractors: [
          'They worked underground',
          'They were younger and stronger',
          'The brewery closed early',
        ],
        explanation: 'The brewery had no deaths at all, and its workers drank beer.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What did the map achieve that a list could not?',
        answer: 'It showed a pattern pointing at one source',
        distractors: [
          'It counted the deaths accurately',
          'It proved what cholera was',
          'It named the people who died',
        ],
        explanation:
          'The bars clotted around one pump, and even the apparent exceptions fitted — a picture only one explanation matched.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Sound That Crossed an Ocean',
    icon: '🐋',
    text: `Certain whale calls are made at frequencies so low that they travel through the deep ocean in a way sound cannot travel at the surface. About a kilometre down there is a layer where the pressure and temperature bend sound waves back towards the middle whenever they start to stray. Sound entering this layer is trapped there, like light in a fibre, and can travel for thousands of kilometres before it fades. Navies discovered this before biologists did, and used it to listen for submarines across whole oceans. When those recordings were later shared with scientists, they contained something the navy had catalogued as unidentified for years: whales, calling to one another across distances nobody had believed an animal could span. Some of the calls had been recorded from stations on two different continents at once.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How deep is the layer that traps sound?',
        answer: 'About a kilometre down',
        distractors: ['At the surface', 'Ten kilometres down', 'On the sea floor'],
        explanation: 'About a kilometre down there is a layer that bends sound back towards the middle.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Who discovered the effect first?',
        answer: 'Navies',
        distractors: ['Biologists', 'Fishermen', 'Whale watchers'],
        explanation: 'Navies discovered this before biologists did, and used it to listen for submarines.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why does sound travel so far in that layer?',
        answer: 'It is bent back in whenever it strays',
        distractors: [
          'The water is warmer there',
          'There are no currents',
          'It is closer to the sea floor',
        ],
        explanation:
          'Pressure and temperature bend the waves back towards the middle, trapping them like light in a fibre.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why had the navy catalogued the calls as unidentified?',
        answer: 'They were listening for machines, not animals',
        distractors: [
          'The recordings were too faint',
          'The whales were too rare',
          'They had no equipment to analyse them',
        ],
        explanation:
          'The recordings were made to detect submarines, so animal calls stayed unexplained for years.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does recording one call on two continents show?',
        answer: 'The calls crossed an entire ocean',
        distractors: [
          'There were two whales',
          'The stations were faulty',
          'The whale was very loud nearby',
        ],
        explanation:
          'A single call picked up from two continents at once spans the distance between them.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Wreck That Was Left Alone',
    icon: '⚓',
    text: `A ship that sank in 1941 lies in shallow water off the English coast with around fourteen hundred tonnes of explosives still in its holds. It has never been cleared. Three masts stand above the water at low tide, and there is an exclusion zone around it that every vessel must respect. Divers have surveyed it from a distance. The cargo has been assessed more than once, and each assessment has reached the same conclusion: the risk of disturbing it is greater than the risk of leaving it. Salvage would mean moving corroded shells that have sat in salt water for eighty years, and a mistake would send a wave into a town of forty thousand people. So the masts stay, the zone stays, and the ship is monitored rather than emptied. Doing nothing is, in this case, the plan and not the absence of one.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When did the ship sink?',
        answer: '1941',
        distractors: ['1914', '1841', '2041'],
        explanation: 'The ship sank in 1941 and lies in shallow water off the English coast.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why do the masts matter to passing vessels?',
        answer: 'They show exactly where the wreck lies',
        distractors: [
          'They can be used to moor against',
          'They hold the exclusion signs',
          'They mark the shipping lane',
        ],
        explanation:
          'Three masts stand above the water at low tide, inside an exclusion zone every vessel must respect.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why has the cargo never been removed?',
        answer: 'Disturbing it is riskier than leaving it',
        distractors: [
          'It is too deep to reach',
          'It would cost too much',
          'It has already been made safe',
        ],
        explanation:
          'Every assessment reached the same conclusion: the risk of disturbing it is greater than leaving it.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the town matter to the decision?',
        answer: 'A mistake would send a wave into forty thousand people',
        distractors: [
          'The town owns the wreck',
          'The town wants it removed',
          'The town pays for the monitoring',
        ],
        explanation: 'Salvage errors could send a wave into a town of forty thousand people.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does the last sentence mean?',
        answer: 'Leaving it alone is an active, considered choice',
        distractors: [
          'Nobody has decided anything',
          'There is no money to act',
          'The plan has been abandoned',
        ],
        explanation:
          'Doing nothing here is the plan, arrived at repeatedly, not a failure to make one.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Orchestra That Rehearsed Underground',
    icon: '🎻',
    text: `During the siege of a city in 1942, an orchestra was assembled to perform a symphony written about that same siege. Most of the players had starved or left. The conductor found fourteen musicians. He advertised for more, and the auditions were held in a city where people were dying of hunger; some who came could not hold their instruments up for a whole rehearsal. Rehearsals were kept short for that reason. Soldiers were released from the front line because they could play. On the night, the army arranged an artillery barrage aimed at silencing the enemy guns so that the concert could be heard, and loudspeakers were turned outward across the lines. The music was aimed at the besiegers as deliberately as the shells were. Several of them wrote afterwards that it was the night they understood the city would not fall.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many musicians did the conductor find at first?',
        answer: 'Fourteen',
        distractors: ['Forty', 'Four', 'A hundred'],
        explanation: 'Most had starved or left; the conductor found fourteen musicians.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why were rehearsals kept short?',
        answer: 'Players were too weak to hold instruments up',
        distractors: [
          'The hall was needed for other things',
          'There was a curfew',
          'The conductor was ill',
        ],
        explanation: 'Some could not hold their instruments up for a whole rehearsal, so rehearsals were short.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why were soldiers released from the front?',
        answer: 'Because they could play instruments',
        distractors: [
          'They were wounded',
          'The fighting had stopped',
          'They had asked to leave',
        ],
        explanation: 'Soldiers were released from the front line because they could play.',
        skill: 'detail',
      },
      {
        id: 'q4',
        prompt: 'Why were loudspeakers turned towards the enemy?',
        answer: 'So the besiegers would hear the concert',
        distractors: [
          'To drown out the guns',
          'So people outside the city could enjoy it',
          'To warn of the barrage',
        ],
        explanation:
          'The music was aimed at the besiegers as deliberately as the shells were.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What was the concert really doing?',
        answer: 'Proving the city was still alive',
        distractors: [
          'Raising money for the army',
          'Training new musicians',
          'Celebrating a victory',
        ],
        explanation:
          'Enemy soldiers wrote that it was the night they understood the city would not fall.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Bank of Broken Clocks',
    icon: '⏱️',
    text: `A watch repairer in a small town began accepting clocks nobody wanted. People brought him mantel clocks that had stopped in the war, wristwatches from grandparents, station clocks from closed stations. He did not sell them and mostly did not repair them. He wrote a card for each one saying where it came from and, where the owner knew it, the moment it had stopped. After forty years the workshop held over nine hundred stopped clocks, each showing a different time, each with a card. Visitors found it unsettling and then, usually, moving. He said the clocks were not the collection. The cards were. Without them it would be a room of scrap metal, and with them it was nine hundred families who had thought a thing was worth keeping even after it no longer worked.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the repairer write on each card?',
        answer: 'Where the clock came from and when it stopped',
        distractors: [
          'The price he paid',
          'How to repair it',
          'The name of the maker',
        ],
        explanation:
          'He wrote where it came from and, where known, the moment it had stopped.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the collection grow so large?',
        answer: 'People kept bringing clocks nobody else wanted',
        distractors: [
          'He bought them at auction',
          'He repaired and kept them',
          'A museum sent him its spares',
        ],
        explanation:
          'He accepted clocks nobody wanted — from closed stations, from grandparents — and over forty years there were more than nine hundred.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did he not repair them?',
        answer: 'Running them would erase the time they stopped',
        distractors: [
          'He was not skilled enough',
          'Parts were unavailable',
          'The owners forbade it',
        ],
        explanation:
          'Each clock shows a different stopped moment, recorded on its card — starting it would lose that.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did he say the cards were the collection?',
        answer: 'The stories are what make the objects matter',
        distractors: [
          'The cards were rarer than the clocks',
          'The clocks were worthless metal',
          'He wrote the cards himself',
        ],
        explanation:
          'Without the cards it would be a room of scrap; with them it is nine hundred families’ keepsakes.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What is the workshop really a record of?',
        answer: 'What people choose to keep when it stops being useful',
        distractors: [
          'How clocks are made',
          'The history of one town',
          'Why clocks break',
        ],
        explanation:
          'Nine hundred families kept a thing that no longer worked, and the cards say why.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Language With Eleven Speakers',
    icon: '🗣️',
    text: `When a linguist arrived to record a language in the Amazon, eleven people still spoke it. All were over sixty. She had funding for two years and spent the first six months not recording anything, because the speakers had been told all their lives that their language was worthless and were embarrassed to use it in front of a stranger with a microphone. What changed things was not persuasion. Her recorder broke, and while she waited for a replacement she simply sat with them, and they talked to each other. When the new recorder came, several of them asked her to record particular things — a song, a way of counting, the names for parts of a canoe — because they had decided for themselves what mattered. The dictionary that resulted has their names on it, not only hers.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many speakers were left?',
        answer: 'Eleven',
        distractors: ['Sixty', 'Two', 'A hundred'],
        explanation: 'Eleven people still spoke it, all over sixty.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why would they not speak at first?',
        answer: 'They had been taught their language was worthless',
        distractors: [
          'They did not trust outsiders',
          'They had forgotten it',
          'They were paid too little',
        ],
        explanation:
          'They had been told all their lives it was worthless and were embarrassed to use it in front of a stranger.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What happened while the recorder was broken?',
        answer: 'She sat with them and they talked to each other',
        distractors: [
          'She learned the language herself',
          'She went home',
          'She wrote everything by hand',
        ],
        explanation: 'While she waited for a replacement she simply sat with them, and they talked.',
        skill: 'sequence',
      },
      {
        id: 'q4',
        prompt: 'Why did they start asking her to record things?',
        answer: 'They had decided for themselves what was worth keeping',
        distractors: [
          'She offered them money',
          'She had learned to ask properly',
          'The new recorder was better',
        ],
        explanation:
          'They chose particular things — a song, a way of counting — because they had decided what mattered.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why are their names on the dictionary?',
        answer: 'They decided what it should contain',
        distractors: [
          'They paid for it',
          'It is a legal requirement',
          'She could not write it alone',
        ],
        explanation:
          'They chose what was recorded, which made them authors rather than subjects.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Field That Was Never Ploughed',
    icon: '🌾',
    text: `On the edge of an agricultural research station is a field that has been left alone since 1882. Nothing is planted, nothing is sprayed, nothing is cut. It was set aside to answer a simple question: what happens to farmland if you simply stop farming it? In the first years it filled with weeds. Then coarse grasses crowded the weeds out. Then thorn scrub came up through the grass, and then trees came up through the scrub, and by the 1940s it was woodland. It is woodland still. Nobody alive was there at the start, and the value of the experiment now comes precisely from the fact that no one has been able to interfere with it for a hundred and forty years. Its neighbouring plots, farmed continuously since the same date, are the other half of the answer.`,
    questions: [
      {
        id: 'q1',
        prompt: 'When was the field left alone?',
        answer: '1882',
        distractors: ['1940', '1782', '1982'],
        explanation: 'The field has been left alone since 1882.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What came after the coarse grasses?',
        answer: 'Thorn scrub',
        distractors: ['Weeds', 'Trees', 'Nothing'],
        explanation: 'Weeds, then coarse grasses, then thorn scrub, then trees.',
        skill: 'sequence',
      },
      {
        id: 'q3',
        prompt: 'Why does the experiment need the farmed plots too?',
        answer: 'They show what the same land does when farmed',
        distractors: [
          'They pay for the research',
          'They protect the woodland',
          'They provide seed',
        ],
        explanation:
          'The neighbouring plots, farmed since the same date, are the other half of the answer.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why is the length of time the point?',
        answer: 'Slow changes can only be seen over a very long run',
        distractors: [
          'The soil takes time to dry',
          'Old records are more accurate',
          'Trees are expensive to plant',
        ],
        explanation:
          'The sequence from weeds to woodland took sixty years, and the record now runs a hundred and forty.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why does it matter that nobody could interfere?',
        answer: 'An untouched result is the only honest comparison',
        distractors: [
          'The field is private property',
          'Visitors would damage the trees',
          'The station has no staff',
        ],
        explanation:
          'The value comes precisely from no one having been able to interfere for a hundred and forty years.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Ship’s Cat Who Was Counted',
    icon: '🐱',
    text: `Ships' crew lists from the eighteenth century are unusually complete, because the pay was calculated from them. Historians reading them have found that some vessels list an animal among the crew, with a share of the provisions recorded against it. This was not sentiment. A ship's cat was working: rats ate the biscuit, gnawed the ropes and spoiled the water, and on a voyage of eight months a rat problem could turn into a supply problem and then into an emergency. Naming the cat on the list meant its food came out of the ship's accounts rather than a sailor's own ration, which is the difference between a pet somebody feeds and a post somebody fills. Several ships carried two, and at least one list records a cat being transferred to another vessel that had asked for it.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Why are the crew lists so complete?',
        answer: 'Pay was calculated from them',
        distractors: [
          'They were kept for the navy',
          'Sailors signed them daily',
          'They were printed, not written',
        ],
        explanation: 'The lists are unusually complete because the pay was calculated from them.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What damage did rats do?',
        answer: 'Ate biscuit, gnawed ropes, spoiled water',
        distractors: [
          'Chewed the sails',
          'Bit the sailors',
          'Sank small boats',
        ],
        explanation: 'Rats ate the biscuit, gnawed the ropes and spoiled the water.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was a rat problem so serious on a long voyage?',
        answer: 'It could become a supply emergency at sea',
        distractors: [
          'Rats carried disease ashore',
          'The crew were frightened of them',
          'They damaged the cargo for sale',
        ],
        explanation:
          'On a voyage of eight months it could turn into a supply problem and then an emergency.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What did being on the list actually mean?',
        answer: 'The ship, not a sailor, fed the cat',
        distractors: [
          'The cat was paid wages',
          'The cat belonged to the captain',
          'The cat could not be removed',
        ],
        explanation:
          'Its food came out of the ship’s accounts rather than a sailor’s own ration.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'What does a transfer between ships show?',
        answer: 'The cat was treated as a working post',
        distractors: [
          'The cat had run away',
          'The first ship disliked it',
          'Cats were traded for money',
        ],
        explanation:
          'Another vessel asked for it — a post being filled, not a pet being given away.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Roads That Were Deliberately Bent',
    icon: '🛤️',
    text: `A new town built in the 1970s had straight roads, wide and clear, and within three years it had a serious problem with speed. The obvious answer was signs and enforcement, and neither worked for long. What eventually worked was rebuilding the roads to be worse. Engineers narrowed them, added bends where none were needed, planted trees close to the kerb and let the parked cars stay. Drivers slowed down, not because they were told to, but because the road no longer looked like somewhere you could go fast. Accidents fell by more than half. The counter-intuitive part, which took years to be accepted, is that a road which feels slightly dangerous is driven more carefully than one which feels perfectly safe, and ends up being safer.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was wrong with the original roads?',
        answer: 'They were straight and wide, and drivers sped',
        distractors: [
          'They were too narrow',
          'They flooded often',
          'They had too many bends',
        ],
        explanation: 'The town had straight, wide, clear roads and a serious problem with speed.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did engineers do to the roads?',
        answer: 'Narrowed them and added bends and trees',
        distractors: [
          'Widened them',
          'Added more signs',
          'Closed them to traffic',
        ],
        explanation:
          'They narrowed the roads, added bends, planted trees close to the kerb and let parked cars stay.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did signs and enforcement fail?',
        answer: 'The road still looked like somewhere to go fast',
        distractors: [
          'The signs were too small',
          'There were not enough police',
          'Drivers could not read them',
        ],
        explanation:
          'Drivers slowed only once the road stopped looking fast — being told was not enough.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does a road that feels risky end up safer?',
        answer: 'Drivers pay more attention when they feel less safe',
        distractors: [
          'Fewer people use it',
          'Cars cannot fit down it',
          'It is patrolled more often',
        ],
        explanation:
          'A road that feels slightly dangerous is driven more carefully than one that feels perfectly safe.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why did the idea take years to accept?',
        answer: 'It sounds like making things worse on purpose',
        distractors: [
          'It was very expensive',
          'The results were unclear',
          'Nobody had measured accidents',
        ],
        explanation:
          'Rebuilding roads to be worse in order to make them safer is counter-intuitive, and accidents still fell by half.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Photograph of the Whole Earth',
    icon: '🌍',
    text: `Before 1968, no human being had ever seen the whole Earth at once. Photographs from orbit showed a curve of horizon; maps showed a flattened idea. Then a crew flying round the Moon came out from behind it and saw their own planet rising over a dead grey landscape, and one of them scrambled for colour film. The photograph they took was not on the mission plan. Nobody had assigned anyone to look out of the window at the Earth. Within a few years it had appeared on the cover of books, on posters and on the first Earth Day materials, and it is frequently described as the image that started the modern environmental movement. What it showed that nothing else had was scale: the whole thing, entire, with nothing else nearby, and no lines on it anywhere.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What year was the photograph taken?',
        answer: '1968',
        distractors: ['1958', '1978', '1988'],
        explanation: 'Before 1968 no human being had seen the whole Earth at once.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Was the photograph planned?',
        answer: 'No, nobody was assigned to take it',
        distractors: [
          'Yes, it was the main goal',
          'Yes, but with the wrong film',
          'It was taken automatically',
        ],
        explanation: 'It was not on the mission plan; nobody had been assigned to look at the Earth.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did one of them scramble for colour film?',
        answer: 'They realised what they were seeing mattered',
        distractors: [
          'The black-and-white film ran out',
          'They were told to by ground control',
          'The window was too dark',
        ],
        explanation:
          'The sight was unplanned and they hurried to capture it properly, in colour.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why does the story mention there being no lines?',
        answer: 'Borders are on maps but not on the planet',
        distractors: [
          'The camera lens was clean',
          'The photograph was blurred',
          'Clouds hid the coastlines',
        ],
        explanation:
          'Maps showed a flattened idea with lines on it; the photograph showed the whole thing with none.',
        skill: 'inference',
      },
      {
        id: 'q5',
        prompt: 'Why is it credited with changing how people thought?',
        answer: 'It showed the planet as one small, complete thing',
        distractors: [
          'It proved the Earth was round',
          'It was the first colour photo from space',
          'It showed damage to the environment',
        ],
        explanation:
          'What it showed that nothing else had was scale: the whole thing, entire, with nothing else nearby.',
        skill: 'mainIdea',
      },
    ],
  },
];
