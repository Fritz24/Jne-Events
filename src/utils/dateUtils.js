/**
 * Checks if a given event date string falls on the current upcoming or ongoing weekend (Friday through Sunday).
 */
export function isEventThisWeekend(dateStr) {
  if (!dateStr) return false;
  const eventDate = new Date(dateStr);
  if (isNaN(eventDate.getTime())) return false;

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat

  // Friday is the start of the weekend
  // If today is Sunday (0), this weekend is ongoing: Friday was 2 days ago (-2)
  // If today is Saturday (6), this weekend started Friday: (-1) day ago
  // If today is Mon-Fri (1-5), this weekend starts on Friday: (5 - currentDay) days ahead
  let diffToFriday;
  if (currentDay === 0) diffToFriday = -2;
  else if (currentDay === 6) diffToFriday = -1;
  else diffToFriday = 5 - currentDay;

  const friday = new Date(now);
  friday.setDate(now.getDate() + diffToFriday);
  friday.setHours(0, 0, 0, 0);

  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  return eventDate >= friday && eventDate <= sunday;
}
