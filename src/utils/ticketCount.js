export const TICKET_CAPACITY = 50;

// "Date Night" tier counts as 2 tickets (it's for a couple)
export const tierSlotCount = (tierLabel = "") => {
  return tierLabel.toLowerCase().includes("date night") ? 2 : 1;
};

// Sum up slots used by non-cancelled bookings
export const countUsedSlots = (bookings = []) => {
  return bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + tierSlotCount(b.tier_label), 0);
};

export const isSoldOut = (bookings = []) =>
  countUsedSlots(bookings) >= TICKET_CAPACITY;

export const remainingSlots = (bookings = []) =>
  Math.max(0, TICKET_CAPACITY - countUsedSlots(bookings));