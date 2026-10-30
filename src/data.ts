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
  how?: string[];
  // which fitness-test answer the reps depend on (mix: a circuit of several)
  cat?: Cat;
  // home kit it needs (any one of them); without it the no-equipment version is used
  needs?: Kit[];
  // replacements for players without the home kit (none) or with a full gym
  alt?: Partial<Record<Gear, Partial<Item>>>;
};
export type Gear = 'none' | 'basic' | 'gym';
export type Cat = 'push' | 'pull' | 'legs' | 'mix';
// Home kit: what a player training at home actually owns
export type Kit = 'kb' | 'db' | 'bar' | 'trx' | 'bands' | 'tread';
export const KIT: [Kit, string][] = [['kb', 'Kettlebell'], ['db', 'Dumbbells'], ['bar', 'Pull-up bar'], ['trx', 'TRX'], ['bands', 'Bands'], ['tread', 'Treadmill']];
// what the home plan was written for; players from before the kit choice keep it
export const FULL_KIT: Kit[] = ['kb', 'bar', 'trx', 'bands', 'tread'];
export type Setup = { kit?: Kit[]; noRun?: boolean };
// Fitness test: the most reps the player can do in a row, asked at onboarding
export type Fit = { push: number; pull: number; squat: number };
export const GEAR: [Gear, string, string][] = [
  ['none', 'No equipment', 'Bodyweight only, anywhere'],
  ['basic', 'Home kit', 'Weights, a pull-up bar, TRX or bands: pick what you have'],
  ['gym', 'Gym', 'Full gym access'],
];
export type Workout = { name: string; short: string; day: number; items: Item[]; alt?: Partial<Record<Gear, { name: string; short: string }>> };
export type WorkoutKey = 'A' | 'B' | 'C' | 'D';

export const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const WARMUP: Item = {
  id: 'warm', name: 'Warm-up', tag: '8 min', rx: ['5 min incline walk, then 2 quick rounds of:'],
  steps: ['10 light goblet squats', '10 band pull-aparts', '5 inchworms'],
  alt: { none: { rx: ['5 min brisk walk or march, then 2 quick rounds of:'], steps: ['10 bodyweight squats', '10 arm circles each way', '5 inchworms'], how: ['deepsquat', 'inchworm'] } },
};

