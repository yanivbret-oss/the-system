// Program content. rx: one string, or [week1, week2, week3, week4] of the 4-week cycle.

export type Item = {
  id: string;
  name: string;
  tag?: string;
  rx: string[];
  steps?: string[];
  note?: string;
  countdown?: number[];
  emom?: boolean;
  finisher?: boolean;
};
export type Workout = { name: string; short: string; day: number; items: Item[] };
export type WorkoutKey = 'A' | 'B' | 'C' | 'D';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const WARMUP: Item = {
  id: 'warm', name: 'Warm-up', tag: '8 min', rx: ['5 min incline walk + 2 rounds'],
  steps: ['10 light goblet squats', '10 band pull-aparts', '5 inchworms'],
};

export const WORKOUTS: Record<WorkoutKey, Workout> = {
  A: { name: 'Legs + Kettlebell', short: 'Legs', day: 1, items: [
    WARMUP,
    { id: 'a1', name: 'Goblet squat, 3s lowering', rx: ['4 × 12', '5 × 12', '5 × 12, 45s rest', '3 × 10'], note: 'Rest 60s. Swap: squat holding 2 dumbbells' },
    { id: 'a2', name: 'Bulgarian split squat', rx: ['3 × 10 each leg', '4 × 10 each leg', '4 × 12 each leg', '2 × 10 each leg'], note: 'Rest 60s. Swap: reverse lunges' },
    { id: 'a3', name: 'Single-leg Romanian deadlift', rx: ['3 × 10 each leg', '3 × 12 each leg', '4 × 12 each leg', '2 × 10 each leg'], note: 'Swap: single-leg glute bridge' },
    { id: 'a4', name: 'Kettlebell swing EMOM', rx: ['10 min, 15 every minute', '10 min, 17 every minute', '10 min, 20 every minute', '6 min, 15 every minute'], countdown: [600, 600, 600, 360], emom: true },
    { id: 'a5', name: 'Finisher: 3 rounds for time', rx: ['200 m run, 15 goblet squats, 10 burpees'], note: 'Timed automatically', finisher: true },
  ]},
  B: { name: 'Upper Body + Pull-ups', short: 'Upper', day: 3, items: [
    WARMUP,
    { id: 'b1', name: 'Pull-up EMOM', rx: ['8 min, 2 every minute', '8 min, alternate 2 and 3', '8 min, 3 every minute', '6 min, 2 every minute'], countdown: [480, 480, 480, 360], emom: true, note: 'Swap: band-assisted pull-ups' },
    { id: 'b2', name: 'Negative pull-ups (5s down)', rx: ['3 × 3', '3 × 4', '4 × 4', '2 × 3'], note: 'Rest 90s' },
    { id: 'b3', name: 'TRX row', rx: ['4 × 12', '4 × 14', '5 × 12, feet forward', '3 × 10'], note: 'Rest 60s' },
    { id: 'b4', name: 'Push-ups', rx: ['4 × max minus 2', '4 × max minus 2', '5 × max minus 2', '3 × 10'], note: 'Swap: TRX push-ups' },
    { id: 'b5', name: 'Half-kneeling single-arm press', rx: ['3 × 10 each arm', '3 × 12 each arm', '4 × 12 each arm', '2 × 10 each arm'], note: 'Swap: band press' },
    { id: 'b6', name: 'Finisher: 8 min AMRAP', rx: ['5 pull-ups (band ok), 10 push-ups, 15 swings'], countdown: [480, 480, 480, 360], note: 'Tap "Round done" after each round', finisher: true },
  ]},
  C: { name: 'Run + Rounds', short: 'Run', day: 5, items: [
    WARMUP,
    { id: 'c1', name: 'Treadmill intervals', rx: ['6 × (1 min fast / 1 min walk)', '8 × (1 min fast / 1 min walk)', '10 × (1 min fast / 1 min walk)', '5 × (1 min fast / 1 min walk)'], countdown: [720, 960, 1200, 600], emom: true, note: 'Fast = RPE 8. Note your speed and add 0.5 next time' },
    { id: 'c2', name: 'Finisher: 12 min AMRAP', rx: ['10 swings, 10 TRX rows, 10 thrusters, 200 m run'], countdown: [720, 720, 720, 480], note: 'Tap "Round done" after each round', finisher: true },
  ]},
  D: { name: 'Red Gate', short: 'Red Gate', day: 6, items: [
    WARMUP,
    { id: 'd1', name: 'Chipper for time, 30 min cap', rx: ['50 swings, 40 goblet squats, 30 push-ups, 20 TRX rows, 10 burpees, 800 m run'], note: 'Timed automatically', finisher: true },
  ]},
};
export const ORDER: WorkoutKey[] = ['A', 'B', 'C', 'D'];
export const KEY_NAMES: Record<string, string> = { Q: 'Daily Quest', P: 'Penalty Quest', W: 'Weigh-in', S: 'Secret Quest' };

