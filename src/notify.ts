import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { XP, WorkoutKey, workoutFor } from './data';
import { Profile, Rec, QUEST_KEYS, onDay, startOfDay, weekStart, weights, todaysWorkout } from './logic';

// Phone notifications, scheduled on the device for the coming week (no server).
// Everything is cancelled and scheduled again whenever the profile or the history changes.
export const REMIND_HOURS = [7, 12, 18, 20];
export const DEFAULT_REMIND = 18;
const WARN_HOUR = 22, WEIGH_HOUR = 8;
const on = Platform.OS !== 'web';

if (on) Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function askPermission() {
  if (!on) return false;
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('system', { name: 'The System', importance: Notifications.AndroidImportance.HIGH, lightColor: '#59E8FF' });
  const cur = await Notifications.getPermissionsAsync();
  return cur.granted || (cur.canAskAgain && (await Notifications.requestPermissionsAsync()).granted);
}

const at = (d: Date, h: number) => { const x = startOfDay(d); x.setHours(h); return x; };

export async function scheduleAll(p: Profile, h: Rec[]) {
  if (!on) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (p.notify === false || !(await Notifications.getPermissionsAsync()).granted) return;
  const now = new Date(), list: [Date, string, string][] = [];
  for (let i = 0; i < 7; i++) {
    const d = startOfDay(now); d.setDate(d.getDate() + i);
    if (i === 0 && onDay(h, d, QUEST_KEYS)) continue;
    const k = todaysWorkout(d, p) as WorkoutKey | undefined;
    list.push(k
      ? [at(d, p.remindAt ?? DEFAULT_REMIND), 'The Gate has opened', workoutFor(k, p.gear || 'basic').name + ' is waiting. Reward: ' + XP[k] + ' XP']
      : [at(d, p.remindAt ?? DEFAULT_REMIND), 'Daily Quest has arrived', 'Preparation to become strong. Reward: ' + XP.Q + ' XP']);
    list.push([at(d, WARN_HOUR), 'WARNING', "Complete today's quest by midnight, or face the penalty zone."]);
  }
  // the weekly weigh-in: this week's if it is still due, and next week's
  const ws = weekStart(now), weighed = weights(h).some(x => new Date(x.createdAt) >= ws);
  if (!weighed) list.push([at(now, WEIGH_HOUR), 'Weekly Quest: Weigh-in', 'Report your weight before the week ends. Reward: ' + XP.W + ' XP']);
  const nw = new Date(ws); nw.setDate(nw.getDate() + 7);
  list.push([at(nw, WEIGH_HOUR), 'Weekly Quest: Weigh-in', 'Report your weight before the week ends. Reward: ' + XP.W + ' XP']);
  for (const [date, title, body] of list) {
    if (date <= now) continue;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'system' } });
  }
}