export const WORKOUTS: Record<WorkoutKey, Workout> = {
  A: { name: 'Legs + Kettlebell', short: 'Legs', day: 1, alt: { none: { name: 'Legs + Bodyweight', short: 'Legs' }, gym: { name: 'Legs + Barbell', short: 'Legs' } }, items: [
    WARMUP,
    { id: 'a1', cat: 'legs', needs: ['kb', 'db'], name: 'Goblet squat, 3s lowering', rx: ['4 × 12', '5 × 12', '5 × 12, 45s rest', '3 × 10'], note: 'Rest 60s. Swap: squat holding 2 dumbbells',
      alt: { none: { name: 'Tempo squat, 3s lowering', rx: ['4 × 15', '5 × 15', '5 × 20', '3 × 12'], note: 'Rest 45s. Pause 1s at the bottom', how: ['deepsquat'] },
        gym: { name: 'Barbell back squat', rx: ['4 × 8', '5 × 8', '5 × 6, heavier', '3 × 8, light'], note: 'Rest 90s. Last rep should be hard but clean', how: ['backsquat'] } } },
    { id: 'a2', cat: 'legs', name: 'Bulgarian split squat', rx: ['3 × 10 each leg', '4 × 10 each leg', '4 × 12 each leg', '2 × 10 each leg'], note: 'Rest 60s. Swap: reverse lunges',
      alt: { none: { note: 'Rear foot on a chair or couch. Rest 60s' } } },
    { id: 'a3', cat: 'legs', needs: ['kb', 'db'], name: 'Single-leg Romanian deadlift', rx: ['3 × 10 each leg', '3 × 12 each leg', '4 × 12 each leg', '2 × 10 each leg'], note: 'Swap: single-leg glute bridge',
      alt: { none: { name: 'Single-leg Romanian deadlift, bodyweight', note: 'Slow and controlled. Swap: single-leg glute bridge' },
        gym: { name: 'Barbell Romanian deadlift', rx: ['3 × 10', '4 × 10', '4 × 8, heavier', '2 × 10, light'], note: 'Rest 90s', how: ['rdl'] } } },
    { id: 'a4', cat: 'legs', needs: ['kb', 'db'], name: 'Kettlebell swing EMOM', rx: ['10 min, 15 every minute', '10 min, 17 every minute', '10 min, 20 every minute', '6 min, 15 every minute'], countdown: [600, 600, 600, 360], emom: true,
      alt: { none: { name: 'Jump squat EMOM', rx: ['10 min, 10 every minute', '10 min, 12 every minute', '10 min, 15 every minute', '6 min, 10 every minute'], how: ['jumpsquat'] } } },
    { id: 'a5', cat: 'mix', name: 'Finisher: 3 rounds for time', rx: ['Each round: 200 m run, 15 goblet squats, 10 burpees'], note: 'Timed automatically', finisher: true,
      alt: { none: { rx: ['Each round: 1 min high knees, 20 squats, 10 burpees'], how: ['highknees', 'deepsquat', 'burpee'] } } },
  ]},
  B: { name: 'Upper Body + Pull-ups', short: 'Upper', day: 3, alt: { none: { name: 'Upper Body + Push', short: 'Upper' } }, items: [
    WARMUP,
    { id: 'b1', cat: 'pull', needs: ['bar'], name: 'Pull-up EMOM', rx: ['8 min, 2 every minute', '8 min, 2 and 3 on alternate minutes', '8 min, 3 every minute', '6 min, 2 every minute'], countdown: [480, 480, 480, 360], emom: true, note: 'Swap: band-assisted pull-ups',
      alt: { none: { cat: 'push', name: 'Push-up EMOM', rx: ['8 min, 6 every minute', '8 min, 8 every minute', '8 min, 10 every minute', '6 min, 6 every minute'], note: 'Knees down is fine for the last minutes', how: ['pushup'] },
        gym: { note: 'Swap: assisted pull-up machine' } } },
    { id: 'b2', cat: 'pull', needs: ['bar'], name: 'Negative pull-ups (5s down)', rx: ['3 × 3', '3 × 4', '4 × 4', '2 × 3'], note: 'Rest 90s',
      alt: { none: { cat: 'push', name: 'Pike push-ups', rx: ['3 × 6', '3 × 8', '4 × 8', '2 × 6'], note: 'Rest 60s. Hips high, head toward the floor', how: ['pike'] } } },
    { id: 'b3', needs: ['trx'], name: 'TRX row', rx: ['4 × 12', '4 × 14', '5 × 12, feet further forward', '3 × 10'], note: 'Rest 60s',
      alt: { none: { name: 'Table row', note: 'Lie under a sturdy table and pull your chest to the edge. Rest 60s', how: ['tablerow'] },
        gym: { name: 'Seated cable row', rx: ['4 × 12', '4 × 12, heavier', '5 × 10', '3 × 10, light'], how: ['cablerow'] } } },
    { id: 'b4', cat: 'push', name: 'Push-ups', rx: ['4 × (your max − 2)', '4 × (your max − 2)', '5 × (your max − 2)', '3 × 10'], note: 'Swap: TRX push-ups',
      alt: { none: { name: 'Chair dips', rx: ['4 × 10', '4 × 12', '5 × 12', '3 × 8'], note: 'Hands on a sturdy chair behind you. Rest 60s', how: ['dips'] } } },
    { id: 'b5', needs: ['kb', 'db', 'bands'], name: 'Half-kneeling single-arm press', rx: ['3 × 10 each arm', '3 × 12 each arm', '4 × 12 each arm', '2 × 10 each arm'], note: 'Swap: band press',
      alt: { none: { name: 'Superman hold', rx: ['3 × 30s', '3 × 40s', '4 × 40s', '2 × 30s'], note: 'Lift arms and legs, squeeze your back', how: ['superman'] },
        gym: { name: 'Seated dumbbell shoulder press', rx: ['3 × 10', '3 × 12', '4 × 10, heavier', '2 × 10'], note: 'Rest 60s', how: ['dbpress'] } } },
    { id: 'b6', cat: 'mix', name: 'Finisher: 8 min AMRAP', rx: ['5 pull-ups (band ok), 10 push-ups, 15 swings'], countdown: [480, 480, 480, 360], note: 'Tap "Round done" after each round', finisher: true,
      alt: { none: { rx: ['5 pike push-ups, 10 table rows, 15 jump squats'], how: ['pike', 'tablerow', 'jumpsquat'] } } },
  ]},
  C: { name: 'Run + Rounds', short: 'Run', day: 5, items: [
    WARMUP,
    { id: 'c1', needs: ['tread'], name: 'Treadmill intervals', rx: ['6 × (1 min fast / 1 min walk)', '8 × (1 min fast / 1 min walk)', '10 × (1 min fast / 1 min walk)', '5 × (1 min fast / 1 min walk)'], countdown: [720, 960, 1200, 600], emom: true, note: 'Fast = hard, you can only say a few words. Note your speed and add 0.5 km/h next week',
      alt: { none: { name: 'Run intervals, outdoors', note: 'Fast = hard, you can only say a few words. No space to run? High knees in place' } } },
    { id: 'c2', cat: 'mix', name: 'Finisher: 12 min AMRAP', rx: ['10 swings, 10 TRX rows, 10 thrusters, 200 m run'], countdown: [720, 720, 720, 480], note: 'Tap "Round done" after each round', finisher: true,
      alt: { none: { rx: ['10 jump squats, 10 table rows, 10 burpees, 200 m run'], how: ['jumpsquat', 'tablerow', 'burpee'] },
        gym: { rx: ['10 swings, 10 cable rows, 10 thrusters, 200 m run'], how: ['swing', 'cablerow', 'thruster'] } } },
  ]},
  D: { name: 'Red Gate', short: 'Red Gate', day: 6, items: [
    WARMUP,
    { id: 'd1', cat: 'mix', name: 'Chipper for time, 30 min cap', rx: ['In order: 50 swings, 40 goblet squats, 30 push-ups, 20 TRX rows, 10 burpees, 800 m run'], note: 'Timed automatically', finisher: true,
      alt: { none: { rx: ['In order: 50 jump squats, 40 squats, 30 push-ups, 20 table rows, 10 burpees, 800 m run'], how: ['jumpsquat', 'deepsquat', 'pushup', 'tablerow', 'burpee'] },
        gym: { rx: ['In order: 50 swings, 40 goblet squats, 30 push-ups, 20 cable rows, 10 burpees, 800 m run'], how: ['swing', 'goblet', 'pushup', 'cablerow', 'burpee'] } } },
  ]},
};
export const ORDER: WorkoutKey[] = ['A', 'B', 'C', 'D'];

