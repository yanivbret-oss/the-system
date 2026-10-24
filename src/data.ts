// Program content, ported from the web version of the System (index.html).
// rx: one string, or [week1, week2, week3, week4]

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
export type Workout = { name: string; tab: string; when: string; day: number; items: Item[] };
export type WorkoutKey = 'A' | 'B' | 'C' | 'D';
export type Key = WorkoutKey | 'Q' | 'P' | 'W' | 'S';

export const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const WARMUP: Item = {
  id: 'warm', name: 'חימום', tag: '8 דקות', rx: ["5 דק' הליכה בשיפוע + 2 סבבים"],
  steps: ['10 גובלט סקוואט קל', '10 משיכות גומיה לצדדים', '5 תולעים (inchworm)'],
};

export const WORKOUTS: Record<WorkoutKey, Workout> = {
  A: { name: 'רגליים + קטלבל', tab: 'רגליים', when: 'שני', day: 1, items: [
    WARMUP,
    { id: 'a1', name: 'גובלט סקוואט, טמפו 3 שניות ירידה', rx: ['4 × 12', '5 × 12', "5 × 12, מנוחה 45 ש'", '3 × 10'], note: "מנוחה 60 ש'. תחליף: סקוואט עם 2 דאמבלים" },
    { id: 'a2', name: 'בולגרי ספליט סקוואט, דאמבלים 8 ק"ג', rx: ['3 × 10 לכל רגל', '4 × 10 לכל רגל', '4 × 12 לכל רגל', '2 × 10 לכל רגל'], note: "מנוחה 60 ש'. תחליף: מכרעים לאחור" },
    { id: 'a3', name: 'דדליפט רומני על רגל אחת, קטלבל', rx: ['3 × 10 לכל רגל', '3 × 12 לכל רגל', '4 × 12 לכל רגל', '2 × 10 לכל רגל'], note: 'תחליף: גשר ירכיים על רגל אחת' },
    { id: 'a4', name: 'EMOM סווינג קטלבל', rx: ["10 דק', 15 בכל דקה", "10 דק', 17 בכל דקה", "10 דק', 20 בכל דקה", "6 דק', 15 בכל דקה"], countdown: [600, 600, 600, 360], emom: true },
    { id: 'a5', name: 'פיניש: 3 סבבים לזמן', rx: ["200 מ' ריצה, 15 גובלט, 10 ברפי"], note: 'הזמן נמדד אוטומטית', finisher: true },
  ]},
  B: { name: 'פלג עליון + מתח', tab: 'עליון + מתח', when: 'רביעי', day: 3, items: [
    WARMUP,
    { id: 'b1', name: 'EMOM מתח', rx: ["8 דק', 2 בכל דקה", "8 דק', 2-3 לסירוגין", "8 דק', 3 בכל דקה", "6 דק', 2 בכל דקה"], countdown: [480, 480, 480, 360], emom: true, note: 'תחליף: מתח עם גומיה' },
    { id: 'b2', name: 'מתח שלילי (ירידה בת 5 שניות)', rx: ['3 × 3', '3 × 4', '4 × 4', '2 × 3'], note: "מנוחה 90 ש'" },
    { id: 'b3', name: 'חתירה ב־TRX', rx: ['4 × 12', '4 × 14', '5 × 12, רגליים קדימה', '3 × 10'], note: "מנוחה 60 ש'" },
    { id: 'b4', name: 'שכיבות סמיכה', rx: ['4 × מקסימום פחות 2', '4 × מקסימום פחות 2', '5 × מקסימום פחות 2', '3 × 10'], note: 'תחליף: שכיבות סמיכה ב־TRX' },
    { id: 'b5', name: 'לחיצת כתף ביד אחת, כרע אחת', rx: ['3 × 10 לכל יד', '3 × 12 לכל יד', '4 × 12 לכל יד', '2 × 10 לכל יד'], note: 'תחליף: לחיצה עם גומיה' },
    { id: 'b6', name: 'פיניש: AMRAP 8 דקות', rx: ['5 מתח (גומיה מותרת), 10 שכיבות, 15 סווינג'], countdown: [480, 480, 480, 360], note: 'לחץ "סבב הושלם" בסוף כל סבב', finisher: true },
  ]},
  C: { name: 'ריצה + סבבים', tab: 'ריצה + סבבים', when: 'שישי', day: 5, items: [
    WARMUP,
    { id: 'c1', name: 'אינטרוולים במסילה', rx: ['6 × (דקה מהיר / דקה הליכה)', '8 × (דקה מהיר / דקה הליכה)', '10 × (דקה מהיר / דקה הליכה)', '5 × (דקה מהיר / דקה הליכה)'], countdown: [720, 960, 1200, 600], emom: true, note: 'RPE 8 במהיר. רשום את המהירות ונסה להעלות ב־0.5' },
    { id: 'c2', name: 'פיניש: AMRAP 12 דקות', rx: ["10 סווינג, 10 חתירות TRX, 10 תראסטרים, 200 מ' ריצה"], countdown: [720, 720, 720, 480], note: 'לחץ "סבב הושלם" בסוף כל סבב', finisher: true },
  ]},
  D: { name: 'Red Gate', tab: 'Red Gate', when: 'שבת', day: 6, items: [
    WARMUP,
    { id: 'd1', name: "צ'יפר לזמן, מקסימום 30 דק'", rx: ["50 סווינג, 40 גובלט, 30 שכיבות, 20 חתירות TRX, 10 ברפי, 800 מ' ריצה"], note: 'הזמן נמדד אוטומטית', finisher: true },
  ]},
};
export const ORDER: WorkoutKey[] = ['A', 'B', 'C', 'D'];
export const KEY_NAMES: Record<string, string> = { Q: 'משימה יומית', P: 'משימת עונש', W: 'שקילה', S: 'משימה נסתרת' };

