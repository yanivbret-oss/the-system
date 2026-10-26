// Google Play subscription: product "premium" with base plans "monthly" and "yearly" (set up in Play Console).
// Purchases are checked on the device; there is no server.
import { Platform } from 'react-native';

export const SUB_ID = 'premium';
export type PlanId = 'monthly' | 'yearly';
export type Plan = { id: PlanId; price: string; offerToken: string };

type Iap = typeof import('expo-iap');
let iap: Iap | null | undefined;
let ready: Promise<boolean> | null = null;
// only Android builds carry the billing module; web and the screenshot tour run without it
function lib(): Iap | null {
  if (iap === undefined) { try { iap = Platform.OS === 'android' ? require('expo-iap') : null; } catch { iap = null; } }
  return iap ?? null;
}
async function connect() {
  const m = lib(); if (!m) return null;
  if (!ready) ready = m.initConnection().then(() => true, () => { ready = null; return false; });
  return (await ready) ? m : null;
}

const isPremium = (p: { productId: string; purchaseState: string }) => p.productId === SUB_ID && p.purchaseState === 'purchased';

// true / false from the Play store, null when it can't be asked (web, offline, no Play services)
export async function entitled(): Promise<boolean | null> {
  const m = await connect(); if (!m) return null;
  try {
    const list = await m.getAvailablePurchases();
    // Play refunds a purchase that is not acknowledged within 3 days
    for (const p of list) if (isPremium(p) && (p as { isAcknowledgedAndroid?: boolean | null }).isAcknowledgedAndroid === false) await m.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    return list.some(isPremium);
  } catch { return null; }
}

export async function plans(): Promise<Plan[]> {
  const m = await connect(); if (!m) return [];
  try {
    const subs = (await m.fetchProducts({ skus: [SUB_ID], type: 'subs' })) as { subscriptionOffers?: { basePlanIdAndroid?: string | null; offerTokenAndroid?: string | null; displayPrice: string; pricingPhasesAndroid?: { pricingPhaseList: unknown[] } | null }[] }[];
    const out: Plan[] = [];
    for (const id of ['yearly', 'monthly'] as PlanId[]) {
      // the base plan itself is the offer with a single pricing phase
      const o = (subs[0]?.subscriptionOffers || []).filter(x => x.basePlanIdAndroid === id && x.offerTokenAndroid)
        .sort((a, b) => (a.pricingPhasesAndroid?.pricingPhaseList.length || 1) - (b.pricingPhasesAndroid?.pricingPhaseList.length || 1))[0];
      if (o) out.push({ id, price: o.displayPrice, offerToken: o.offerTokenAndroid! });
    }
    return out;
  } catch { return []; }
}

export async function buy(plan: Plan) {
  const m = await connect(); if (!m) throw new Error('Google Play billing is not available on this device.');
  await m.requestPurchase({ type: 'subs', request: { google: { skus: [SUB_ID], subscriptionOffers: [{ sku: SUB_ID, offerToken: plan.offerToken }] } } });
}

// onPremium(true) after a completed purchase; onError with a message the player can read (cancel is silent)
export function listen(onPremium: (on: boolean) => void, onError: (msg: string) => void) {
  const m = lib(); if (!m) return () => {};
  const a = m.purchaseUpdatedListener(async p => {
    if (!isPremium(p)) return;
    await m.finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
    onPremium(true);
  });
  const b = m.purchaseErrorListener(e => {
    if (e.code === m.ErrorCode.UserCancelled) return;
    if (e.code === m.ErrorCode.AlreadyOwned) { onPremium(true); return; }
    onError(e.message || 'The purchase did not go through.');
  });
  return () => { a.remove(); b.remove(); };
}

export async function manage() {
  const m = await connect(); if (!m) return;
  await m.deepLinkToSubscriptions({ skuAndroid: SUB_ID, packageNameAndroid: 'com.yanivbret.thesystem' }).catch(() => {});
}
