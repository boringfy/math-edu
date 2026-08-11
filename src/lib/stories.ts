import { Grade, Passage, ProgressMap, Question, Story } from '../types';
import { shuffle } from './generator';
import {
  currentStop,
  isUnlocked as isStopUnlocked,
  starsEarned as starsOnMap,
} from './mapProgress';
import { GRADE_1 } from './storyPacks/grade1';
import { GRADE_2 } from './storyPacks/grade2';
import { GRADE_3 } from './storyPacks/grade3';
import { GRADE_4 } from './storyPacks/grade4';
import { GRADE_5 } from './storyPacks/grade5';
import { StorySpec } from './storyPacks/storySpec';

/**
 * Reading comprehension can't be generated the way an arithmetic question
 * can — a distractor has to be wrong in an *interesting* way — so every
 * story and every question here is written by hand.
 *
 * Each grade's stories get longer and denser as the map goes on, and each one
 * asks 3–5 questions covering more than one kind of comprehension: pulling
 * out a detail, following the order of events, working out a word from
 * context, reading between the lines, and naming what the whole paragraph was
 * about.
 *
 * Positions are fixed on purpose — progress is stored against the story id,
 * so a story can be retitled but never renumbered or reordered. The six
 * below opened the reading map and therefore stay first in their grade; every
 * story written since lives in a pack under `storyPacks/` and is appended.
 */
