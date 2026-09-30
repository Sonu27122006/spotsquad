/**
 * Unified Parking Duration & Fee Calculation Utility
 * 
 * Accurately calculates parking duration, respects demo time simulation,
 * determines if a vehicle has been parked for MORE THAN 24 HOURS ("Parked > 1 Day"),
 * and calculates the current due amount based on 24-hour block billing.
 */
export function getParkingDuration(entryTime, currentTime = new Date(), demoAddedDays = 0, dailyRate = 20) {
  if (!entryTime) {
    return {
      hours: 0,
      minutes: 0,
      days: 1,
      totalHours: 0,
      amount: Number(dailyRate || 20),
      isOverOneDay: false,
      text: '1 Day',
      badgeText: null,
      simDays: 0,
    };
  }

  const entry = new Date(entryTime);
  const now = new Date(currentTime);
  const diffMs = Math.max(0, now.getTime() - entry.getTime());
  const baseMinutes = Math.floor(diffMs / (1000 * 60));
  const baseHours = diffMs / (1000 * 60 * 60);

  // Add demo simulation days (each simulated day = 24 hours = 1440 minutes)
  const simDays = Number(demoAddedDays || 0);
  const totalHours = baseHours + (simDays * 24);
  const totalMinutes = baseMinutes + (simDays * 24 * 60);

  // Exact rule: A vehicle is "Parked > 1 Day" strictly when totalHours > 24.0
  const isOverOneDay = totalHours > 24.0;

  // Billing blocks: 1 day minimum, ceil(totalHours / 24)
  const days = Math.max(1, Math.ceil(totalHours / 24.0));
  const rate = Number(dailyRate || 20);
  const amount = days * rate;

  let text = '';
  if (days > 1) {
    text = `${days} Days`;
  } else if (totalHours >= 1) {
    const hrs = Math.floor(totalHours);
    const mins = Math.floor(totalMinutes % 60);
    text = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} Hours`;
  } else {
    text = `${Math.max(1, totalMinutes)} Mins`;
  }

  return {
    hours: totalHours,
    minutes: totalMinutes,
    days: days,
    totalHours: totalHours,
    amount: amount,
    isOverOneDay: isOverOneDay,
    text: text,
    badgeText: isOverOneDay ? (days > 1 ? `${days} DAYS+` : '1 DAY+') : null,
    simDays: simDays,
  };
}
