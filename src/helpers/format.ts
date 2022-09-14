

/**
 * Convert a duration string to millisecond amount
 * '6h' = 21600000
 * ==================================================
 */
export function durationStringToMs (duration: string) {
  const [, amount, unit] = duration.match(/^(\d+)(ms|s|m|h|d|w)$/);
  if (!amount || !unit) return 0;
  
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
    w: 1000 * 60 * 60 * 24 * 7,
  }
  return Number(amount) * multipliers[unit];

}