// A workout as this player sees it: the home-kit version with the swaps for their equipment applied
export function workoutFor(k: WorkoutKey, gear: Gear = 'basic', fit?: Fit, setup: Setup = {}): Workout {
  const w = WORKOUTS[k];
  let g = gear === 'basic' ? w : { ...w, ...(w.alt?.[gear] || {}), items: w.items.map(it => ({ ...it, ...(it.alt?.[gear] || {}) })) };
  if (gear === 'basic' && setup.kit) {
    const kit = setup.kit;
    g = { ...g, items: g.items.map(it => kitItem(it, kit)) };
    if (k === 'A' && !kit.includes('kb')) g = { ...g, name: kit.includes('db') ? 'Legs + Dumbbells' : 'Legs + Bodyweight' };
    if (k === 'B' && !kit.includes('bar')) g = { ...g, name: 'Upper Body + Push' };
  }
  if (setup.noRun) {
    g = { ...g, items: g.items.map(noRunItem) };
    if (k === 'C') g = { ...g, name: 'Intervals + Rounds' };
  }
  return fit ? { ...g, items: g.items.map(it => scaleItem(it, gear, fit)) } : g;
}

// ---- the player's own home kit
export const hasWeights = (gear: Gear, kit?: Kit[]) => gear === 'gym' || (gear === 'basic' && (!kit || kit.includes('kb') || kit.includes('db')));
export const hasBar = (gear: Gear, kit?: Kit[]) => gear === 'gym' || (gear === 'basic' && (!kit || kit.includes('bar')));
// Words in a circuit or warm-up that need kit, what replaces them, and the demo that goes with each
function kitSwaps(kit: Kit[]): [string, string, string, string][] {
  const has = (x: Kit) => kit.includes(x), weights = has('kb') || has('db');
  const out: [string, string, string, string][] = [];
  if (!has('tread')) out.push(['incline walk', 'brisk walk or march', '', '']);
  if (!weights) out.push(['light goblet squats', 'bodyweight squats', 'goblet', 'deepsquat'], ['goblet squats', 'squats', 'goblet', 'deepsquat'], ['swings', 'jump squats', 'swing', 'jumpsquat'], ['thrusters', 'jump squats', 'thruster', 'jumpsquat']);
  else if (!has('kb')) out.push(['swings', 'dumbbell swings', '', '']);
  if (!has('bands')) out.push(['band pull-aparts', 'arm circles each way', 'bandpull', '']);
  if (!has('bar')) out.push(['pull-ups (band ok)', 'pike push-ups', 'pullup', 'pike']);
  if (!has('trx')) out.push(['TRX rows', 'table rows', 'trxrow', 'tablerow']);
  return out;
}
function swapWords(it: Item, swaps: [string, string, string, string][]): Item {
  const sw = (x: string) => swaps.reduce((a, [from, to]) => a.split(from).join(to), x);
  const used = swaps.filter(([from]) => [...it.rx, ...(it.steps || [])].some(x => x.includes(from)));
  if (!used.length) return it;
  let how = it.how || HOW[it.id] || [];
  for (const [, , a, b] of used) if (a) how = how.map(h => h === a ? b : h);
  return { ...it, rx: it.rx.map(sw), steps: it.steps?.map(sw), how: [...new Set(how.filter(Boolean))] };
}
function kitItem(it: Item, kit: Kit[]): Item {
  // without the kit it needs, the item becomes its no-equipment version
  if (it.needs && !it.needs.some(x => kit.includes(x))) it = { ...it, ...(it.alt?.none || {}) };
  else if (it.id === 'a4' && !kit.includes('kb')) it = { ...it, name: 'Dumbbell swing EMOM', note: 'One dumbbell held by the end, same hip snap as a kettlebell swing' };
  return swapWords(it, kitSwaps(kit));
}
// No running: jumping jacks take the run's place
function noRunItem(it: Item): Item {
  if (it.id === 'c1') return { ...it, name: 'Jumping jack intervals', rx: it.rx.map(r => r.replace('1 min walk', '1 min easy march')), note: 'Fast = hard, you can only say a few words. Keep a steady rhythm', how: ['jumpingjack'] };
  const sw: [string, string, string, string][] = [['200 m run', '40 jumping jacks', '', ''], ['800 m run', '150 jumping jacks', '', '']];
  const out = swapWords(it, sw);
  return out === it ? it : { ...out, how: [...(out.how || []), 'jumpingjack'] };
}

