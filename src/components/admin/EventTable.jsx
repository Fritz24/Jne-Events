import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Film, Music, Pencil, Trash2, Star, Ticket } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import TicketGenerator from "./TicketGenerator";

const statusColors = {
  upcoming: "bg-emerald-500/15 text-emerald-300",
  ongoing: "bg-amber-500/15 text-amber-300",
  sold_out: "bg-red-500/15 text-red-300",
  cancelled: "bg-gray-500/15 text-gray-400",
  completed: "bg-blue-500/15 text-blue-300",
};

export default function EventTable({ events, onEdit, onDelete }) {
  const [ticketEvent, setTicketEvent] = useState(null);

  if (!events?.length) {
    return (
      <div className="text-center py-16 text-white/30">
        No events yet. Create your first event!
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 text-left text-sm text-white/30">
              <th className="pb-3 pl-3 font-medium">Event</th>
              <th className="pb-3 font-medium hidden sm:table-cell">Date</th>
              <th className="pb-3 font-medium hidden md:table-cell">Venue</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 pr-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {events.map(event => {
              const isMovie = event.type === "movie_night";
              const Icon = isMovie ? Film : Music;
              return (
                <tr key={event.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isMovie ? "bg-amber-500/10" : "bg-violet-500/10"
                        }`}>
                        <Icon className={`w-4 h-4 ${isMovie ? "text-amber-400" : "text-violet-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{event.title}</span>
                          {event.featured && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                        </div>
                        {event.artist_or_movie && (
                          <span className="text-xs text-white/30">{event.artist_or_movie}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-white/50 hidden sm:table-cell">
                    {event.date ? format(new Date(event.date), "MMM d, h:mm a") : "TBA"}
                  </td>
                  <td className="py-3 text-sm text-white/50 hidden md:table-cell">{event.venue}</td>
                  <td className="py-3 text-sm font-medium text-white">
                    {(() => {
                      const tiers = event.ticket_tiers || [];
                      if (tiers.length > 0) {
                        const minPrice = Math.min(...tiers.map(t => t.price || 0));
                        const maxPrice = Math.max(...tiers.map(t => t.price || 0));
                        if (minPrice === maxPrice) return `${event.currency || "XAF"} ${minPrice.toLocaleString()}`;
                        return `From ${event.currency || "XAF"} ${minPrice.toLocaleString()}`;
                      }
                      return `${event.currency || "XAF"} ${(event.price || 0).toLocaleString()}`;
                    })()}
                  </td>
                  <td className="py-3">
                    <Badge className={`${statusColors[event.status] || statusColors.upcoming} text-xs`}>
                      {(event.status || "upcoming").replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setTicketEvent(event)}
                        className="w-8 h-8 text-white/40 hover:text-violet-400 hover:bg-violet-500/10"
                        title="Generate Ticket"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(event)}
                        className="w-8 h-8 text-white/40 hover:text-white hover:bg-white/5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{event.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(event.id)}
                              className="bg-red-600 hover:bg-red-500"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ticketEvent && (
        <TicketGenerator event={ticketEvent} onClose={() => setTicketEvent(null)} />
      )}
    </>
  );
}