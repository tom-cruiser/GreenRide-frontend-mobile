// Screens that are not really connected to the backend yet stay hidden. Turn
// one on here once it works end to end.
export const features = {
  promotions: false, // the backend only returns fixed sample codes
  messaging: false,  // no chat on the backend; drivers call riders instead
  safety: false,     // sample content only
} as const;