// Counter-style quests (daily quest and penalty quest), shown as a System window, not a workout
export type Goal = { id: string; label: string; target: number; steps?: number[]; timer?: boolean; how: string };
export const QUESTS = {
  Q: {
    head: '[ משימה יומית ]', title: 'הכנה להיות חזק',
    lead: (trainDay: boolean) => trainDay ? 'היום יש אימון, אז המשימה קלה: רק להעיר את הגוף. שומרים כוח לאימון.' : 'יום בלי אימון, אז המשימה המלאה. אפשר לפרק לאורך היום.',
    warn: 'אזהרה: אי השלמת המשימה עד חצות תוביל לעונש.',
    goals: (w: number, trainDay: boolean): Goal[] => trainDay ? [
      { id: 'push', label: 'שכיבות סמיכה', target: 10, steps: [1, 5, 10], how: 'q2' },
      { id: 'squat', label: 'סקוואטים', target: 15, steps: [1, 5, 10], how: 'q3' },
    ] : [
      { id: 'push', label: 'שכיבות סמיכה', target: [20, 25, 30, 20][w - 1], steps: [1, 5, 10], how: 'q2' },
      { id: 'squat', label: 'סקוואטים', target: [30, 40, 50, 30][w - 1], steps: [1, 5, 10], how: 'q3' },
      { id: 'plank', label: 'פלאנק (שניות)', target: [45, 60, 75, 45][w - 1], timer: true, how: 'q4' },
    ],
  },
  P: {
    head: '[ אזור עונש ]', title: 'משימת עונש',
    lead: () => 'המשימה היומית של אתמול לא הושלמה. המערכת לא סולחת.',
    warn: 'אין XP על משימת עונש.',
    goals: (): Goal[] => [
      { id: 'swing', label: 'סווינג קטלבל', target: 100, steps: [5, 10], how: 'p1' },
      { id: 'burpee', label: 'ברפי', target: 30, steps: [1, 5], how: 'p2' },
    ],
  },
};

export const XP: Record<string, number> = { Q: 30, A: 100, B: 100, C: 100, D: 200, P: 0, W: 20, S: 50 };
export const XP_PER_LEVEL = 300;

