import { StorySpec } from './storySpec';

/**
 * Two more levels for grade 1, taking the map to eight.
 *
 * The first sixty sit at about forty-three words and three questions. These
 * twenty climb, but gently — a six-year-old who has just stopped sounding out
 * every word is spending most of their effort on the reading itself, so the
 * step up is in what the question asks, not in how much there is to get
 * through.
 *
 *   length      54-65 words in level 7, 59-77 in level 8, against the flat
 *               forty-three of the first sixty
 *   questions   three for the first ten, four for the last ten
 *   mix         detail 50% / 50% / 32%, inference 36% / 43% / 48% — level 7
 *               moves the thinking without moving the reading load, and only
 *               level 8 adds a fourth question
 *   thinking    from "what happened" to "why did that happen", where the why
 *               is always two plain sentences that have to be put together:
 *               the coat is wet, it was raining, so — nothing hidden, nothing
 *               guessed
 *
 * Sentences stay short and the words stay common. A harder question inside an
 * easy sentence is the whole design; a harder sentence would just make it a
 * decoding test, which is a different skill and already being practised.
 */
export const GRADE_1B: StorySpec[] = [
  /* ---------------------------------------------------- level 7 (61-70) -- */
  {
    title: 'The Odd Sock',
    icon: '🧦',
    text: `Mum tipped the washing out on the bed. There were nine socks. Eight of them made four pairs. One was red with white spots and had no partner at all. Mum said the other one was probably behind the machine. Ben looked. It was not there. He found it three days later, inside his wellington boot.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many socks were there?',
        answer: 'Nine',
        distractors: ['Eight', 'Four', 'Ten'],
        explanation: 'The story says there were nine socks.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why was the red sock called odd?',
        answer: 'It had no matching sock',
        distractors: ['It was dirty', 'It had a hole', 'It was too big'],
        explanation: 'Eight socks made four pairs, and the red one had no partner at all.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Where was the sock in the end?',
        answer: 'In his wellington boot',
        distractors: ['Behind the machine', 'Under the bed', 'In the garden'],
        explanation: 'He found it three days later, inside his wellington boot.',
        skill: 'detail',
      },
    ],
  },
  {
    title: 'Ice on the Step',
    icon: '🧊',
    text: `Dad put salt on the front step every night in January. Ada thought it was silly. The step was dry when he did it. Then one morning she went out before he had been up. She slid all the way down and landed on the path. After that she did not think the salt was silly.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did Dad put on the step?',
        answer: 'Salt',
        distractors: ['Sand', 'Water', 'Paint'],
        explanation: 'Dad put salt on the front step every night in January.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did Ada slip that morning?',
        answer: 'There was no salt down yet',
        distractors: ['She was running', 'Her shoes were new', 'The step was wet with rain'],
        explanation: 'She went out before Dad had been up, so he had not put the salt down.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why did Ada change her mind?',
        answer: 'She found out what the salt was for',
        distractors: ['Dad told her off', 'She hurt her arm', 'It stopped being cold'],
        explanation: 'She slid over on the morning there was no salt, and then stopped thinking it was silly.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Bird Bath',
    icon: '🐦',
    text: `Nan filled the bird bath every morning. In summer the birds came all day. In winter she came out twice, because the water froze by lunchtime. Sam asked why she did not just leave it. Nan said the birds could find seeds under the snow, but they could not find water anywhere at all.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How often did Nan fill it in winter?',
        answer: 'Twice a day',
        distractors: ['Once a day', 'Once a week', 'Never'],
        explanation: 'In winter she came out twice, because the water froze by lunchtime.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did she have to fill it twice?',
        answer: 'The water froze',
        distractors: ['The birds drank it all', 'It spilled', 'It rained'],
        explanation: 'She came out twice because the water froze by lunchtime.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why is water more of a problem than food?',
        answer: 'Birds can find seeds but not water',
        distractors: [
          'Water is heavier to carry',
          'Birds do not like snow',
          'Seeds cost less',
        ],
        explanation: 'Nan said the birds could find seeds under the snow but could not find water anywhere.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Too Many Apples',
    icon: '🍏',
    text: `The tree at the end of the garden gave more apples than anyone could eat. Some fell and went brown in the grass. Mum put a box at the gate with a sign that said HELP YOURSELF. By Sunday the box was empty. A woman left a jar of jam on the step with a note. The note said it was made from the apples.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the sign say?',
        answer: 'HELP YOURSELF',
        distractors: ['FOR SALE', 'KEEP OUT', 'FREE JAM'],
        explanation: 'Mum put a box at the gate with a sign that said HELP YOURSELF.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did Mum put the box out?',
        answer: 'There were more apples than they could eat',
        distractors: ['She wanted money', 'The tree was dying', 'To keep birds away'],
        explanation: 'The tree gave more apples than anyone could eat, and some were going brown in the grass.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Where did the jam come from?',
        answer: 'The apples from the box',
        distractors: ['A shop', 'Nan', 'The woman’s own tree'],
        explanation: 'The note said the jam was made from the apples.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Missing Spoon',
    icon: '🥄',
    text: `There were six spoons in the drawer on Monday. By Friday there were two. Nobody had thrown any away. Then Dad looked in Rosie's bedroom. Under the bed was a row of little holes in the soil of a plant pot, and four spoons standing up in them like flags. Rosie said she was growing more spoons.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many spoons were left by Friday?',
        answer: 'Two',
        distractors: ['Six', 'Four', 'None'],
        explanation: 'There were six on Monday and by Friday there were two.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Where were the missing spoons?',
        answer: 'Standing in a plant pot',
        distractors: ['In the bin', 'In the garden', 'In the dishwasher'],
        explanation: 'Four spoons were standing up in the soil of a plant pot under Rosie’s bed.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did Rosie put them in the soil?',
        answer: 'She thought spoons would grow like plants',
        distractors: [
          'She was hiding them',
          'She was washing them',
          'She wanted to keep them safe',
        ],
        explanation: 'She planted them in a row like seeds and said she was growing more spoons.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Slide Was Wet',
    icon: '🛝',
    text: `It had rained all night. In the morning the sun came out and the park looked dry. Kai ran to the slide and went straight down. He got up with a wet stripe all the way up his back. The slide had a curve at the bottom, and the water had run down and sat there where the sun could not reach.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was the weather like in the morning?',
        answer: 'Sunny',
        distractors: ['Raining', 'Snowing', 'Foggy'],
        explanation: 'In the morning the sun came out and the park looked dry.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why was Kai surprised?',
        answer: 'The park looked dry but the slide was not',
        distractors: ['The slide was broken', 'It started raining again', 'The park was closed'],
        explanation: 'He ran down a slide that looked dry and got up with a wet stripe up his back.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why was there still water at the bottom?',
        answer: 'The sun could not reach the curve',
        distractors: [
          'Someone poured water on it',
          'It was still raining there',
          'The slide had a hole',
        ],
        explanation: 'Water ran down to the curve at the bottom and sat where the sun could not reach.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'A Present for Nan',
    icon: '🎁',
    text: `Amir had two pounds. The scarf in the shop cost eight. He counted his money three times and it was still two pounds. So he went home and drew Nan a picture of her cat instead, and it took him all afternoon. Nan put the picture on the fridge. The scarf would have gone in a drawer, she said.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How much did the scarf cost?',
        answer: 'Eight pounds',
        distractors: ['Two pounds', 'Three pounds', 'Ten pounds'],
        explanation: 'The scarf in the shop cost eight pounds.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did Amir count his money three times?',
        answer: 'He hoped he had more than he did',
        distractors: [
          'He kept losing count',
          'He was practising counting',
          'Someone told him to',
        ],
        explanation: 'He wanted the scarf, counted again and again, and it was still only two pounds.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'What did Nan mean about the drawer?',
        answer: 'She liked the picture more than a scarf',
        distractors: [
          'She had no room for a scarf',
          'She wanted the scarf instead',
          'Drawers are for pictures',
        ],
        explanation:
          'She put the picture where she could see it, and said the scarf would have been shut away.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'Next Door’s Drum',
    icon: '🥁',
    text: `A boy moved in next door and got a drum kit. Every day at five he played it, and the wall shook. Dad was cross. Then Dad found out the boy was practising for a school show. On the night of the show Dad went. The boy was very good. After that the noise at five did not seem to bother Dad so much.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What time did the boy play?',
        answer: 'Five o’clock',
        distractors: ['Nine o’clock', 'Lunchtime', 'Midnight'],
        explanation: 'Every day at five he played it, and the wall shook.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why was the boy practising?',
        answer: 'For a school show',
        distractors: ['To annoy the neighbours', 'For a competition', 'He had just got the drums'],
        explanation: 'Dad found out the boy was practising for a school show.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did the noise stop bothering Dad?',
        answer: 'He knew what it was for',
        distractors: [
          'It got quieter',
          'The boy moved away',
          'Dad bought earplugs',
        ],
        explanation: 'He went to the show, saw the boy was good, and the same noise stopped bothering him.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Seed in the Cup',
    icon: '🌱',
    text: `Every child in the class planted a bean in a paper cup. They put them on the windowsill. Most of them grew straight up. Tessa's cup was at the end of the row, near the corner, and hers leaned right over towards the glass. Her teacher said it was not a poorly bean. It was a bean looking for the light.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did the children plant?',
        answer: 'A bean',
        distractors: ['A sunflower', 'Grass', 'An acorn'],
        explanation: 'Every child in the class planted a bean in a paper cup.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What was different about Tessa’s bean?',
        answer: 'It leaned towards the glass',
        distractors: ['It did not grow', 'It grew tallest', 'It had no leaves'],
        explanation: 'Hers leaned right over towards the glass while most grew straight up.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did it lean?',
        answer: 'It was growing towards the light',
        distractors: [
          'The cup was tipped over',
          'Someone knocked it',
          'It was too heavy',
        ],
        explanation: 'The teacher said it was a bean looking for the light, not a poorly one.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Dog Who Waited',
    icon: '🐕',
    text: `The old dog outside the shop sat in the same spot every day. He did not beg and he did not bark. At half past three he would stand up and look down the road, and a minute later a woman in a green coat would come round the corner. Nobody could work out how he knew. He was never wrong.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where did the dog sit?',
        answer: 'Outside the shop',
        distractors: ['In the park', 'By the school gate', 'On a doorstep at home'],
        explanation: 'The old dog outside the shop sat in the same spot every day.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the dog do at half past three?',
        answer: 'Stood up and looked down the road',
        distractors: ['Barked loudly', 'Went to sleep', 'Ran away'],
        explanation: 'At half past three he would stand up and look down the road.',
        skill: 'sequence',
      },
      {
        id: 'q3',
        prompt: 'Who was the dog waiting for?',
        answer: 'The woman in the green coat',
        distractors: ['The shopkeeper', 'Another dog', 'Nobody'],
        explanation: 'A minute after he stood up, a woman in a green coat came round the corner, every time.',
        skill: 'inference',
      },
    ],
  },

  /* ---------------------------------------------------- level 8 (71-80) -- */
  {
    title: 'The Tent in the Room',
    icon: '⛺',
    text: `It rained on the day of the camping trip, so Dad said no. Instead he put the tent up in the front room. It only just fitted. They ate their sandwiches inside it and shone a torch on the roof and listened to the rain on the window. Ellie said afterwards it was better than real camping, because you could go to the toilet without putting your boots on.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Why was the trip called off?',
        answer: 'It rained',
        distractors: ['The car broke', 'Dad was busy', 'The tent was broken'],
        explanation: 'It rained on the day of the camping trip, so Dad said no.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Where did they put the tent?',
        answer: 'In the front room',
        distractors: ['In the garden', 'In the garage', 'On the landing'],
        explanation: 'Dad put the tent up in the front room, and it only just fitted.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did Ellie like it better?',
        answer: 'She could stay warm and dry',
        distractors: [
          'The tent was bigger inside',
          'There were no insects',
          'She had more sandwiches',
        ],
        explanation: 'She said the good part was not needing boots — she was indoors, out of the rain.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What is this story really about?',
        answer: 'Making the best of a spoiled plan',
        distractors: [
          'How to put up a tent',
          'Why camping is bad',
          'A rainy day at school',
        ],
        explanation: 'The trip was cancelled and they had a good day anyway, indoors.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Jam Jar Lid',
    icon: '🫙',
    text: `Nobody could open the jam. Dad tried. Mum tried. Grandad tried and went red. Then Mum ran the lid under the hot tap for a minute and gave it to Grandad again, and it came off first go. Grandad said he must have loosened it for her. Mum said nothing at all, but she was smiling at the tap.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Who tried to open the jar first?',
        answer: 'Dad',
        distractors: ['Mum', 'Grandad', 'Nobody'],
        explanation: 'Dad tried, then Mum, then Grandad.',
        skill: 'sequence',
      },
      {
        id: 'q2',
        prompt: 'What did Mum do to the lid?',
        answer: 'Ran it under the hot tap',
        distractors: ['Hit it with a spoon', 'Put it in the fridge', 'Wrapped it in a cloth'],
        explanation: 'Mum ran the lid under the hot tap for a minute.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did the lid come off after that?',
        answer: 'The hot water had loosened it',
        distractors: [
          'Grandad tried harder',
          'The jar was a different one',
          'It was wet and slippery',
        ],
        explanation: 'Nothing else changed except the hot tap, and then it came off first go.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why was Mum smiling at the tap?',
        answer: 'She knew what had really opened it',
        distractors: [
          'The tap was dripping',
          'She was pleased with Grandad',
          'She had burnt her hand',
        ],
        explanation:
          'Grandad took the credit, and Mum smiled at the thing that had actually done the work.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'Blue Paint',
    icon: '🎨',
    text: `The class painted the sea. There was only one pot of blue and twenty-eight children. Miss Hall said they would have to share, and then she showed them how to make more: white and blue for the shallow bit, blue and a spot of black for the deep bit. By the end no two seas on the wall were the same colour, and the pot of blue was still half full.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many children were there?',
        answer: 'Twenty-eight',
        distractors: ['Eight', 'Twenty', 'Two'],
        explanation: 'There was one pot of blue and twenty-eight children.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'How do you make the deep sea colour?',
        answer: 'Blue with a spot of black',
        distractors: ['Blue and white', 'Blue and red', 'Black on its own'],
        explanation: 'Miss Hall showed them blue and a spot of black for the deep bit.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why was the pot still half full?',
        answer: 'Mixing meant they each used less blue',
        distractors: [
          'Most children did not paint',
          'She opened a second pot',
          'They painted very small pictures',
        ],
        explanation: 'They stretched the blue by mixing it with white and black instead of using it neat.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What did the class find out?',
        answer: 'Not having enough can lead to something better',
        distractors: [
          'Blue is the best colour',
          'Sharing is difficult',
          'Painting takes a long time',
        ],
        explanation:
          'One pot forced them to mix, and the wall ended up with twenty-eight different seas on it.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Last Biscuit',
    icon: '🍪',
    text: `There was one biscuit left and two of them. Tom said he should have it because he was older. Ivy said she should have it because she had not had one yet. They argued until Mum came in. Mum did not say who was right. She gave Ivy the knife and told Tom he could pick which half he wanted. They both went quiet, and Ivy cut very carefully indeed.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was Tom’s reason?',
        answer: 'He was older',
        distractors: ['He was hungrier', 'He had not had one', 'He found it'],
        explanation: 'Tom said he should have it because he was older.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did Mum tell them to do?',
        answer: 'Ivy cuts, Tom picks his half',
        distractors: [
          'Share it equally',
          'Nobody gets it',
          'Toss a coin for it',
        ],
        explanation: 'She gave Ivy the knife and told Tom he could pick which half he wanted.',
        skill: 'detail',
      },
      {
        id: 'q3',
        prompt: 'Why did Ivy cut so carefully?',
        answer: 'She would be left with the half Tom did not pick',
        distractors: [
          'The knife was sharp',
          'Mum was watching',
          'She wanted to be kind',
        ],
        explanation:
          'Tom chose first, so a big half and a small half would leave Ivy with the small one.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did they both go quiet?',
        answer: 'There was nothing left to argue about',
        distractors: [
          'They were told off',
          'They stopped wanting the biscuit',
          'Mum had taken it away',
        ],
        explanation:
          'The rule made it fair on its own, so neither of them had any reason left to complain.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Cat on the Post',
    icon: '🐈',
    text: `A ginger cat sat on the gatepost every morning and would not move for anybody. People walked round it. One day the post was empty. It was empty the next day too, and the next. Then a note went up in the shop window with a photo of the cat on it. By the weekend the cat was back on the post, and somebody had put a cushion there.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where did the cat sit?',
        answer: 'On the gatepost',
        distractors: ['On a wall', 'On a car', 'In a window'],
        explanation: 'A ginger cat sat on the gatepost every morning.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did the empty post tell people?',
        answer: 'The cat had gone',
        distractors: ['The shop had closed', 'It was going to rain', 'The cat was asleep'],
        explanation: 'The post was empty three days running, and then a note about the cat went up.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why was the note put up?',
        answer: 'The cat had gone missing',
        distractors: [
          'The cat was for sale',
          'To ask people to feed it',
          'To complain about the cat',
        ],
        explanation: 'The post had been empty for days, and after the note the cat came back.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did somebody put a cushion there?',
        answer: 'They were glad the cat had come back',
        distractors: [
          'To stop the cat sitting there',
          'To keep the post dry',
          'To sit on themselves',
        ],
        explanation:
          'People had walked round the cat for years, and once it was missing and found they made its spot comfortable.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Puddle Path',
    icon: '👟',
    text: `The path to the shed floods every time it rains. Grandad laid three flat stones across the worst part. Then he watched from the window for a week and moved two of them, because everyone was stepping short of the first one and long over the last. After that nobody's feet got wet, and nobody noticed he had done anything at all.`,
    questions: [
      {
        id: 'q1',
        prompt: 'How many stones did Grandad lay?',
        answer: 'Three',
        distractors: ['Two', 'Five', 'One'],
        explanation: 'Grandad laid three flat stones across the worst part.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What did he do for a week?',
        answer: 'Watched people use the path',
        distractors: [
          'Laid more stones',
          'Waited for the rain to stop',
          'Dug a drain',
        ],
        explanation: 'He watched from the window for a week, then moved two of the stones.',
        skill: 'sequence',
      },
      {
        id: 'q3',
        prompt: 'Why did he move two stones?',
        answer: 'They were not where people stepped',
        distractors: [
          'They were too small',
          'They had sunk',
          'They were the wrong colour',
        ],
        explanation: 'Everyone was stepping short of the first and long over the last, so he moved them to fit.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did nobody notice?',
        answer: 'It just worked, so there was nothing to notice',
        distractors: [
          'He did it at night',
          'The stones were hidden',
          'Nobody used the path',
        ],
        explanation:
          'Once the stones were in the right places, feet stayed dry and there was no problem left to think about.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'Grandad’s Hat',
    icon: '🎩',
    text: `Grandad wore the same flat cap for years. It went grey and the edge went soft. For his birthday everyone put in for a new one, exactly the same but clean and stiff. He said thank you very much and put it on the shelf. He is still wearing the old one. Mum says the new one will be perfect in about ten years.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What did everyone buy him?',
        answer: 'A new flat cap',
        distractors: ['A scarf', 'A coat', 'A shelf'],
        explanation: 'Everyone put in for a new cap, exactly the same but clean and stiff.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did he say thank you but not wear it?',
        answer: 'He did not want to seem ungrateful',
        distractors: ['He had not noticed it', 'It was too small', 'He was saving it for a party'],
        explanation: 'He thanked everyone warmly and then put it straight on the shelf and kept his old one.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why does he keep wearing the old one?',
        answer: 'Years of wearing made it comfortable',
        distractors: [
          'He did not like the present',
          'The new one is the wrong size',
          'He forgot about the new one',
        ],
        explanation:
          'The old cap has gone soft with wear; the new one is stiff, and Mum says it will take ten years to be right.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What does Mum mean about ten years?',
        answer: 'The new hat needs wearing in',
        distractors: [
          'Grandad will be older then',
          'Hats last ten years',
          'She will buy another one',
        ],
        explanation: 'The old one took years to become comfortable, and the new one will too.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Tooth in the Envelope',
    icon: '🦷',
    text: `Lena's tooth came out at school, in the middle of the afternoon. The office gave her a tiny envelope to keep it in, with her name on the front. She held it all the way home in her fist. That night she put the envelope under her pillow. In the morning there was a coin, and the envelope had gone — but her name was still on the fridge, cut out and stuck on with a magnet.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where did the tooth come out?',
        answer: 'At school',
        distractors: ['At home', 'On the bus', 'At the dentist'],
        explanation: 'Lena’s tooth came out at school, in the middle of the afternoon.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why did the office write her name on the envelope?',
        answer: 'So it could be told apart from anyone else’s',
        distractors: ['So she could practise reading', 'To send it home in the post', 'Because it was a present'],
        explanation: 'A tiny envelope with a tooth in it needs a name on it, or nobody knows whose it is.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Who most likely put her name on the fridge?',
        answer: 'Someone at home who kept it',
        distractors: [
          'The school office',
          'Lena herself',
          'Nobody, it blew there',
        ],
        explanation:
          'The envelope went in the night and the coin came, and her name was cut out and saved.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why keep the piece with her name?',
        answer: 'It was a memory worth keeping',
        distractors: [
          'To use the envelope again',
          'To prove she went to school',
          'To stick things to the fridge',
        ],
        explanation:
          'The tooth went but the name was cut out and put where everyone would see it every day.',
        skill: 'mainIdea',
      },
    ],
  },
  {
    title: 'The Snail Trail',
    icon: '🐌',
    text: `In the morning there was a silver line across the back step. It went up the wall, along the ledge, round the flowerpot twice and stopped. There was no snail at the end of it. Jonah followed the line backwards instead, and found the snail asleep under the leaf where it had started, having gone all the way round and come home.`,
    questions: [
      {
        id: 'q1',
        prompt: 'Where did the silver line start?',
        answer: 'Across the back step',
        distractors: ['On the flowerpot', 'Under a leaf', 'On the window'],
        explanation: 'In the morning there was a silver line across the back step.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'What does the winding line tell you about the snail?',
        answer: 'It wandered instead of going straight',
        distractors: ['It was in a hurry', 'It was being chased', 'It could not see'],
        explanation: 'The trail went up the wall, along the ledge and twice round the pot before coming back.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why was there no snail at the end?',
        answer: 'It had gone in a circle back to the start',
        distractors: [
          'A bird had eaten it',
          'It had fallen off',
          'The trail was not a snail’s',
        ],
        explanation:
          'Jonah followed the line backwards and found the snail under the leaf where it began.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'Why did following it backwards work?',
        answer: 'The start and the end were the same place',
        distractors: [
          'Snails always go backwards',
          'The line was clearer that way',
          'He was going downhill',
        ],
        explanation: 'The snail had gone all the way round and come home, so the trail led back to it.',
        skill: 'inference',
      },
    ],
  },
  {
    title: 'The Box That Sang',
    icon: '📻',
    text: `In the loft there was a wooden box with a handle on the side. Dad turned the handle and it played eight notes, slowly, and then stopped. He said it had belonged to his grandmother and had not been wound for forty years. Every one of the eight notes was right. Nobody had oiled it, nobody had mended it, and nobody had even known it was up there.`,
    questions: [
      {
        id: 'q1',
        prompt: 'What was on the side of the box?',
        answer: 'A handle',
        distractors: ['A key', 'A button', 'A picture'],
        explanation: 'There was a wooden box with a handle on the side.',
        skill: 'detail',
      },
      {
        id: 'q2',
        prompt: 'Why had nobody wound it for forty years?',
        answer: 'Nobody knew it was in the loft',
        distractors: ['It was broken', 'It was too high to reach', 'They had lost the handle'],
        explanation: 'Nobody had even known it was up there until Dad found it.',
        skill: 'inference',
      },
      {
        id: 'q3',
        prompt: 'Why was it surprising that it worked?',
        answer: 'It had sat unused for forty years',
        distractors: [
          'It was broken in half',
          'It had no handle',
          'It was very small',
        ],
        explanation:
          'It had not been wound for forty years and nobody had oiled or mended it, yet every note was right.',
        skill: 'inference',
      },
      {
        id: 'q4',
        prompt: 'What is the story really about?',
        answer: 'Something carefully made lasting a long time',
        distractors: [
          'How to tidy a loft',
          'Why boxes are useful',
          'A grandmother who liked music',
        ],
        explanation:
          'With no care at all for forty years it still played all eight notes correctly.',
        skill: 'mainIdea',
      },
    ],
  },
];
