import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { Save, X, Loader2, Plus, Trash2, Check, Star, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const DRAFT_KEY = "event_form_draft";

const getLocalDatetimeLocal = (dateString) => {
  if (!dateString) return;
  const d = new Date(dateString);
  // Get components in local time and format them with padStart wrapper
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyTier = () => ({
  label: "", price: "", description: "",
  inclusions: [],
});

function buildInitialForm(event) {
  return {
    title: event?.title || "",
    title_fr: event?.title_fr || "",
    type: event?.type || "movie_night",
    description: event?.description || "",
    date: event?.date ? getLocalDatetimeLocal(event.date) : (() => { const d = new Date(); d.setHours(18, 30, 0, 0); return getLocalDatetimeLocal(d); })(),
    venue: event?.venue || "",
    venue_fr: event?.venue_fr || "",
    city: event?.city || "",
    venue_description: event?.venue_description || "",
    price: event?.price || "",
    currency: event?.currency || "XAF",
    whatsapp_number: event?.whatsapp_number || "",
    whatsapp_message: event?.whatsapp_message || "",
    featured: event?.featured || false,
    capacity: event?.capacity || "",
    status: event?.status || "upcoming",
    artist_or_movie: event?.artist_or_movie || "",
    genre: event?.genre || "",
    image_url: event?.image_url || "",
    is_recurring: event?.is_recurring || false,
    recurrence_pattern: event?.recurrence_pattern || "weekly_sunday",
  };
}

function buildInitialTiers(event) {
  return event?.ticket_tiers?.length
    ? event.ticket_tiers.map(t => {
      const incs = new Set(t.inclusions || []);
      if (t.headphones_included) incs.add("Headphones");
      if (t.seat_included) incs.add("Seat / Blanket");
      if (t.snack_included) incs.add("Popcorn / Snack");
      if (t.drink_included) incs.add("Drink");

      const { headphones_included, seat_included, snack_included, drink_included, ...rest } = t;
      return { ...emptyTier(), ...rest, price: String(t.price), inclusions: Array.from(incs) };
    })
    : [emptyTier()];
}

export default function EventForm({ event, onSave, onCancel }) {
  const isEdit = !!event;
  const draftKey = isEdit ? `${DRAFT_KEY}_${event.id}` : DRAFT_KEY;

  // Load from localStorage draft if available (only for the matching form)
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.form || buildInitialForm(event);
      }
    } catch { }
    return buildInitialForm(event);
  });

  const [tiers, setTiers] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.tiers || buildInitialTiers(event);
      }
    } catch { }
    return buildInitialTiers(event);
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [whatsappContacts, setWhatsappContacts] = useState([]); // Array of { number, label, isDefault }
  const [savedInclusions, setSavedInclusions] = useState([]); // Array of strings
  const [templates, setTemplates] = useState([]);

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'event_categories')
        .maybeSingle();
      return data?.value ? JSON.parse(data.value) : [
        { id: "movie_night", label: "Movie Night" },
        { id: "music", label: "Music Event" }
      ];
    }
  });

  // Fetch saved numbers and set default
  useEffect(() => {
    async function fetchContacts() {
      const { data } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'whatsapp_contacts')
        .maybeSingle();

      const contacts = data?.value ? JSON.parse(data.value) : [];
      setWhatsappContacts(contacts);

      if (!isEdit && !form.whatsapp_number) {
        const defaultContact = contacts.find(c => c.isDefault) || contacts[0];
        if (defaultContact) {
          handleChange("whatsapp_number", defaultContact.number);
        }
      }
    }
    fetchContacts();
  }, [isEdit]);

  const handleAddNumber = async (number) => {
    if (!number || whatsappContacts.some(c => c.number === number)) return;
    const newContacts = [...whatsappContacts, { number, label: number, isDefault: whatsappContacts.length === 0 }];
    const { error } = await supabase
      .from('jne_settings')
      .upsert({ key: 'whatsapp_contacts', value: JSON.stringify(newContacts), updated_at: new Date().toISOString() });
    if (!error) setWhatsappContacts(newContacts);
  };

  const handleRemoveNumber = async (number) => {
    const newContacts = whatsappContacts.filter(c => c.number !== number);
    const { error } = await supabase
      .from('jne_settings')
      .upsert({ key: 'whatsapp_contacts', value: JSON.stringify(newContacts), updated_at: new Date().toISOString() });
    if (!error) setWhatsappContacts(newContacts);
    if (form.whatsapp_number === number) handleChange("whatsapp_number", "");
  };

  const setAsDefault = async (number) => {
    const newContacts = whatsappContacts.map(c => ({ ...c, isDefault: c.number === number }));
    const { error } = await supabase
      .from('jne_settings')
      .upsert({ key: 'whatsapp_contacts', value: JSON.stringify(newContacts), updated_at: new Date().toISOString() });
    if (!error) setWhatsappContacts(newContacts);
  };

  // Fetch saved inclusions
  useEffect(() => {
    async function fetchInclusions() {
      const { data } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'ticket_inclusions')
        .maybeSingle();

      if (data?.value) {
        setSavedInclusions(JSON.parse(data.value));
      } else {
        // Defaults if none exist
        const defaults = ["Headphones", "Seat / Blanket", "Popcorn / Snack", "Drink"];
        setSavedInclusions(defaults);
        await supabase.from('jne_settings').upsert({ key: 'ticket_inclusions', value: JSON.stringify(defaults) });
      }
    }
    fetchInclusions();
  }, []);

  const handleUpdateSavedInclusions = async (newInclusions) => {
    const { error } = await supabase
      .from('jne_settings')
      .upsert({
        key: 'ticket_inclusions',
        value: JSON.stringify(newInclusions),
        updated_at: new Date().toISOString()
      });
    if (!error) setSavedInclusions(newInclusions);
  };

  const handleAddInclusionToTier = (tierIdx, value) => {
    const val = value.trim();
    if (!val) return;

    const current = tiers[tierIdx].inclusions || [];
    if (!current.includes(val)) {
      handleTierChange(tierIdx, "inclusions", [...current, val]);

      // Also save to suggestions if not already there
      if (!savedInclusions.some(inc => inc.toLowerCase() === val.toLowerCase())) {
        handleUpdateSavedInclusions([...savedInclusions, val]);
      }
    }
  };

  const removeSavedInclusion = (incToRemove) => {
    handleUpdateSavedInclusions(savedInclusions.filter(inc => inc !== incToRemove));
  };

  // Fetch saved templates
  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'event_templates')
        .maybeSingle();

      if (data?.value) {
        setTemplates(JSON.parse(data.value));
      }
    }
    fetchTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    const name = prompt("Enter a name for this template:");
    if (!name || !name.trim()) return;

    const templateForm = {
      ...form,
      date: "",
    };

    const newTemplate = {
      id: `${Date.now()}`,
      name: name.trim(),
      form: templateForm,
      tiers
    };

    const updated = [...templates, newTemplate];
    const { error } = await supabase
      .from('jne_settings')
      .upsert({
        key: 'event_templates',
        value: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setTemplates(updated);
      alert(`Template "${name}" saved successfully!`);
    } else {
      alert("Failed to save template: " + error.message);
    }
  };

  const handleLoadTemplate = (template) => {
    setForm(prev => ({
      ...template.form,
      date: prev.date || buildInitialForm(event).date,
    }));
    setTiers(template.tiers);
  };

  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;

    const updated = templates.filter(t => t.id !== id);
    const { error } = await supabase
      .from('jne_settings')
      .upsert({
        key: 'event_templates',
        value: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setTemplates(updated);
    } else {
      alert("Failed to delete template: " + error.message);
    }
  };

  // Auto-generate WhatsApp message behind the scenes
  useEffect(() => {
    const dateObj = form.date ? new Date(form.date) : null;
    const dateFormatted = dateObj && !isNaN(dateObj) ? format(dateObj, "EEE, MMM d") : "";
    const timeFormatted = dateObj && !isNaN(dateObj) ? format(dateObj, "HH:mm") : "";

    // Attempt to find category label
    const cat = categories?.find(c => c.id === form.type);
    const typeLabel = cat ? cat.label : (form.type?.toLowerCase().includes("movie") ? "Movie Night" : "Event");

    const newMsg = `Hi! I'd like to book tickets for *${form.title || "your event"}* (${typeLabel})${dateFormatted ? ` on ${dateFormatted} at ${timeFormatted}` : ""}. Please let me know how to proceed. 🎟️`;

    if (form.whatsapp_message !== newMsg) {
      setForm(prev => ({ ...prev, whatsapp_message: newMsg }));
    }
  }, [form.title, form.date, form.type, categories]);

  // Auto-save draft to localStorage on every change
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify({ form, tiers }));
  }, [form, tiers, draftKey]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTierChange = (index, field, value) => {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const addTier = () => setTiers(prev => [...prev, emptyTier()]);
  const removeTier = (index) => setTiers(prev => prev.filter((_, i) => i !== index));

  const [uploadError, setUploadError] = useState("");

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");

    // Limit to 4MB
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("Image too large. Please use an image under 4MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // Use Cloudinary if configured
    if (cloudName && uploadPreset) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.secure_url) {
          handleChange("image_url", data.secure_url);
        } else {
          throw new Error(data.error?.message || "Cloudinary upload failed");
        }
      } catch (err) {
        setUploadError(err.message);
      }
    } else {
      // Fallback: Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('events')
        .upload(fileName, file);

      if (uploadError) {
        setUploadError("Upload failed: " + uploadError.message);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('events')
          .getPublicUrl(fileName);
        handleChange("image_url", publicUrl);
      }
    }
    setUploading(false);
  };

  const clearDraft = () => localStorage.removeItem(draftKey);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      ...form,
      price: form.price !== "" && form.price !== null ? Number(form.price) : 0,
      capacity: form.capacity ? Number(form.capacity) : undefined,
      date: form.date ? new Date(form.date).toISOString() : undefined,
      ticket_tiers: tiers
        .filter(t => t.label && t.price !== "" && t.price !== null && t.price !== undefined)
        .map(t => ({ ...t, price: Number(t.price) })),
    };

    if (isEdit) {
      const { error } = await supabase
        .from('jne_events')
        .update(data)
        .eq('id', event.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('jne_events')
        .insert([data]);
      if (error) throw error;
    }
    clearDraft();
    setSaving(false);
    onSave();
  };

  const handleCancel = () => {
    clearDraft();
    onCancel();
  };

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-violet-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Templates Management Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 shadow-inner">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-white">Event Templates</h4>
          <p className="text-xs text-white/40">Pre-fill form and ticket tiers using a saved configuration template</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {templates.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs px-3 py-1.5 h-auto">
                  Load Template ({templates.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#111118] border-white/10 text-white">
                <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-wider">Available Templates</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between group px-1">
                    <DropdownMenuItem
                      onClick={() => handleLoadTemplate(t)}
                      className="flex-1 focus:bg-violet-500/10 focus:text-white cursor-pointer text-sm font-medium py-2"
                    >
                      {t.name}
                    </DropdownMenuItem>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteTemplate(e, t.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity pr-2"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            type="button"
            onClick={handleSaveTemplate}
            className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs px-3 py-1.5 h-auto"
          >
            Save as Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Title (English) *</Label>
          <Input className={inputClass} value={form.title} onChange={e => handleChange("title", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Type *</Label>
          <Select value={form.type} onValueChange={v => handleChange("type", v)}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="space-y-2 sm:col-span-2">
          <p className="text-xs font-semibold text-violet-300 uppercase tracking-wider">French translations (optional)</p>
          <p className="text-xs text-white/40">Shown when visitors switch the site to FR. Leave blank to use the English title/venue.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Title (Français)</Label>
          <Input className={inputClass} value={form.title_fr} onChange={e => handleChange("title_fr", e.target.value)} placeholder="e.g. Soirée cinéma sous les étoiles" />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Venue (Français)</Label>
          <Input className={inputClass} value={form.venue_fr} onChange={e => handleChange("venue_fr", e.target.value)} placeholder="e.g. L'Hippodrome The Nest" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Artist / Movie</Label>
          <Input className={inputClass} value={form.artist_or_movie} onChange={e => handleChange("artist_or_movie", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Genre</Label>
          <Input className={inputClass} value={form.genre} onChange={e => handleChange("genre", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Main Description (SEO & Website)</Label>
          <Textarea className={inputClass} rows={3} value={form.description} onChange={e => handleChange("description", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Date & Time *</Label>
          <Input type="datetime-local" className={inputClass} value={form.date} onChange={e => handleChange("date", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">City *</Label>
          <Input className={inputClass} value={form.city} onChange={e => handleChange("city", e.target.value)} placeholder="e.g. Douala, Yaoundé" required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Venue (English) *</Label>
          <Input className={inputClass} value={form.venue} onChange={e => handleChange("venue", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Capacity</Label>
          <Input type="number" className={inputClass} value={form.capacity} onChange={e => handleChange("capacity", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Currency *</Label>
          <Input className={inputClass} value={form.currency} onChange={e => handleChange("currency", e.target.value)} placeholder="XAF" required />
        </div>
        {isEdit && (
          <div className="space-y-2">
            <Label className="text-white/70">Status</Label>
            <Select value={form.status} onValueChange={v => handleChange("status", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="sold_out">Sold Out</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Ticket Tiers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-white/70 text-base">Ticket Tiers</Label>
          <Button type="button" size="sm" onClick={addTier} className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Tier
          </Button>
        </div>

        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50 font-medium">Tier {i + 1}</span>
                {tiers.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTier(i)}
                    className="w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Label *</Label>
                  <Input className={inputClass} placeholder="e.g. Standard, VIP, Date Night" value={tier.label}
                    onChange={e => handleTierChange(i, "label", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/50 text-xs">Price *</Label>
                  <Input type="number" step="0.01" className={inputClass} placeholder="0" value={tier.price}
                    onChange={e => handleTierChange(i, "price", e.target.value)} />
                  <p className="text-[10px] text-violet-400 font-medium">Set price to 0 to make this tier free</p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Tier Highlight</Label>
                <Input className={inputClass} placeholder="e.g. Best for groups, Limited offer..." value={tier.description || ""}
                  onChange={e => handleTierChange(i, "description", e.target.value)} />
              </div>

              {/* Dynamic Inclusions input */}
              <div className="space-y-2 pt-2 border-t border-white/5 mt-2">
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest px-1">Included with this tier:</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(tier.inclusions || []).map((inc, incIdx) => (
                    <div key={incIdx} className="flex items-center gap-1.5 text-xs text-white/80 bg-white/5 pl-2 pr-1 py-1 rounded-md border border-white/10">
                      {inc}
                      <button
                        type="button"
                        onClick={() => handleTierChange(i, "inclusions", tier.inclusions.filter((_, idx) => idx !== incIdx))}
                        className="hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded h-4 w-4 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(tier.inclusions || []).length === 0 && (
                    <p className="text-xs text-white/20 italic p-1">No inclusions added</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="E.g. Headphones, Drink, Seat (Press Enter)"
                    className="h-9 text-sm bg-white/5 border-white/10 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInclusionToTier(i, e.target.value);
                        e.target.value = "";
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 shrink-0 border-dashed border-white/20 hover:bg-white/10 text-white bg-transparent shadow-none"
                    onClick={(e) => {
                      const input = e.currentTarget.previousElementSibling;
                      handleAddInclusionToTier(i, input.value);
                      input.value = "";
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Add
                  </Button>
                </div>

                {/* Suggestions / Saved Inclusions */}
                {savedInclusions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <p className="w-full text-[9px] text-white/20 uppercase tracking-tighter mb-0.5">Quick Add Suggestions:</p>
                    {savedInclusions.map((inc, sIdx) => {
                      const isAlreadyAdded = (tier.inclusions || []).includes(inc);
                      return (
                        <div key={sIdx} className="group/s relative flex items-center">
                          <button
                            type="button"
                            disabled={isAlreadyAdded}
                            onClick={() => handleAddInclusionToTier(i, inc)}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${isAlreadyAdded
                              ? "bg-white/5 border-white/5 text-white/20 cursor-default"
                              : "bg-violet-500/5 border-violet-500/20 text-violet-300/70 hover:bg-violet-500/20 hover:border-violet-500/40 hover:text-violet-200"
                              }`}
                          >
                            {inc}
                          </button>
                          {!isAlreadyAdded && (
                            <button
                              type="button"
                              onClick={() => removeSavedInclusion(inc)}
                              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/s:opacity-100 transition-opacity hover:bg-red-600 scale-75"
                              title="Remove from suggestions"
                            >
                              <X className="w-2 h-2" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex justify-between items-center">
            <Label className="text-white/70">WhatsApp Booking Contact *</Label>
            {form.whatsapp_number && !whatsappContacts.some(c => c.number === form.whatsapp_number) && (
              <button
                type="button"
                onClick={() => handleAddNumber(form.whatsapp_number)}
                className="text-[10px] text-violet-400 hover:underline uppercase tracking-tighter"
              >
                + Save as a new contact
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                className={inputClass}
                value={form.whatsapp_number}
                onChange={e => handleChange("whatsapp_number", e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shrink-0 bg-white/5 border-white/10 hover:bg-white/10 border-dashed px-3">
                  <Users className="w-4 h-4 mr-2" />
                  Contacts
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111118] border-white/10 text-white">
                <DropdownMenuLabel className="text-white/40 text-[10px] uppercase tracking-tighter">Saved Numbers</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/5" />

                {whatsappContacts.length === 0 && (
                  <div className="p-3 text-xs text-white/30 italic">No saved contacts yet</div>
                )}

                {whatsappContacts.map(c => (
                  <div key={c.number} className="flex items-center group px-1">
                    <DropdownMenuItem
                      className="flex-1 focus:bg-violet-500/10 focus:text-white cursor-pointer"
                      onClick={() => handleChange("whatsapp_number", c.number)}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{c.number}</span>
                        {c.isDefault && <span className="text-[9px] text-emerald-400 flex items-center gap-1"><Star className="w-2 h-2 fill-emerald-400" /> Primary Default</span>}
                      </div>
                      {form.whatsapp_number === c.number && <Check className="w-3 h-3 ml-auto text-violet-400" />}
                    </DropdownMenuItem>

                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity pr-2 gap-1">
                      {!c.isDefault && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setAsDefault(c.number); }}
                          className="p-1.5 rounded hover:bg-white/10 text-amber-500 transition-colors"
                          title="Set as Default"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveNumber(c.number); }}
                        className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                        title="Delete Contact"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="text-[10px] text-white/20 italic">Select a contact from the dropdown or type a new one manually.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/70">Event Image</Label>
        {form.image_url && (
          <img src={form.image_url} alt="Preview" className="w-32 h-20 object-cover rounded-lg mb-2" />
        )}
        <Input type="file" accept="image/*" onChange={handleImageUpload} className={inputClass} />
        {uploading && <p className="text-sm text-violet-400">Uploading...</p>}
        {uploadError && <p className="text-sm text-red-400">{uploadError}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={form.featured} onCheckedChange={v => handleChange("featured", v)} />
        <Label className="text-white/70">Featured Event</Label>
      </div>

      <div className="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-3">
          <Switch checked={form.is_recurring} onCheckedChange={v => handleChange("is_recurring", v)} />
          <div>
            <Label className="text-white/70">Recurring Event Template</Label>
            <p className="text-[10px] text-white/35">Mark this event as a template that posts itself automatically on a set schedule.</p>
          </div>
        </div>

        {form.is_recurring && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label className="text-white/50 text-xs">Recurrence Schedule</Label>
            <Select value={form.recurrence_pattern} onValueChange={v => handleChange("recurrence_pattern", v)}>
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
                <SelectItem value="weekly_sunday">Every Sunday</SelectItem>
                <SelectItem value="weekly_monday">Every Monday</SelectItem>
                <SelectItem value="weekly_tuesday">Every Tuesday</SelectItem>
                <SelectItem value="weekly_wednesday">Every Wednesday</SelectItem>
                <SelectItem value="weekly_thursday">Every Thursday</SelectItem>
                <SelectItem value="weekly_friday">Every Friday</SelectItem>
                <SelectItem value="weekly_saturday">Every Saturday</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-violet-400/80">The system cron job checks this schedule daily and posts a concrete copy of this event template automatically.</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
        <Button type="button" variant="ghost" onClick={handleCancel} className="text-white/60 hover:text-white hover:bg-white/5">
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isEdit ? "Update Event" : "Create Event"}
        </Button>
      </div>
    </form>
  );
}