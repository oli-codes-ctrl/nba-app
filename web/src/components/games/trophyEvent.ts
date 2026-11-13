/**
 * The site-wide trophy notice listens for this, so pages that only count
 * toward a trophy (team pages, head-to-heads, following) need not load the
 * games' code up front.
 */
export const TROPHY_EVENT = 'hoops:trophies-earned';
export type TrophyEventDetail = { trophies: { id: string; title: string; description: string }[] };
/** Fired by the follow button whenever the followed list changes. */
export const FOLLOWS_EVENT = 'hoops:follows-change';
