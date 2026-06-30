// "Date Night" tier counts as 2 tickets (it's for a couple).
// Also parses multipliers like "2x Standard" and comma-separated bookings.
export const tierSlotCount = (tierLabel = "") => {
  const labelLower = tierLabel.toLowerCase();
  
  if (labelLower.includes(",")) {
    return labelLower.split(",").reduce((sum, part) => sum + tierSlotCount(part.trim()), 0);
  }

  let qty = 1;
  const match = labelLower.match(/^(\d+)x/);
  if (match) {
    qty = parseInt(match[1], 10);
  }

  const perTicketSlots = labelLower.includes("date night") ? 2 : 1;
  return qty * perTicketSlots;
};

export const countUsedSlots = (bookings = []) => {
  return bookings
    .filter(b => b.status !== "cancelled" && b.status !== "failed")
    .reduce((sum, b) => sum + tierSlotCount(b.tier_label), 0);
};

export const isSoldOut = (bookings = [], capacity = 50) =>
  countUsedSlots(bookings) >= capacity;

export const remainingSlots = (bookings = [], capacity = 50) =>
  Math.max(0, capacity - countUsedSlots(bookings));