const LOCAL_KEY = 'jne_tickets_local';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

export const getLocalTickets = () => {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return [];

  const parsed = safeParse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

export const saveLocalTicket = (booking, event) => {
  if (typeof window === 'undefined' || !booking?.ticket_id) return booking;

  const current = getLocalTickets();
  const payload = {
    ...booking,
    source: 'guest',
    saved_at: new Date().toISOString(),
    event_snapshot: event
      ? {
          id: event.id,
          title: event.title,
          date: event.date,
          venue: event.venue,
          city: event.city,
          image_url: event.image_url,
          status: event.status,
          currency: event.currency,
        }
      : null,
  };

  const next = [payload, ...current.filter((item) => item.ticket_id !== payload.ticket_id)];
  localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  return payload;
};