const OPENING: Record<Grade, StorySpec[]> = {
  1: [
    {
      title: 'The Lost Mitten',
      icon: '🧤',
      text: `Mia lost one red mitten on the way to school. Her hand was cold all day. At home time, her teacher held up a red mitten. It had been under the reading rug. Mia pulled it on and smiled. Now both of her hands were warm again.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What did Mia lose?',
          answer: 'One red mitten',
          distractors: ['Her lunch box', 'A red hat', 'One black boot'],
          explanation: 'The first sentence says Mia lost one red mitten.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Where was the mitten found?',
          answer: 'Under the reading rug',
          distractors: ['In her backpack', 'On the school bus', 'Under the slide'],
          explanation: 'The story says it had been under the reading rug.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'How did Mia feel at the end of the story?',
          answer: 'Happy',
          distractors: ['Angry', 'Scared', 'Sleepy'],
          explanation: 'She smiled, and both of her hands were warm again.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'Pip the Puppy',
      icon: '🐶',
      text: `Pip is a small brown puppy. He likes to dig in the yard. One day Pip dug a deep hole and found an old ball. He ran to Ben with the ball in his mouth. Ben threw the ball far, and Pip ran after it again and again.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What color is Pip?',
          answer: 'Brown',
          distractors: ['Black', 'White', 'Grey'],
          explanation: 'The story says Pip is a small brown puppy.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did Pip find in the hole?',
          answer: 'An old ball',
          distractors: ['A bone', 'A shoe', 'A big stone'],
          explanation: 'Pip dug a deep hole and found an old ball.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Why did Pip take the ball to Ben?',
          answer: 'He wanted Ben to play with him',
          distractors: ['He was hungry', 'He was scared of the hole', 'He wanted to go to sleep'],
          explanation: 'Ben threw the ball and Pip chased it again and again, so Pip wanted a game.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'A Rainy Day',
      icon: '☔',
      text: `Rain fell all morning, so Ana could not ride her bike. She got out paper and paints instead. She painted a big yellow sun with long orange rays. When the rain stopped, Ana taped the picture to her window. Her painted sun shone even while the sky was still grey.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Why could Ana not ride her bike?',
          answer: 'It was raining',
          distractors: ['Her bike was broken', 'She was sick', 'It was too dark'],
          explanation: 'Rain fell all morning, so she stayed inside.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did Ana paint?',
          answer: 'A big yellow sun',
          distractors: ['A blue bike', 'A grey rain cloud', 'Her window'],
          explanation: 'She painted a big yellow sun with long orange rays.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What is this story mostly about?',
          answer: 'Ana finds something fun to do indoors',
          distractors: [
            'Ana learns to ride a bike',
            'Ana paints her whole window',
            'Ana waits for the school bus',
          ],
          explanation: 'Her plan was spoiled by rain, so she painted instead.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'The Red Balloon',
      icon: '🎈',
      text: `At the fair, Dad bought Sam a red balloon. Sam held the string tight. Then a gust of wind pulled the balloon up and out of his hand. Sam watched it fly high over the trees. Dad said, "Now a bird has a red roof." Sam laughed all the way home.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Who bought the balloon?',
          answer: 'Dad',
          distractors: ['Sam', 'Grandma', "Sam's teacher"],
          explanation: 'At the fair, Dad bought Sam a red balloon.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What made Sam let go of the string?',
          answer: 'A gust of wind',
          distractors: ['A bird', 'His dog', 'He let go on purpose'],
          explanation: 'A gust of wind pulled the balloon out of his hand.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'In this story, a gust is a',
          answer: 'sudden puff of wind',
          distractors: ['kind of bird', 'loud noise', 'small cloud'],
          explanation: 'The gust pulled the balloon up into the sky, so it was moving air.',
          skill: 'vocabulary',
        },
        {
          id: 'q4',
          prompt: 'Why did Sam laugh?',
          answer: 'Dad made a joke about the balloon',
          distractors: [
            'He got a new balloon',
            'He caught the string again',
            'A bird landed on his head',
          ],
          explanation: 'Dad joked that a bird now had a red roof.',
          skill: 'inference',
        },
      ],
    },
    {
      title: "Grandma's Garden",
      icon: '🌻',
      text: `Grandma grows carrots, beans, and one tall sunflower. Every Saturday, Leo helps her pull the weeds. The sunflower is taller than Leo now. Grandma says the seeds inside its big brown middle will feed the birds all winter long. Next spring, Leo wants to plant a sunflower of his own.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What grows in the garden?',
          answer: 'Carrots, beans, and a sunflower',
          distractors: ['Apples and pears', 'Corn and potatoes', 'Only flowers'],
          explanation: 'The first sentence lists carrots, beans, and one tall sunflower.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'When does Leo help Grandma?',
          answer: 'Every Saturday',
          distractors: ['Every morning', 'On Sundays', 'Once a year'],
          explanation: 'The story says every Saturday, Leo helps her pull the weeds.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Who will eat the sunflower seeds?',
          answer: 'The birds',
          distractors: ['Leo', 'Grandma', 'The rabbits'],
          explanation: 'Grandma says the seeds will feed the birds all winter.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What will Leo probably do next spring?',
          answer: 'Plant a sunflower seed',
          distractors: ['Sell the carrots', 'Move the garden', 'Stop helping Grandma'],
          explanation: 'The last sentence says he wants a sunflower of his own.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'The Big Snow',
      icon: '⛄',
      text: `Snow fell all night long. In the morning the school bus did not come. Kai and his sister pulled on their boots and built a snow fort beside the front steps. Mom brought out two mugs of warm cocoa. Kai said it was the best day off he had ever had.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Why did the school bus not come?',
          answer: 'So much snow fell in the night',
          distractors: ['It was Sunday', 'The bus broke down', 'Kai was sick'],
          explanation: 'Snow fell all night, and in the morning the bus did not come.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did Kai and his sister build?',
          answer: 'A snow fort',
          distractors: ['A snowman', 'A sled', 'A treehouse'],
          explanation: 'They built a snow fort beside the front steps.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What did Mom bring outside?',
          answer: 'Warm cocoa',
          distractors: ['Hot soup', 'Cold milk', 'Sandwiches'],
          explanation: 'Mom brought out two mugs of warm cocoa.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'How did Kai feel about the day?',
          answer: 'He loved it',
          distractors: ['He was bored', 'He was worried', 'He missed school'],
          explanation: 'He called it the best day off he had ever had.',
          skill: 'inference',
        },
      ],
    },
  ],
  2: [
    {
      title: 'The Kite Contest',
      icon: '🪁',
      text: `On Saturday the park held a kite contest. Nina's kite was made of newspaper and two thin sticks. All the other kites were bright and store-bought. When the whistle blew, Nina ran into the wind. Her paper kite climbed higher than every one of them. The judge gave her a blue ribbon for the highest flight. Nina told him the secret was the long paper tail she had taped on that morning.`,
      questions: [
        {
          id: 'q1',
          prompt: "What was Nina's kite made of?",
          answer: 'Newspaper and two thin sticks',
          distractors: ['Silk and wire', 'Plastic bags', 'Cloth and string'],
          explanation: 'The story says her kite was made of newspaper and two thin sticks.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did Nina win?',
          answer: 'A blue ribbon for the highest flight',
          distractors: [
            'A trophy for the prettiest kite',
            'A brand new kite',
            'A gold medal for speed',
          ],
          explanation: 'The judge gave her a blue ribbon for the highest flight.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What did Nina say her secret was?',
          answer: 'The long paper tail she taped on',
          distractors: ['Running very fast', 'Waiting for a windy day', 'Using thin sticks'],
          explanation: 'She told the judge the secret was the long tail she taped on that morning.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What does this story show?',
          answer: 'A homemade kite can beat expensive ones',
          distractors: [
            'Contests are not fair',
            'Newspaper is the strongest material',
            'Nina should buy a kite next time',
          ],
          explanation: 'Nina beat all the store-bought kites with newspaper and sticks.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'A Nest on the Porch',
      icon: '🐦',
      text: `A robin built her nest right on top of our porch light. Dad said we could not switch the light on until the eggs had hatched. For two weeks we tiptoed past the door. Then one morning we heard peeping, and four grey chicks stretched their necks up with their beaks wide open. By the end of June the nest was empty, and the porch light was ours again.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Where did the robin build her nest?',
          answer: 'On top of the porch light',
          distractors: ['In the mailbox', 'In a tall tree', 'Under the front steps'],
          explanation: 'The first sentence says the nest was right on top of the porch light.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What happened right after the family heard peeping?',
          answer: 'They saw four grey chicks',
          distractors: [
            'The robin flew away',
            'They turned the light on',
            'The nest fell down',
          ],
          explanation: 'One morning they heard peeping, and then four grey chicks stretched up.',
          skill: 'sequence',
        },
        {
          id: 'q3',
          prompt: 'How long did the family tiptoe past the door?',
          answer: 'About two weeks',
          distractors: ['Two days', 'All summer', 'Four months'],
          explanation: 'The story says for two weeks we tiptoed past the door.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: '"The porch light was ours again" means that',
          answer: 'the family could finally use the light',
          distractors: [
            'they bought a new light',
            'the robin gave them a gift',
            'the light was broken',
          ],
          explanation: 'They had left it switched off for the nest, and now the birds had gone.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: "Sam's Lemonade Stand",
      icon: '🍋',
      text: `Sam set up a lemonade stand at the end of his driveway. On the first day he sold two cups. His sister told him that nobody walking by could even see his sign. So together they carried the table to the corner beside the bus stop. The next day Sam sold nineteen cups and ran right out of ice. That night he gave his sister half of the money for her good idea.`,
      questions: [
        {
          id: 'q1',
          prompt: 'How many cups did Sam sell on the first day?',
          answer: 'Two',
          distractors: ['Nine', 'Nineteen', 'None at all'],
          explanation: 'On the first day he sold two cups.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What was wrong with the first spot?',
          answer: 'Nobody could see the sign',
          distractors: [
            'The lemonade was too sour',
            'It rained all day',
            'He charged too much money',
          ],
          explanation: 'His sister said nobody walking by could even see his sign.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What did Sam and his sister do to fix the problem?',
          answer: 'Moved the table to the corner by the bus stop',
          distractors: ['Painted a bigger sign', 'Lowered the price', 'Sold cookies as well'],
          explanation: 'They carried the table to the corner beside the bus stop.',
          skill: 'sequence',
        },
        {
          id: 'q4',
          prompt: 'Why did Sam share the money with his sister?',
          answer: 'Her idea helped him sell far more lemonade',
          distractors: [
            'She made the lemonade',
            'She paid for the ice',
            'The table belonged to her',
          ],
          explanation: 'He gave her half the money for her good idea about the corner.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'The Library Card',
      icon: '📚',
      text: `Ruth turned seven on Tuesday, and her present was a library card of her very own. The librarian showed her how to slide it under the scanner. Ruth chose six books, all of them about sharks. They were so heavy that her mother had to carry the bag out to the car. That night Ruth read until her eyes closed, and the smallest book stayed open on her pillow all night.`,
      questions: [
        {
          id: 'q1',
          prompt: "What was Ruth's birthday present?",
          answer: 'A library card of her own',
          distractors: ['Six shark books', 'A new school bag', 'A card scanner'],
          explanation: 'Her present was a library card of her very own.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What were all six books about?',
          answer: 'Sharks',
          distractors: ['Space', 'Horses', 'Birthdays'],
          explanation: 'Ruth chose six books, all of them about sharks.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What day was her birthday?',
          answer: 'Tuesday',
          distractors: ['Sunday', 'Friday', 'Saturday'],
          explanation: 'The story says Ruth turned seven on Tuesday.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why did her mother carry the bag?',
          answer: 'The books were too heavy for Ruth',
          distractors: [
            'Ruth was already asleep',
            'Ruth was holding her card',
            'The bag belonged to her mother',
          ],
          explanation: 'The story says they were so heavy that her mother had to carry the bag.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'Camping Night',
      icon: '🏕️',
      text: `We put the tent up before dark, but we had forgotten the pillows. Dad rolled up our coats instead. After supper we lay on our backs and counted twelve shooting stars. An owl called from somewhere very close, and my brother pulled the blanket over his head. In the morning our coats were flat and our necks were sore, but not one of us wanted to go home.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What had the family forgotten?',
          answer: 'The pillows',
          distractors: ['The tent', 'The blankets', 'Their supper'],
          explanation: 'They put the tent up, but they had forgotten the pillows.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did they use instead?',
          answer: 'Rolled-up coats',
          distractors: ['Backpacks', 'Folded towels', 'Nothing at all'],
          explanation: 'Dad rolled up their coats instead.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'How many shooting stars did they count?',
          answer: 'Twelve',
          distractors: ['Two', 'Twenty', 'None'],
          explanation: 'After supper they counted twelve shooting stars.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why did the brother pull the blanket over his head?',
          answer: 'The owl call made him nervous',
          distractors: [
            'He was too cold',
            'He wanted to sleep late',
            'He did not want to see the stars',
          ],
          explanation: 'He hid as soon as an owl called from somewhere very close.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'The Class Turtle',
      icon: '🐢',
      text: `Our class turtle is named Waffle. Every Friday one student takes him home for the weekend. When my turn came, I learned that Waffle eats lettuce happily but shoves carrots away with his nose. I also learned that he thumps the side of his tank at bedtime until the lamp goes off. On Monday I wrote all of it on a card and taped the card to his tank for the next person.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Which food does Waffle push away?',
          answer: 'Carrots',
          distractors: ['Lettuce', 'Fish', 'Apples'],
          explanation: 'He eats lettuce happily but shoves carrots away with his nose.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What does Waffle do at bedtime?',
          answer: 'Thumps his tank until the lamp is off',
          distractors: ['Hides inside his shell', 'Swims in circles', 'Eats his dinner'],
          explanation: 'He thumps the side of his tank at bedtime until the lamp goes off.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What did the writer do on Monday?',
          answer: 'Taped a card of tips to the tank',
          distractors: [
            'Took Waffle home again',
            'Fed Waffle carrots',
            'Turned the lamp off',
          ],
          explanation: 'On Monday the writer wrote it all on a card and taped it to the tank.',
          skill: 'sequence',
        },
        {
          id: 'q4',
          prompt: 'Why did the writer make the card?',
          answer: 'So the next student would know how to care for Waffle',
          distractors: [
            'To get a good grade',
            "To remember the turtle's name",
            'To tell the teacher Waffle was sick',
          ],
          explanation: 'The card was taped to the tank for the next person to read.',
          skill: 'mainIdea',
        },
      ],
    },
  ],
  3: [
    {
      title: 'The Sunflower Race',
      icon: '🌻',
      text: `In April, Mr. Okafor gave everyone in the class one sunflower seed and one paper cup. Whoever grew the tallest plant by June would keep the class watering can as a prize. Jamal put his cup on the sunny windowsill and watered it every single morning. Priya put hers on a shelf by the sink, where the light was weak, and forgot about it for days at a time. By the middle of May, Jamal's stem reached his elbow. Priya's was thin and pale, and it leaned hard toward the window as if it were reaching for something. When Priya finally moved her cup into the sun, it grew four new leaves in a week.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What was the prize?',
          answer: 'The class watering can',
          distractors: ['A packet of seeds', 'A paper cup', 'A blue ribbon'],
          explanation: 'Whoever grew the tallest plant by June would keep the watering can.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: "Why did Priya's plant do badly at first?",
          answer: 'It sat in weak light and was often not watered',
          distractors: [
            'Her seed was old',
            'She gave it far too much water',
            'Her cup was too small',
          ],
          explanation: 'Her shelf by the sink had weak light, and she forgot it for days at a time.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Why did her stem lean toward the window?',
          answer: 'It was growing toward the light',
          distractors: [
            'It was too heavy to stand up',
            'Someone had pushed it over',
            'The wind blew it sideways',
          ],
          explanation: 'The light was weak on the shelf, and the plant leaned as if reaching for it.',
          skill: 'inference',
        },
        {
          id: 'q4',
          prompt: 'What does this story mostly teach?',
          answer: 'Plants need light and steady care to grow well',
          distractors: [
            'Contests are unfair to some students',
            'April is the only month to plant seeds',
            'Sunflowers grow faster than any other plant',
          ],
          explanation:
            "Jamal's plant thrived in sun and daily water; Priya's only improved once it had light.",
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'Moving Day',
      icon: '📦',
      text: `The truck came at seven in the morning. Elena had packed her books, her rock collection, and the model plane her grandfather built, but she left the closet door open so she could keep looking at the pencil marks on the frame. Her mother had drawn a line there on every one of her birthdays since she was two. When the last box was gone, her mother took a photograph of the marks. "The wall stays," she said, "but the picture comes with us." In the new apartment the photograph went up in the kitchen, and on Elena's next birthday her mother started a new line on a new door frame.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What were the pencil marks on the door frame?',
          answer: 'A line drawn on each of her birthdays',
          distractors: [
            "Elena's drawings",
            'Marks left by the movers',
            'A game Elena played',
          ],
          explanation: 'Her mother had drawn a line there on every birthday since she was two.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did her mother do before they left?',
          answer: 'Took a photograph of the marks',
          distractors: [
            'Painted over the marks',
            'Took the door frame with them',
            'Rubbed the marks out',
          ],
          explanation: 'When the last box was gone, her mother photographed the marks.',
          skill: 'sequence',
        },
        {
          id: 'q3',
          prompt: 'Why did Elena keep looking at the door frame?',
          answer: 'It held a record of her growing up',
          distractors: [
            'It was her favorite door',
            'She had hidden something behind it',
            'She had drawn the marks herself',
          ],
          explanation: 'Every line was one of her birthdays, so the frame showed how she had grown.',
          skill: 'inference',
        },
        {
          id: 'q4',
          prompt: 'What does her mother mean by "the picture comes with us"?',
          answer: 'They can carry the memory even though the wall stays behind',
          distractors: [
            'They will take the door with them',
            'The photograph is worth a lot of money',
            'They will come back for the frame one day',
          ],
          explanation: 'The photograph goes up in the new kitchen, and a new line is started there.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: 'The Old Bicycle',
      icon: '🚲',
      text: `The bicycle in Grandpa's shed had two flat tires, a rusted chain, and no seat at all. Theo asked whether he could have it. Grandpa laughed and said it was more rust than bicycle, but he handed over the key to the toolbox anyway. It took Theo three weekends. He scrubbed the chain with an old toothbrush and oil, patched both inner tubes, and found a seat at a yard sale for two dollars. On the next Saturday he rode it down the lane while Grandpa watched from the porch. "More bicycle than rust now," Grandpa said.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What was wrong with the bicycle?',
          answer: 'Flat tires, a rusted chain, and no seat',
          distractors: [
            'Bent wheels and no handlebars',
            'A cracked frame and no pedals',
            'Nothing — it was brand new',
          ],
          explanation: 'The first sentence lists two flat tires, a rusted chain, and no seat.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'How long did the repairs take?',
          answer: 'Three weekends',
          distractors: ['One afternoon', 'Three months', 'A whole year'],
          explanation: 'The story says it took Theo three weekends.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Where did Theo get a seat?',
          answer: 'At a yard sale, for two dollars',
          distractors: [
            "From Grandpa's shed",
            'He built one himself',
            'From a bicycle shop',
          ],
          explanation: 'He found a seat at a yard sale for two dollars.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: '"More bicycle than rust now" tells us that',
          answer: 'Theo had repaired it well',
          distractors: [
            'the bicycle was still broken',
            'the bicycle had grown bigger',
            'Grandpa wanted it back',
          ],
          explanation:
            'Grandpa had called it more rust than bicycle before; now he says the opposite.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: 'Tide Pools',
      icon: '🐚',
      text: `Twice a day the sea pulls back from the rocks at Bell Point and leaves behind small pools of water. Each pool is a tiny world. Sea stars grip the stone with hundreds of little tube feet. Crabs no bigger than a thumbnail scuttle under the ledges. Anemones look like soft flowers until you touch one, and then it folds itself shut in a second. The animals here have to survive both the crash of the waves and hours of hot sun. When the tide returns, the pools vanish back into the ocean, and the whole small world waits for the next low tide.`,
      questions: [
        {
          id: 'q1',
          prompt: 'How often does the sea pull back at Bell Point?',
          answer: 'Twice a day',
          distractors: ['Once a week', 'Twice a year', 'Every hour'],
          explanation: 'The passage begins by saying twice a day the sea pulls back.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What happens when you touch an anemone?',
          answer: 'It folds itself shut',
          distractors: ['It swims away', 'It opens wider', 'It changes color'],
          explanation: 'They look like soft flowers until you touch one, and then it shuts.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What two hardships do tide pool animals face?',
          answer: 'Crashing waves and hours of hot sun',
          distractors: [
            'Snow and strong wind',
            'Deep water and darkness',
            'Hungry fishermen and boats',
          ],
          explanation: 'The passage says they must survive the crash of the waves and hot sun.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What is this passage mostly about?',
          answer: 'The small world of life inside tide pools',
          distractors: [
            'How to catch crabs safely',
            'Why the tide goes in and out',
            'A family day at the beach',
          ],
          explanation: 'Every sentence describes the pools and the animals living in them.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'The Talent Show',
      icon: '🎤',
      text: `Devon signed up for the talent show in September and chose a song he had sung a hundred times in his own kitchen. In the auditorium, though, the microphone squealed, and every word went straight out of his head. He stood there for four long seconds. Then Mrs. Vance, at the piano, quietly played the opening notes a second time. Devon found the first line and did not lose it again. Afterward people told him the pause had made the ending sound braver. He signed up again the next year, and that time he practiced on the real stage first.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What went wrong on stage?',
          answer: 'The microphone squealed and Devon forgot the words',
          distractors: [
            'He tripped on the steps',
            'The piano would not play',
            'He lost his sheet music',
          ],
          explanation: 'The microphone squealed and every word went out of his head.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Who helped him, and how?',
          answer: 'Mrs. Vance played the opening notes again',
          distractors: [
            'His mother called out the words',
            'Another singer joined him',
            'The principal restarted the show',
          ],
          explanation: 'Mrs. Vance, at the piano, quietly played the opening notes a second time.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What did Devon do differently the next year?',
          answer: 'He practiced on the real stage first',
          distractors: [
            'He chose an easier song',
            'He sang without a microphone',
            'He played the piano instead',
          ],
          explanation: 'The last sentence says that time he practiced on the real stage first.',
          skill: 'sequence',
        },
        {
          id: 'q4',
          prompt: 'What did Devon learn?',
          answer: 'Practicing in the real place helps you handle nerves',
          distractors: [
            'Talent shows should be cancelled',
            'He is not a good singer',
            'Microphones are always broken',
          ],
          explanation: 'His kitchen practice was not enough, so the next year he rehearsed on stage.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'Bread from Scratch',
      icon: '🍞',
      text: `Flour, water, salt, and yeast — four ingredients, and one of them is alive. Yeast is a tiny fungus that eats the sugars in the dough and gives off gas as it feeds. That gas is trapped by stretchy strands of gluten, which is why a bowl of dough swells to twice its size in a warm kitchen. Knead the dough too little and the strands stay weak; knead it far too long and they tear. When the loaf goes into the hot oven the trapped bubbles push once more, the outside hardens into crust, and the yeast finally dies.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Which ingredient is alive?',
          answer: 'The yeast',
          distractors: ['The flour', 'The salt', 'The water'],
          explanation: 'Yeast is described as a tiny fungus that eats the sugars in the dough.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Why does the dough swell?',
          answer: 'Gas from the yeast is trapped by strands of gluten',
          distractors: [
            'The water inside it boils',
            'Salt makes the flour expand',
            'The warm kitchen melts it',
          ],
          explanation: 'The yeast gives off gas, and stretchy gluten strands trap it.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What happens if dough is kneaded far too long?',
          answer: 'The gluten strands tear',
          distractors: [
            'It rises much faster',
            'It tastes too salty',
            'The yeast dies early',
          ],
          explanation: 'Too little kneading leaves the strands weak; too much tears them.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'In this passage, to knead means to',
          answer: 'work and press the dough with your hands',
          distractors: [
            'bake at a very high heat',
            'add more flour to the bowl',
            'leave the dough alone to rest',
          ],
          explanation: 'Kneading is what builds or tears the gluten strands in the dough.',
          skill: 'vocabulary',
        },
      ],
    },
  ],
  4: [
    {
      title: "The Mapmaker's Trick",
      icon: '🗺️',
      text: `Old mapmakers had a problem: their maps were expensive to survey but cheap to copy. A rival could reprint the same roads and rivers and undersell them. So some mapmakers invented a defense. They added a street that did not exist — a short lane with an invented name, tucked between two real ones. If that lane later turned up on a competitor's map, there was only one possible explanation: the competitor had copied rather than surveyed. These inventions are called trap streets. Most are harmless, though a few have sent delivery drivers hunting for an address that was never built. Modern digital maps still carry the occasional trap, and mapmakers rarely admit which entries are the fakes.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What problem did old mapmakers face?',
          answer: 'Maps cost a lot to survey but were cheap to copy',
          distractors: [
            'Roads changed far too often',
            'Paper was hard to find',
            'Most people could not read maps',
          ],
          explanation: 'A rival could reprint the same roads and rivers and undersell them.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What is a trap street?',
          answer: 'An invented street added to catch copiers',
          distractors: [
            'A street that has been closed off',
            'A dead end with no exit',
            'A street with a confusing name',
          ],
          explanation: 'It is a short lane with an invented name, tucked between two real ones.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: "If a trap street appears on a rival's map, what does it prove?",
          answer: 'The rival copied instead of surveying',
          distractors: [
            'The street was built later on',
            'Both mapmakers surveyed the same area',
            'The rival made an honest mistake',
          ],
          explanation:
            'The street does not exist, so it could only have come from the original map.',
          skill: 'inference',
        },
        {
          id: 'q4',
          prompt: 'What trouble can trap streets cause?',
          answer: 'Drivers may hunt for an address that was never built',
          distractors: [
            'Maps become far more expensive',
            'Real streets get renamed',
            'Rivers are drawn in the wrong place',
          ],
          explanation: 'The passage says a few have sent delivery drivers hunting for an address.',
          skill: 'detail',
        },
        {
          id: 'q5',
          prompt: 'In this passage, to survey land means to',
          answer: 'measure and record it carefully',
          distractors: [
            'ask people questions about it',
            'draw it from memory',
            'print copies of it',
          ],
          explanation: 'Surveying is contrasted with copying — it is the expensive, careful work.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: 'Honeybees on the Roof',
      icon: '🐝',
      text: `The hardware store on Ninth Street keeps four beehives on its flat roof. The owner, Ms. Reyes, started with a single hive after reading that city bees often do better than country ones. It sounds backwards, but cities are full of parks, window boxes, and weedy lots that bloom at different times, so the bees can find something in flower from March until October. Farm country, by contrast, may hold thousands of acres of one single crop that flowers for two weeks and then offers nothing at all. Ms. Reyes harvests about sixty pounds of honey a year and sells it beside the register. She says the flavor changes every month, because her bees are tasting a different block of the neighborhood.`,
      questions: [
        {
          id: 'q1',
          prompt: 'How many hives are on the roof now?',
          answer: 'Four',
          distractors: ['One', 'Ten', 'Sixty'],
          explanation: 'She keeps four hives now, though she started with a single one.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Why can city bees do better than country bees?',
          answer: 'City plants bloom at different times all season long',
          distractors: [
            'Cities are much warmer',
            'Cities have no predators',
            'City bees are a different species',
          ],
          explanation: 'Parks, window boxes and weedy lots keep something in flower March to October.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What is the trouble with a huge field of a single crop?',
          answer: 'It flowers briefly and then offers nothing',
          distractors: [
            'It is sprayed with water',
            'It is too far from any hive',
            'Its flowers are the wrong color',
          ],
          explanation: 'The crop flowers for two weeks and then offers nothing at all.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why does the honey taste different each month?',
          answer: 'Different plants are in bloom in each month',
          distractors: [
            'The bees are moved between hives',
            'Ms. Reyes adds flavoring',
            'The honey ages on the shelf',
          ],
          explanation: 'She says the bees are tasting a different block of the neighborhood.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'What is this passage mostly about?',
          answer: 'Why a city rooftop can be a good place to keep bees',
          distractors: [
            'How to build a beehive',
            'The history of a hardware store',
            'Why farms are bad places to live',
          ],
          explanation: 'The whole passage explains why city bees find food all season.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'The Relay',
      icon: '🏃',
      text: `Coach Duarte put Iris on the third leg, which surprised everybody, because Iris was the slowest of the four. What Iris could do was take a handoff. The exchange zone is only twenty meters long, and a baton dropped or passed outside it disqualifies the whole team. In practice the other schools lost tenths of a second fumbling; Iris never once looked back for the baton. She held her hand steady and trusted the runner behind her to place it. At the district meet the team sat in fourth place when Iris took the stick, and third when she passed it on. They did not win. But they were the only team of the eight that did not lose a single exchange.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Why was putting Iris on the third leg surprising?',
          answer: 'She was the slowest runner of the four',
          distractors: [
            'She was new to the team',
            'She had been injured',
            'She had never run a relay',
          ],
          explanation: 'The first sentence says Iris was the slowest of the four.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What can disqualify a relay team?',
          answer: 'Dropping the baton or passing it outside the zone',
          distractors: [
            'Finishing in last place',
            'Running in the wrong lane',
            'Passing the baton left-handed',
          ],
          explanation: 'A baton dropped or passed outside the zone disqualifies the whole team.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'How long is the exchange zone?',
          answer: 'Twenty meters',
          distractors: ['Four meters', 'Ten meters', 'One hundred meters'],
          explanation: 'The passage says the exchange zone is only twenty meters long.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why did Coach Duarte choose Iris?',
          answer: 'Her clean handoffs saved more time than raw speed could',
          distractors: [
            'He wanted to be fair to everyone',
            'She asked him for the spot',
            'The faster runners were all hurt',
          ],
          explanation: 'Other teams lost tenths of a second fumbling, and Iris never fumbled.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'What is the point of the last sentence?',
          answer: 'A team can do something remarkable without winning',
          distractors: [
            'The team should have won the race',
            'Iris was the best runner after all',
            'Exchanges do not really matter',
          ],
          explanation: 'They lost the race but were the only team of eight with clean exchanges.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'Letters in the Attic',
      icon: '✉️',
      text: `When we cleared out my great-aunt's house we found a cigar box of letters tied with a shoelace. They were written between 1943 and 1946 by a man named Emil, who signed each one with a single initial. My great-aunt had never once mentioned him. The letters describe rationing, a broken radio, and a plan to open a bakery that, as far as anybody knows, never opened. Half of a sentence in the last letter has been cut away with scissors — deliberately, my mother thinks, because the cut is perfectly straight. We will probably never learn who Emil was. Still, my mother had the letters copied for each of her sisters, and now four families keep a story that was almost thrown out with the carpet.`,
      questions: [
        {
          id: 'q1',
          prompt: 'When were the letters written?',
          answer: 'Between 1943 and 1946',
          distractors: ['In the 1860s', 'In the 1990s', 'Last summer'],
          explanation: 'The passage says they were written between 1943 and 1946.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'How did Emil sign the letters?',
          answer: 'With a single initial',
          distractors: [
            'With his full name',
            'With a small drawing',
            'He did not sign them at all',
          ],
          explanation: 'He signed each one with a single initial.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What is strange about the last letter?',
          answer: 'Half a sentence was cut out with scissors',
          distractors: [
            'It was never opened',
            'It is written in another language',
            'It has no date on it',
          ],
          explanation: 'Half of a sentence in the last letter has been cut away.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why does the mother think the cut was deliberate?',
          answer: 'Because the cut is perfectly straight',
          distractors: [
            'Because the letter is short',
            'Because Emil warned her about it',
            'Because of the date on the envelope',
          ],
          explanation: 'A straight cut suggests scissors and a decision, not an accident.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'Why did the mother copy the letters for her sisters?',
          answer: 'So the family story would not be lost',
          distractors: [
            'To sell the originals',
            'To help find Emil',
            'Because the originals were damaged',
          ],
          explanation: 'Now four families keep a story that was almost thrown out with the carpet.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'The Meteor Shower',
      icon: '☄️',
      text: `A meteor shower is not really a storm of rocks falling toward Earth. It is Earth driving through a trail of old dust. Comets shed grit as they swing near the Sun, leaving a stream of it along their orbit. Once a year our planet crosses that stream, and the grains — most no bigger than a grain of sand — slam into the upper atmosphere at tens of thousands of kilometers an hour. Friction heats the air around each grain until it glows. The streak you see is not the rock burning; it is the column of hot air left behind it. This is also why the viewing is best after midnight: your side of the planet has turned to face forward into the stream, like a windshield rather than a rear window.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Where does the dust in a meteor shower come from?',
          answer: 'Grit shed by comets near the Sun',
          distractors: ['Broken satellites', 'Dust blown off the Moon', 'Volcanoes on Earth'],
          explanation: 'Comets shed grit as they swing near the Sun, leaving a stream of it.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'How big are most of the grains?',
          answer: 'No bigger than a grain of sand',
          distractors: ['About the size of a car', 'Several meters wide', 'As big as a house'],
          explanation: 'The passage says most are no bigger than a grain of sand.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What is the streak in the sky, exactly?',
          answer: 'A column of glowing hot air',
          distractors: [
            'The rock itself burning',
            'Light reflected off the dust',
            'A distant star moving',
          ],
          explanation: 'Friction heats the air around the grain until it glows.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why is the viewing better after midnight?',
          answer: 'Your side of Earth has turned to face forward into the stream',
          distractors: [
            'The sky is simply darker then',
            'Meteors only fall late at night',
            'The comet passes closest at midnight',
          ],
          explanation: 'After midnight your side leads the way, like a windshield.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'The windshield comparison helps explain',
          answer: 'why the forward-facing side of Earth catches more meteors',
          distractors: [
            'why meteors are dangerous to cars',
            'how car windows are made',
            'why glass breaks under pressure',
          ],
          explanation: 'A windshield meets what the car drives into; a rear window does not.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: 'The Beaver Dam',
      icon: '🦫',
      text: `When the county removed a beaver dam on Miller Creek, the pond behind it drained in two days. Within a month people noticed changes nobody had predicted. The wet meadow that the pond had fed dried out and cracked. The frogs that bred there vanished, and so did the herons that ate the frogs. Downstream, the creek ran faster and browner, because the pond had been settling out silt for years. The following spring a new pair of beavers built a dam a hundred meters upstream, and this time the county left it alone. A biologist told the local paper that beavers had been engineering these valleys for far longer than the county had been managing them.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What happened first after the dam was removed?',
          answer: 'The pond drained in two days',
          distractors: [
            'The herons left the valley',
            'The meadow dried and cracked',
            'New beavers arrived',
          ],
          explanation: 'The pond drained in two days; the other changes came within a month or later.',
          skill: 'sequence',
        },
        {
          id: 'q2',
          prompt: 'Why did the herons disappear?',
          answer: 'The frogs they fed on were gone',
          distractors: [
            'Hunters frightened them away',
            'The water became too deep',
            'They flew south for the winter',
          ],
          explanation: 'The frogs vanished when the meadow dried, and the herons ate the frogs.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Why did the creek run browner downstream?',
          answer: 'The pond had been settling out silt for years',
          distractors: [
            'Someone dumped mud into it',
            'It rained much more that month',
            'The beavers stirred up the bottom',
          ],
          explanation: 'Without the pond, the silt stayed in the moving water.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why did the county leave the new dam alone?',
          answer: 'Removing the first one had caused harm nobody expected',
          distractors: [
            'They had run out of money',
            'The new dam was much smaller',
            'The beavers were protected by a new law',
          ],
          explanation: 'The listed damage followed the removal, so they did not repeat it.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: "What does the biologist's comment suggest?",
          answer: 'Beavers have shaped these valleys skillfully for far longer than people have',
          distractors: [
            'Beavers should be removed from the creek',
            'The county staff are well trained',
            'Newspapers exaggerate such stories',
          ],
          explanation:
            'The word "engineering" credits the beavers with work the county did badly.',
          skill: 'mainIdea',
        },
      ],
    },
  ],
  5: [
    {
      title: "The Keeper's Log",
      icon: '🗼',
      text: `The last keeper of the Sable Rock light kept his log in a small, cramped hand, one line a day for eleven years. Nearly every entry is weather: "Fog to noon." "Gale from the north-east, lens clean." Then, on the third of October 1934, a single sentence breaks the pattern: "Nothing to report, though I heard the bell of a ship that is not there." There is no follow-up. The next day's entry returns to wind direction and the state of the oil. Historians who have studied the log disagree about that line. Some read it as plain exhaustion, since the keeper had been alone for six weeks. Others point out that a ship named the Alba sank ten miles off Sable Rock in 1919, and that stories about her bell were common along that coast. The log tells us only what the keeper chose to write, and it is deliberately, maddeningly brief.`,
      questions: [
        {
          id: 'q1',
          prompt: 'How often did the keeper write in his log?',
          answer: 'One line a day',
          distractors: ['Once a week', 'Twice a day', 'Only when a ship passed'],
          explanation: 'He kept it in a cramped hand, one line a day for eleven years.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did the entry of 3 October 1934 say?',
          answer: 'He had heard the bell of a ship that was not there',
          distractors: [
            'A ship had sunk that night',
            'A gale was coming from the north-east',
            'The lens needed cleaning',
          ],
          explanation: 'That is the single sentence that breaks the pattern of weather entries.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What explanation do some historians offer?',
          answer: 'Exhaustion, after six weeks alone',
          distractors: [
            'He invented it to get attention',
            'He actually saw the Alba',
            'He misread his own handwriting',
          ],
          explanation: 'Some read the line as plain exhaustion, since he had been alone six weeks.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Calling the log "maddeningly brief" shows that the writer is',
          answer: 'frustrated that it explains so little',
          distractors: [
            'angry at the keeper personally',
            'bored by weather reports',
            'pleased the log is short to read',
          ],
          explanation: 'The brevity is what keeps the question unanswered, and that is maddening.',
          skill: 'vocabulary',
        },
        {
          id: 'q5',
          prompt: 'What is this passage mostly about?',
          answer: 'One unexplained line in a log, and the debate over what it meant',
          distractors: [
            'How a lighthouse is operated',
            'The sinking of the Alba in 1919',
            'What daily life was like in 1934',
          ],
          explanation: 'The passage sets up the odd entry and then gives both readings of it.',
          skill: 'mainIdea',
        },
      ],
    },
    {
      title: 'Seeds in the Vault',
      icon: '🌱',
      text: `On a frozen island between Norway and the North Pole, a tunnel runs 120 meters into a sandstone mountain. At the end of it sit three chambers holding more than a million seed samples: wheat from Syria, rice from the Philippines, beans from Peru. The Svalbard Global Seed Vault is a backup, not a museum. Countries deposit duplicates of seeds already stored in their own national banks, and only the depositor is allowed to withdraw them. That has happened once. In 2015, researchers who had fled the war in Aleppo requested their samples so they could rebuild their collection in Lebanon and Morocco. They grew the seeds, harvested new ones, and sent replacements back to the vault. The mountain was chosen because its permafrost would keep the chambers cold even if the power failed — though a warming Arctic has already forced engineers to waterproof the entrance tunnel.`,
      questions: [
        {
          id: 'q1',
          prompt: 'What is stored in the vault?',
          answer: 'Duplicate seed samples from national seed banks',
          distractors: [
            'Rare plants growing in soil',
            'Historical farming documents',
            'Frozen animals and eggs',
          ],
          explanation: 'Countries deposit duplicates of seeds already held in their own banks.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Who is allowed to withdraw seeds?',
          answer: 'Only whoever deposited them',
          distractors: [
            'Anyone who applies in writing',
            'The Norwegian government',
            'Any researcher with a permit',
          ],
          explanation: 'The passage says only the depositor is allowed to withdraw them.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Why was the single withdrawal made in 2015?',
          answer: 'To rebuild a collection lost to the war in Aleppo',
          distractors: [
            'To test whether old seeds still grew',
            'To sell rare varieties abroad',
            'Because the vault had run out of room',
          ],
          explanation: 'Researchers who had fled Aleppo rebuilt their collection in Lebanon and Morocco.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'Why does the passage call the vault "a backup, not a museum"?',
          answer: 'Its purpose is to replace seeds that are lost, not to display them',
          distractors: [
            'It is closed to all visitors',
            'The seeds it holds are not valuable',
            'It happens to be underground',
          ],
          explanation: 'The 2015 withdrawal shows exactly the purpose a backup is meant to serve.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'What problem has the warming Arctic already caused?',
          answer: 'Engineers had to waterproof the entrance tunnel',
          distractors: [
            'Stored seeds have begun to sprout',
            'The vault has had to be moved',
            'Countries have stopped depositing seeds',
          ],
          explanation: 'The permafrost was the reason for the site, and it is no longer reliable.',
          skill: 'detail',
        },
      ],
    },
    {
      title: 'The Understudy',
      icon: '🎭',
      text: `For eleven weeks Marisol learned a part she did not expect to play. She sat at the back of the rehearsal room with the script open on her knees, mouthing another actor's lines and copying her blocking into a notebook: three steps left on "I never promised," turn on the laugh. On the night of the third performance the lead slipped on a wet step outside the theater and broke her wrist. The stage manager found Marisol in the corridor and said only, "You're on." She had never rehearsed under the lights, and she had never once run the second act opposite another living actor. What carried her was the notebook — not the words, which she already knew, but the geography of where a body had to be at every single moment, drawn out in her own small handwriting.`,
      questions: [
        {
          id: 'q1',
          prompt: 'How long had Marisol been preparing?',
          answer: 'Eleven weeks',
          distractors: ['Three nights', 'One week', 'Two years'],
          explanation: 'For eleven weeks she learned a part she did not expect to play.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What did she record in her notebook?',
          answer: "The lead's movements and positions on stage",
          distractors: [
            'Costume and makeup ideas',
            'The lighting and sound cues',
            'New lines she had written herself',
          ],
          explanation: 'She copied the blocking: three steps left on a line, turn on the laugh.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'Why did Marisol have to perform?',
          answer: 'The lead fell and broke her wrist',
          distractors: [
            'The lead quit the production',
            'She won a second audition',
            'The lead arrived too late',
          ],
          explanation: 'The lead slipped on a wet step outside the theater and broke her wrist.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'In this passage, blocking means',
          answer: "the actors' planned movements on stage",
          distractors: [
            'an entrance that has been blocked off',
            'forgetting your lines under pressure',
            'the scenery built at the back of the stage',
          ],
          explanation: 'The examples given are steps and turns tied to particular lines.',
          skill: 'vocabulary',
        },
        {
          id: 'q5',
          prompt: 'What does the last sentence suggest helped her most?',
          answer: 'Knowing exactly where to move, not just what to say',
          distractors: [
            'Her memory for the lines',
            "The stage manager's advice",
            'The lighting design',
          ],
          explanation: 'It says what carried her was the geography of the part, not the words.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'Why the Sea Is Salty',
      icon: '🧂',
      text: `Rain is fresh and rivers are fresh, and yet the ocean is salty — which sounds like a contradiction until you follow the water. Rainwater is slightly acidic, and as it runs over rock it dissolves tiny quantities of minerals, sodium and chloride among them, and carries them downhill. Every river on Earth is delivering a faint load of salt to the sea, all the time. The difference is what happens next. Water leaves the ocean by evaporation, and evaporation lifts only the water; the salt stays behind. Over hundreds of millions of years that one-way arrangement has concentrated the ocean to roughly 35 grams of salt in every liter. Undersea volcanic vents add still more. The system is not runaway, though: salt is also removed, settling into sediments and locking into new rock, so the ocean's saltiness has held roughly steady for a very long time.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Where does most ocean salt come from?',
          answer: 'Minerals dissolved out of rock and carried down by rivers',
          distractors: [
            'Salt made by sea creatures',
            'Salt falling in the rain',
            'Salt spilled by ships',
          ],
          explanation: 'Slightly acidic rain dissolves minerals from rock and carries them downhill.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'Why does salt build up in the ocean?',
          answer: 'Evaporation lifts the water but leaves the salt behind',
          distractors: [
            'Rivers carry the salt back out again',
            'Fish release salt as they feed',
            'The ocean is simply very deep',
          ],
          explanation: 'Water leaves by evaporation, and evaporation lifts only the water.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'About how much salt is in a liter of seawater?',
          answer: 'About 35 grams',
          distractors: ['About 3 grams', 'About 350 grams', 'It varies from none to solid'],
          explanation: 'The passage gives roughly 35 grams of salt in every liter.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What keeps the ocean from growing saltier forever?',
          answer: 'Salt settles into sediments and locks into new rock',
          distractors: [
            'Rain washes the salt back to land',
            'Volcanic vents absorb the salt',
            'Nothing does — it rises every year',
          ],
          explanation: 'Salt is removed as well as added, so saltiness has held roughly steady.',
          skill: 'detail',
        },
        {
          id: 'q5',
          prompt: 'The phrase "that one-way arrangement" refers to',
          answer: 'water leaving the ocean while the salt stays',
          distractors: [
            'salt escaping into the air',
            'rivers running only downhill',
            'the ocean slowly growing larger',
          ],
          explanation: 'The sentence before it explains that evaporation lifts water but not salt.',
          skill: 'vocabulary',
        },
      ],
    },
    {
      title: 'The Debate',
      icon: '🗣️',
      text: `The motion was that the school should stop assigning homework at weekends, and Theo drew the side he disagreed with. He spent four days building the strongest case he could for a position he thought was wrong: studies on diminishing returns, a survey of forty students, a comparison with two neighboring districts. He won the round. What unsettled him was the walk home. He kept turning his own arguments over and finding that three of the four still held up once he had taken the debater's hat off. He did not switch sides entirely. But he came to class the next week with a shorter and more careful version of what he had believed before, and when a friend asked what had changed his mind, he said it had not been a person at all — it was having to argue well against himself.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Which side did Theo argue?',
          answer: 'The side he personally disagreed with',
          distractors: [
            'The side he already believed',
            'Both sides in turn',
            'He refused to take a side',
          ],
          explanation: 'He drew the side he disagreed with and argued it anyway.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'What evidence did he gather?',
          answer: 'Studies, a student survey, and a comparison of districts',
          distractors: [
            'Interviews with his teachers',
            'A single textbook chapter',
            'Only his own opinions',
          ],
          explanation:
            'He used studies on diminishing returns, a survey of forty students, and two districts.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What happened in the round itself?',
          answer: 'He won',
          distractors: ['He lost narrowly', 'It ended in a tie', 'He withdrew halfway'],
          explanation: 'The passage says simply: he won the round.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What actually changed his thinking?',
          answer: 'Having to build a strong case against his own view',
          distractors: [
            'Losing an argument badly',
            "A teacher's lecture on homework",
            "His friend's advice after class",
          ],
          explanation: 'He told his friend it was not a person — it was arguing well against himself.',
          skill: 'inference',
        },
        {
          id: 'q5',
          prompt: 'Did Theo end up changing his mind completely?',
          answer: 'No — he kept a narrower, more careful version of his old view',
          distractors: [
            'Yes, he switched sides entirely',
            'Yes, he gave up on the question',
            'No, nothing about his view changed',
          ],
          explanation: 'He did not switch sides, but his position became shorter and more careful.',
          skill: 'inference',
        },
      ],
    },
    {
      title: 'Cave Painting',
      icon: '🖼️',
      text: `In 1940, four teenagers following a dog down a hole near Montignac in France found themselves in a chamber whose walls carried hundreds of animals: horses, stags and aurochs, painted in ochre and charcoal roughly 17,000 years earlier. Lascaux opened to visitors after the war, and by the 1950s more than a thousand people a day were walking through it. The breath and body heat of those crowds raised the humidity, and green algae and white crystals began to spread across the paintings. France closed the cave in 1963. Today the original is monitored by a handful of scientists a few days each month, while visitors tour Lascaux IV, a replica built to the millimeter from laser scans. It is an odd solution, and an honest one: the copy exists so that the original can be left alone.`,
      questions: [
        {
          id: 'q1',
          prompt: 'Who found the cave, and how?',
          answer: 'Four teenagers following a dog down a hole',
          distractors: [
            'Archaeologists on a planned dig',
            'A farmer plowing his field',
            'Soldiers sheltering during the war',
          ],
          explanation: 'The passage opens with four teenagers following a dog near Montignac.',
          skill: 'detail',
        },
        {
          id: 'q2',
          prompt: 'About how old are the paintings?',
          answer: 'Roughly 17,000 years',
          distractors: ['Roughly 170 years', 'Roughly 1,700 years', 'Roughly 170,000 years'],
          explanation: 'They were painted in ochre and charcoal roughly 17,000 years earlier.',
          skill: 'detail',
        },
        {
          id: 'q3',
          prompt: 'What damaged the paintings?',
          answer: 'Humidity from crowds, which let algae and crystals spread',
          distractors: [
            'Visitors touching the walls',
            'Rainwater leaking through the rock',
            'Lamps scorching the pigment',
          ],
          explanation: 'Breath and body heat raised the humidity, and growths spread on the walls.',
          skill: 'detail',
        },
        {
          id: 'q4',
          prompt: 'What did France do in 1963?',
          answer: 'Closed the cave to visitors',
          distractors: [
            'Opened Lascaux IV',
            'Discovered a second chamber',
            'Cleaned the painted walls',
          ],
          explanation: 'France closed the cave in 1963, and the replica came much later.',
          skill: 'sequence',
        },
        {
          id: 'q5',
          prompt: 'Why is the replica called "an honest solution"?',
          answer: 'It openly admits to being a copy so the real cave can be protected',
          distractors: [
            'It was cheap to build',
            'It is more beautiful than the cave',
            'It fools visitors completely',
          ],
          explanation: 'The copy exists so that the original can be left alone.',
          skill: 'inference',
        },
      ],
    },
  ],
};

const LIBRARY: Record<Grade, StorySpec[]> = {
  1: [...OPENING[1], ...GRADE_1],
  2: [...OPENING[2], ...GRADE_2],
  3: [...OPENING[3], ...GRADE_3],
  4: [...OPENING[4], ...GRADE_4],
  5: [...OPENING[5], ...GRADE_5],
};

/** Each grade's map is split into three difficulty bands of equal length. */
const tierForIndex = (i: number, count: number): 1 | 2 | 3 =>
  i < Math.ceil(count / 3) ? 1 : i < Math.ceil((count * 2) / 3) ? 2 : 3;

function build(grade: Grade, spec: StorySpec, i: number, count: number): Story {
  return {
    id: `g${grade}-r${i + 1}`,
    grade,
    index: i + 1,
    title: spec.title,
    icon: spec.icon,
    tier: tierForIndex(i, count),
    text: spec.text,
    questions: spec.questions,
  };
}

const shelve = (grade: Grade): Story[] =>
  LIBRARY[grade].map((s, i) => build(grade, s, i, LIBRARY[grade].length));

export const STORIES: Record<Grade, Story[]> = {
  1: shelve(1),
  2: shelve(2),
  3: shelve(3),
  4: shelve(4),
  5: shelve(5),
};

export const STORIES_PER_GRADE = STORIES[1].length;

export const wordCount = (text: string): number => text.trim().split(/\s+/).length;

/**
 * The story's questions as ordinary quiz questions, so the reading half of
 * the app reuses the quiz, correction and results screens unchanged. The
 * order is kept — comprehension questions usually walk the paragraph — but
 * the four choices are shuffled on every play.
 */
export function storyQuestions(story: Story): Question[] {
  return story.questions.map((q) => ({
    id: `${story.id}-${q.id}`,
    prompt: q.prompt,
    correctAnswer: q.answer,
    choices: shuffle([q.answer, ...q.distractors]),
    explanation: q.explanation,
    // Comprehension answers are phrases, so they can only ever be tapped.
    answerFormat: null,
    mode: 'choice',
  }));
}

export const passageOf = (story: Story): Passage => ({
  title: story.title,
  icon: story.icon,
  text: story.text,
});

/** A story is open once the one before it has been passed. */
export const isStoryUnlocked = (story: Story, progress: ProgressMap): boolean =>
  isStopUnlocked(STORIES[story.grade], story, progress);

export const currentStory = (grade: Grade, progress: ProgressMap): Story =>
  currentStop(STORIES[grade], progress) as Story;

export const storyStarsEarned = (grade: Grade, progress: ProgressMap): number =>
  starsOnMap(STORIES[grade], progress);