// Counter-style quests: the daily quest on rest days, and the penalty quest
export type Goal = { id: string; label: string; target: number; unit?: string; steps?: number[]; timer?: boolean; how: string };
export const QUESTS = {
  Q: {
    title: 'Preparation to Become Strong',
    lead: 'A rest day, so the full quest. Split it up across the day if you like.',
    warn: 'Failing to complete the daily quest by midnight will result in a penalty.',
    goals: (w: number): Goal[] => [
      { id: 'push', label: 'Push-ups', target: [20, 25, 30, 20][w - 1], steps: [1, 5, 10], how: 'q2' },
      { id: 'squat', label: 'Squats', target: [30, 40, 50, 30][w - 1], steps: [1, 5, 10], how: 'q3' },
      { id: 'plank', label: 'Plank', unit: 's', target: [45, 60, 75, 45][w - 1], timer: true, how: 'q4' },
    ],
  },
  P: {
    title: 'Penalty Quest',
    lead: "Yesterday's daily quest was not completed. The System does not forgive.",
    warn: 'No XP is awarded for a penalty quest.',
    goals: (): Goal[] => [
      { id: 'swing', label: 'Kettlebell swings', target: 100, steps: [5, 10], how: 'p1' },
      { id: 'burpee', label: 'Burpees', target: 30, steps: [1, 5], how: 'p2' },
    ],
  },
};

export const XP: Record<string, number> = { Q: 30, A: 100, B: 100, C: 100, D: 200, P: 0, W: 20, S: 50 };
export const XP_PER_LEVEL = 300;

// How-to cues + a YouTube search for a demo video
export const MOVES: Record<string, [string, string, string]> = {
  goblet: ['Goblet squat', 'Hold the kettlebell close to your chest with both hands. Feet shoulder-width apart. Sit back and down until your elbows touch your knees, chest up, heels down.', 'goblet squat kettlebell form'],
  bandpull: ['Band pull-apart', 'Hold a band in front of your chest with straight arms. Pull it apart until it touches your chest, squeeze your shoulder blades, return slowly.', 'band pull apart'],
  inchworm: ['Inchworm', 'From standing, fold forward and put your hands on the floor. Walk your hands out to a push-up position, then walk your feet back to your hands and stand up.', 'inchworm exercise'],
  bulgarian: ['Bulgarian split squat', 'Rear foot on a chair or couch behind you. Drop straight down until the back knee nearly touches the floor, then drive up through the front heel.', 'bulgarian split squat dumbbell'],
  revlunge: ['Reverse lunge', 'Take a big step back, lower until the back knee nearly touches the floor, return to standing. Easier on the knees than the Bulgarian.', 'reverse lunge'],
  slrdl: ['Single-leg Romanian deadlift', 'Stand on one leg, kettlebell in the opposite hand. Hinge at the hips with a flat back as the free leg rises behind you, until you feel a hamstring stretch. Squeeze your glute to stand.', 'single leg romanian deadlift kettlebell'],
  swing: ['Kettlebell swing', 'A hip hinge, not a squat. Push your hips back, let the bell pass between your legs, then snap your hips forward to float it to chest height. Arms just hold on.', 'russian kettlebell swing form'],
  burpee: ['Burpee', 'Hands to the floor, jump back to a push-up, chest to the floor, jump your feet back to your hands, and jump up with a clap overhead.', 'burpee proper form'],
  pullup: ['Pull-up', 'Grip slightly wider than shoulders, palms forward. Start from a full hang, pull until your chin clears the bar, lower under control all the way.', 'strict pull up form'],
  negative: ['Negative pull-up', 'Jump or step up so your chin is over the bar. Lower as slowly as you can, 5 seconds, to straight arms. Builds strength for full pull-ups.', 'negative pull ups'],
  trxrow: ['TRX row', 'Hold the handles and lean back with your body straight as a plank. Pull your chest to your hands and squeeze your shoulder blades. Feet further forward makes it harder.', 'TRX row'],
  pushup: ['Push-up', 'Hands slightly wider than shoulders, body straight from head to heels. Chest nearly to the floor, elbows about 45° from your body, push back up.', 'push up proper form'],
  press: ['Half-kneeling single-arm press', 'Kneel on one knee with the dumbbell on the same side as the down knee. Press straight up to a straight arm without arching your back. Brace your core.', 'half kneeling single arm dumbbell press'],
  thruster: ['Dumbbell thruster', 'Dumbbells on your shoulders, full squat, and as you stand press them overhead in one motion.', 'dumbbell thruster'],
  intervals: ['Treadmill intervals', 'One minute fast (hard to talk, RPE 8), one minute walking. Note your fast speed and try to add 0.5 every week.', 'treadmill interval running beginner'],
  deepsquat: ['Squat', 'Feet shoulder-width, sit as deep as is comfortable with heels down, chest up, and stand back up. Hold a door frame for balance if needed.', 'bodyweight squat form'],
  plank: ['Plank', 'On forearms and toes, body straight from head to heels. Brace your abs and glutes; do not let your hips sag or pike up.', 'plank proper form'],
};
export const HOW: Record<string, string[]> = {
  warm: ['goblet', 'bandpull', 'inchworm'], a1: ['goblet'], a2: ['bulgarian', 'revlunge'], a3: ['slrdl'], a4: ['swing'], a5: ['goblet', 'burpee'],
  b1: ['pullup'], b2: ['negative'], b3: ['trxrow'], b4: ['pushup'], b5: ['press'], b6: ['pullup', 'pushup', 'swing'],
  c1: ['intervals'], c2: ['swing', 'trxrow', 'thruster'], d1: ['swing', 'goblet', 'pushup', 'trxrow', 'burpee'],
  q2: ['pushup'], q3: ['deepsquat'], q4: ['plank'], p1: ['swing'], p2: ['burpee'],
};

export const SECRETS = [
  '10 extra pull-ups today, spread out however you like',
  '100 kettlebell swings across the day, any set size',
  'Climb 5 flights of stairs twice without stopping',
  '50 burpees for time',
  'Hang from the pull-up bar: 3 minutes total',
  '200 squats across the day',
  'Run 2 km, faster than feels comfortable',
];