// ---- difficulty from the fitness test
// Below these, the plan's reps are too many for that movement: they are cut to about 60%
const LOW = { push: 12, pull: 5, squat: 25 };
const catFactor = (c: Cat | undefined, f: Fit, gear: Gear) => {
  const low = { push: f.push < LOW.push, pull: gear !== 'none' && f.pull < LOW.pull, legs: f.squat < LOW.squat };
  if (!c) return 1;
  if (c === 'mix') return low.push || low.pull || low.legs ? 0.7 : 1;
  return low[c] ? 0.6 : 1;
};
// Scale the rep counts in a prescription, never set counts ("4 ×"), distances, times or "max − 2"
export function scaleRx(rx: string, f: number) {
  if (f >= 1) return rx;
  return rx.replace(/\d+/g, (n, i: number) => {
    const after = rx.slice(i + n.length), before = rx.slice(0, i);
    if (/^\s*(×|m\b|min\b|s\b|km|\))/.test(after) || /[−-]\s*$/.test(before)) return n;
    return String(Math.max(1, Math.round(+n * f)));
  });
}
function scaleItem(it: Item, gear: Gear, fit: Fit): Item {
  const f = catFactor(it.cat, fit, gear);
  if (f >= 1) return it;
  const out: Item = { ...it, rx: it.rx.map(r => scaleRx(r, f)) };
  // no strict pull-up yet: the pull-up work is assisted
  if (it.cat === 'pull' && gear !== 'none' && fit.pull < 2 && it.id === 'b1') {
    out.name = gear === 'gym' ? 'Assisted pull-up EMOM' : 'Band-assisted pull-up EMOM';
    out.note = gear === 'gym' ? 'Use the assisted pull-up machine' : 'Loop a band under your feet or knee. Jumping negatives are fine too';
  }
  if (it.cat === 'push' && fit.push < 5) out.note = (it.note ? it.note + '. ' : '') + 'Knees down is fine';
  return out;
}
export const fitLevel = (f: Fit, gear: Gear) => {
  const n = [f.push < LOW.push, gear !== 'none' && f.pull < LOW.pull, f.squat < LOW.squat].filter(Boolean).length;
  return n === 0 ? 'Standard' : n === 3 ? 'Beginner' : 'Adjusted';
};
export const KEY_NAMES: Record<string, string> = { Q: 'Daily Quest', P: 'Penalty Quest', W: 'Weigh-in', S: 'Secret Quest', X: 'Weigh-in missed' };