// How-to: Hebrew cues + an English YouTube search for a demo video
export const MOVES: Record<string, [string, string, string]> = {
  goblet: ['גובלט סקוואט', 'מחזיקים את הקטלבל צמוד לחזה בשתי ידיים. רגליים ברוחב כתפיים, יורדים עם ישבן אחורה ולמטה עד שהמרפקים נוגעים בברכיים, גב זקוף, עקבים על הרצפה.', 'goblet squat kettlebell form'],
  bandpull: ['משיכת גומיה לצדדים', 'מחזיקים גומיה בשתי ידיים מול החזה, ידיים ישרות. מותחים אותה לצדדים עד שהיא נוגעת בחזה, מקרבים שכמות, וחוזרים לאט.', 'band pull apart'],
  inchworm: ['תולעת (inchworm)', 'מעמידה מתכופפים וכפות הידיים לרצפה. הולכים עם הידיים קדימה עד שכיבת סמיכה, ואז הולכים עם הרגליים חזרה לידיים ונעמדים.', 'inchworm exercise'],
  bulgarian: ['בולגרי ספליט סקוואט', 'רגל אחורית מונחת על כיסא או ספה מאחוריך. יורדים ישר למטה עד שהברך האחורית כמעט נוגעת ברצפה, ועולים בדחיפה דרך העקב של הרגל הקדמית.', 'bulgarian split squat dumbbell'],
  revlunge: ['מכרע לאחור', 'צעד גדול אחורה, יורדים עד שהברך האחורית כמעט ברצפה, וחוזרים לעמידה. קל יותר על הברכיים מהבולגרי.', 'reverse lunge'],
  slrdl: ['דדליפט רומני על רגל אחת', 'עומדים על רגל אחת, קטלבל ביד הנגדית. מתכופפים מהמותן עם גב ישר, הרגל החופשית עולה אחורה, עד שמרגישים מתיחה בירך האחורית. עולים בכיווץ ישבן.', 'single leg romanian deadlift kettlebell'],
  swing: ['סווינג קטלבל', 'תנועה מהמותן, לא סקוואט. דוחפים את הישבן אחורה, הקטלבל עובר בין הרגליים, ואז זריקת אגן חזקה קדימה שמעלה אותו לגובה החזה. הידיים רק מחזיקות.', 'russian kettlebell swing form'],
  burpee: ['ברפי', 'מעמידה ידיים לרצפה, קופצים לשכיבת סמיכה, חזה לרצפה, חוזרים עם הרגליים לידיים, וקפיצה למעלה עם מחיאת כף מעל הראש.', 'burpee proper form'],
  pullup: ['מתח', 'אחיזה רחבה מעט מהכתפיים, כפות הידיים קדימה. מתחילים מתלייה מלאה, מושכים עד שהסנטר מעל המוט, יורדים בשליטה עד הסוף.', 'strict pull up form'],
  negative: ['מתח שלילי', 'קופצים או עולים על כיסא כך שהסנטר מעל המוט. יורדים הכי לאט שאפשר, 5 שניות, עד ידיים ישרות. בונה כוח למתח מלא.', 'negative pull ups'],
  trxrow: ['חתירה ב־TRX', 'אוחזים בידיות, נשענים אחורה עם גוף ישר כמו קרש. מושכים את החזה לידיים ומקרבים שכמות. ככל שהרגליים קדימה יותר, קשה יותר.', 'TRX row'],
  pushup: ['שכיבת סמיכה', 'ידיים מעט רחבות מהכתפיים, גוף ישר מראש עד עקב. חזה כמעט לרצפה, מרפקים בזווית של כ־45 מעלות מהגוף, ודוחפים חזרה.', 'push up proper form'],
  press: ['לחיצת כתף ביד אחת בכרע', 'כורעים על ברך אחת, דאמבל ביד של אותו צד כמו הברך שעל הרצפה. לוחצים ישר למעלה עד יד ישרה, בלי להתקשת בגב. בטן מכווצת.', 'half kneeling single arm dumbbell press'],
  thruster: ['תראסטר עם דאמבלים', 'דאמבלים על הכתפיים, סקוואט מלא, ובעלייה ממשיכים בתנועה אחת ללחיצה מעל הראש.', 'dumbbell thruster'],
  intervals: ['אינטרוולים במסילה', 'דקה ריצה מהירה (קשה לדבר, RPE 8), ודקה הליכה. רושמים את המהירות בריצה, ומנסים להעלות ב־0.5 כל שבוע.', 'treadmill interval running beginner'],
  deepsquat: ['סקוואט עמוק איטי', 'יורדים לסקוואט הכי עמוק שנוח, עקבים על הרצפה, נשארים 2 שניות למטה ועולים לאט. אפשר להחזיק בדלת לאיזון.', 'deep squat hold mobility'],
  plank: ['פלאנק', 'על האמות והבהונות, גוף ישר מראש עד עקב. מכווצים בטן וישבן, לא מורידים את האגן ולא מרימים את הישבן.', 'plank proper form'],
};
export const HOW: Record<string, string[]> = {
  warm: ['goblet', 'bandpull', 'inchworm'], a1: ['goblet'], a2: ['bulgarian', 'revlunge'], a3: ['slrdl'], a4: ['swing'], a5: ['goblet', 'burpee'],
  b1: ['pullup'], b2: ['negative'], b3: ['trxrow'], b4: ['pushup'], b5: ['press'], b6: ['pullup', 'pushup', 'swing'],
  c1: ['intervals'], c2: ['swing', 'trxrow', 'thruster'], d1: ['swing', 'goblet', 'pushup', 'trxrow', 'burpee'],
  q2: ['pushup'], q3: ['deepsquat'], q4: ['plank'], p1: ['swing'], p2: ['burpee'],
};

export const SECRETS = [
  '10 מתח נוספים היום, מפוזרים איך שבא לך',
  '100 סווינג לאורך היום, בכל סט כמה שאתה רוצה',
  'עלה ורד 5 קומות במדרגות פעמיים, בלי לעצור',
  '50 ברפי לזמן',
  'תלייה על מוט המתח: 3 דקות מצטבר',
  '200 סקוואטים לאורך היום',
  'ריצה של 2 ק"מ, מהר ממה שנוח לך',
];
