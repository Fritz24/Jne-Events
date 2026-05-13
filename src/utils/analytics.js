import { supabase } from "@/lib/supabase";

/**
 * Log an analytics event to the jne_analytics table.
 * @param {string} type - The type of event (e.g., 'event_view', 'whatsapp_click')
 * @param {string} eventId - Unique ID of the event
 * @param {string} eventTitle - Title of the event (for easier reporting)
 */
export const logAnalyticsEvent = async (type, eventId, eventTitle) => {
    try {
        const { error } = await supabase.from('jne_analytics').insert([
            {
                type,
                event_id: eventId,
                event_title: eventTitle
            }
        ]);
        if (error) {
            console.warn("Analytics log failed (ignoring):", error.message);
        }
    } catch (err) {
        // Silent fail for analytics to not disturb user experience
        console.warn("Analytics tracking error:", err);
    }
};