// Counter-style quests: the daily quest on rest days, and the penalty quest
export type Goal = { id: string; label: string; target: number; unit?: string; steps?: number[]; timer?: boolean; how: string };
export const QUESTS = {
  Q: {
    title: 'Preparation to Become Strong',
    lead: 'A rest day, so the full quest. Split it up across the day if you like.',
    warn: 'Failing to complete the daily quest by midnight will result in a penalty.',
    goals: (w: number, fit?: Fit): Goal[] => [
      { id: 'push', label: 'Push-ups', target: Math.round([20, 25, 30, 20][w - 1] * (fit ? catFactor('push', fit, 'basic') : 1)), steps: [1, 5, 10], how: 'q2' },
      { id: 'squat', label: 'Squats', target: Math.round([30, 40, 50, 30][w - 1] * (fit ? catFactor('legs', fit, 'basic') : 1)), steps: [1, 5, 10], how: 'q3' },
      { id: 'plank', label: 'Plank', unit: 's', target: [45, 60, 75, 45][w - 1], timer: true, how: 'q4' },
    ],
  },
  P: {
    title: 'Penalty Quest',
    lead: "Yesterday's daily quest was not completed. The System does not forgive.",
    warn: 'No XP is awarded for a penalty quest.',
    goals: (gear: Gear = 'basic', kit?: Kit[]): Goal[] => [
      !hasWeights(gear, kit) ? { id: 'swing', label: 'Jump squats', target: 100, steps: [5, 10], how: 'p3' } : { id: 'swing', label: 'Kettlebell swings', target: 100, steps: [5, 10], how: 'p1' },
      { id: 'burpee', label: 'Burpees', target: 30, steps: [1, 5], how: 'p2' },
    ],
  },
};

