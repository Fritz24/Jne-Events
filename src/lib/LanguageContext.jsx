import { createContext, useContext, useState } from "react";

const LanguageContext = createContext();

export const translations = {
  en: {
    // Nav
    home: "Home",
    events: "Events",
    login: "Login",
    logout: "Logout",
    dashboard: "Dashboard",
    // Hero
    everyWeekend: "Every Weekend",
    heroSubtitle: "Movie Nights & Live Music",
    heroDescription: "Join us every weekend for unforgettable movie nights and electrifying music events. Book your tickets instantly via WhatsApp.",
    browseEvents: "Browse Events",
    // Upcoming
    comingUp: "Coming Up",
    upcomingEvents: "Upcoming Events",
    viewAll: "View all",
    viewAllEvents: "View all events",
    book: "Book",
    tba: "TBA",
    // Events page
    eventsTitle: "Events",
    eventsSubtitle: "Discover and book your next weekend experience",
    upcomingLabel: "Upcoming",
    event: "event",
    events_plural: "events",
    pastEvents: "Past Events",
    noEvents: "No events found",
    ticketsFrom: "Tickets from",
    viewPackages: "View Ticket Packages",
    hidePackages: "Hide Packages",
    soldOut: "Sold Out",
    cancelled: "Cancelled",
    completed: "Completed",
    upcoming_status: "Upcoming",
    // Gallery
    memories: "Memories",
    pastNightouts: "Past Nightouts",
    gallerySubtitle: "A glimpse of the unforgettable moments we've created together.",
    // Footer
    allRightsReserved: "All rights reserved.",
    // SoldOut Banner
    soldOutTitle: "Officially Sold Out 🎉",
    soldOutDesc: "All 50 tickets have been claimed. Thank you for the love!",
    // Filters
    allEvents: "All Events",
    movieNights: "Movie Nights",
    music: "Music",
  },
  fr: {
    // Nav
    home: "Accueil",
    events: "Événements",
    login: "Connexion",
    logout: "Déconnexion",
    dashboard: "Tableau de bord",
    // Hero
    everyWeekend: "Chaque Week-end",
    heroSubtitle: "Soirées Cinéma & Musique Live",
    heroDescription: "Rejoignez-nous chaque week-end pour des soirées cinéma inoubliables et des concerts électrisants. Réservez vos billets instantanément via WhatsApp.",
    browseEvents: "Voir les Événements",
    // Upcoming
    comingUp: "À Venir",
    upcomingEvents: "Événements à Venir",
    viewAll: "Voir tout",
    viewAllEvents: "Voir tous les événements",
    book: "Réserver",
    tba: "À confirmer",
    // Events page
    eventsTitle: "Événements",
    eventsSubtitle: "Découvrez et réservez votre prochaine expérience du week-end",
    upcomingLabel: "À Venir",
    event: "événement",
    events_plural: "événements",
    pastEvents: "Événements Passés",
    noEvents: "Aucun événement trouvé",
    ticketsFrom: "Billets à partir de",
    viewPackages: "Voir les Forfaits",
    hidePackages: "Masquer les Forfaits",
    soldOut: "Complet",
    cancelled: "Annulé",
    completed: "Terminé",
    upcoming_status: "À Venir",
    // Gallery
    memories: "Souvenirs",
    pastNightouts: "Nos Soirées Passées",
    gallerySubtitle: "Un aperçu des moments inoubliables que nous avons créés ensemble.",
    // Footer
    allRightsReserved: "Tous droits réservés.",
    // SoldOut Banner
    soldOutTitle: "Officiellement Complet 🎉",
    soldOutDesc: "Les 50 billets ont été réclamés. Merci pour votre amour !",
    // Filters
    allEvents: "Tous les Événements",
    movieNights: "Soirées Cinéma",
    music: "Musique",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en");
  const t = translations[lang];
  const toggleLang = () => setLang(l => l === "en" ? "fr" : "en");

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}