export const XP: Record<string, number> = { Q: 30, A: 100, B: 100, C: 100, D: 200, P: 0, W: 20, S: 50, X: -20 };
// X: a missed weekly weigh-in costs what reporting it would have earned
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
  intervals: ['Treadmill intervals', 'One minute fast (hard, you can only say a few words), one minute walking. Note your fast speed and try to add 0.5 km/h every week.', 'treadmill interval running beginner'],
  deepsquat: ['Squat', 'Feet shoulder-width, sit as deep as is comfortable with heels down, chest up, and stand back up. Hold a door frame for balance if needed.', 'bodyweight squat form'],
  jumpsquat: ['Jump squat', 'Squat to just above parallel, then jump as high as you can. Land softly on the balls of your feet and sink straight into the next rep.', 'jump squat form'],
  highknees: ['High knees', 'Run in place, driving your knees to hip height, arms pumping. Stay on the balls of your feet.', 'high knees exercise'],
  pike: ['Pike push-up', 'Start in a downward dog with hips high. Bend your elbows and lower the top of your head toward the floor between your hands, then press back up. Builds the shoulders.', 'pike push up form'],
  tablerow: ['Table row', 'Lie under a sturdy table, grip the edge, body straight. Pull your chest to the table and lower slowly. Bend your knees to make it easier.', 'inverted row under table'],
  dips: ['Chair dip', 'Hands on the edge of a sturdy chair behind you, legs out in front. Lower until your elbows reach 90°, then press up.', 'chair dips form'],
  superman: ['Superman hold', 'Lie face down, arms overhead. Lift your arms, chest and legs off the floor and hold, squeezing your back and glutes.', 'superman hold exercise'],
  backsquat: ['Barbell back squat', 'Bar on your upper back, feet shoulder-width. Brace, sit down between your heels to at least parallel, drive up keeping your chest up.', 'barbell back squat form'],
  rdl: ['Romanian deadlift', 'Hold the bar at your hips. Push your hips back with a flat back and soft knees until you feel your hamstrings, then squeeze your glutes to stand.', 'barbell romanian deadlift form'],
  cablerow: ['Seated cable row', 'Sit tall, pull the handle to your belly, squeeze your shoulder blades, and return slowly without rounding your back.', 'seated cable row form'],
  dbpress: ['Seated dumbbell shoulder press', 'Sit with back support, dumbbells at shoulder height. Press overhead to straight arms, lower under control.', 'seated dumbbell shoulder press form'],
  jumpingjack: ['Jumping jack', 'Jump your feet out wide as your arms swing overhead, then jump back together with arms at your sides. Stay light on the balls of your feet.', 'jumping jacks exercise'],
  plank: ['Plank', 'On forearms and toes, body straight from head to heels. Brace your abs and glutes; do not let your hips sag or pike up.', 'plank proper form'],
};
// Looping anime demo videos of each move, keyed like MOVES; bundled so they play offline
export const DEMOS: Record<string, number> = {
  backsquat: require('../assets/demos/backsquat.mp4'),
  bandpull: require('../assets/demos/bandpull.mp4'),
  bulgarian: require('../assets/demos/bulgarian.mp4'),
  burpee: require('../assets/demos/burpee.mp4'),
  cablerow: require('../assets/demos/cablerow.mp4'),
  dbpress: require('../assets/demos/dbpress.mp4'),
  deepsquat: require('../assets/demos/deepsquat.mp4'),
  dips: require('../assets/demos/dips.mp4'),
  goblet: require('../assets/demos/goblet.mp4'),
  highknees: require('../assets/demos/highknees.mp4'),
  inchworm: require('../assets/demos/inchworm.mp4'),
  intervals: require('../assets/demos/intervals.mp4'),
  jumpsquat: require('../assets/demos/jumpsquat.mp4'),
  negative: require('../assets/demos/negative.mp4'),
  pike: require('../assets/demos/pike.mp4'),
  plank: require('../assets/demos/plank.mp4'),
  press: require('../assets/demos/press.mp4'),
  pullup: require('../assets/demos/pullup.mp4'),
  pushup: require('../assets/demos/pushup.mp4'),
  rdl: require('../assets/demos/rdl.mp4'),
  revlunge: require('../assets/demos/revlunge.mp4'),
  slrdl: require('../assets/demos/slrdl.mp4'),
  superman: require('../assets/demos/superman.mp4'),
  swing: require('../assets/demos/swing.mp4'),
  tablerow: require('../assets/demos/tablerow.mp4'),
  thruster: require('../assets/demos/thruster.mp4'),
  trxrow: require('../assets/demos/trxrow.mp4'),
};
export const HOW: Record<string, string[]> = {
  warm: ['goblet', 'bandpull', 'inchworm'], a1: ['goblet'], a2: ['bulgarian', 'revlunge'], a3: ['slrdl'], a4: ['swing'], a5: ['goblet', 'burpee'],
  b1: ['pullup'], b2: ['negative'], b3: ['trxrow'], b4: ['pushup'], b5: ['press'], b6: ['pullup', 'pushup', 'swing'],
  c1: ['intervals'], c2: ['swing', 'trxrow', 'thruster'], d1: ['swing', 'goblet', 'pushup', 'trxrow', 'burpee'],
  q2: ['pushup'], q3: ['deepsquat'], q4: ['plank'], p1: ['swing'], p2: ['burpee'], p3: ['jumpsquat'],
};

// secrets that need kit: a pull-up bar (0, 4) or a kettlebell (1)
export const BAR_SECRETS = [0, 4], KB_SECRETS = [1];
export const SECRETS = [
  '10 extra pull-ups today, spread out however you like',
  '100 kettlebell swings across the day, any set size',
  'Climb 5 flights of stairs twice without stopping',
  '50 burpees for time',
  'Hang from the pull-up bar: 3 minutes total',
  '200 squats across the day',
  'Run 2 km, faster than feels comfortable',
];
