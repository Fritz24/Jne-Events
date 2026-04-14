import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { Save, X, Loader2, Plus, Trash2 } from "lucide-react";

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
  headphones_included: false,
  seat_included: false,
  snack_included: false,
  drink_included: false,
});

function buildInitialForm(event) {
  return {
    title: event?.title || "",
    type: event?.type || "movie_night",
    description: event?.description || "",
    date: event?.date ? getLocalDatetimeLocal(event.date) : (() => { const d = new Date(); d.setHours(18, 30, 0, 0); return getLocalDatetimeLocal(d); })(),
    venue: event?.venue || "",
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
  };
}

function buildInitialTiers(event) {
  return event?.ticket_tiers?.length
    ? event.ticket_tiers.map(t => ({ ...emptyTier(), ...t, price: String(t.price) }))
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
      price: Number(form.price),
      capacity: form.capacity ? Number(form.capacity) : undefined,
      date: form.date ? new Date(form.date).toISOString() : undefined,
      ticket_tiers: tiers
        .filter(t => t.label && t.price)
        .map(t => ({ ...t, price: Number(t.price) })),
    };

    if (isEdit) {
      const { error } = await supabase
        .from('Event')
        .update(data)
        .eq('id', event.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('Event')
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

  const TierToggle = ({ tier, index, field, label }) => (
    <div className="flex items-center gap-2">
      <Switch
        checked={!!tier[field]}
        onCheckedChange={v => handleTierChange(index, field, v)}
      />
      <Label className="text-white/50 text-xs">{label}</Label>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Title *</Label>
          <Input className={inputClass} value={form.title} onChange={e => handleChange("title", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Type *</Label>
          <Select value={form.type} onValueChange={v => handleChange("type", v)}>
            <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="movie_night">Movie Night</SelectItem>
              <SelectItem value="music">Music</SelectItem>
            </SelectContent>
          </Select>
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

      <div className="space-y-2">
        <Label className="text-white/70">Description</Label>
        <Textarea className={inputClass} rows={3} value={form.description} onChange={e => handleChange("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Date & Time *</Label>
          <Input type="datetime-local" className={inputClass} value={form.date} onChange={e => handleChange("date", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Venue *</Label>
          <Input className={inputClass} value={form.venue} onChange={e => handleChange("venue", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Capacity</Label>
          <Input type="number" className={inputClass} value={form.capacity} onChange={e => handleChange("capacity", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Base Price (fallback)</Label>
          <Input type="number" step="0.01" className={inputClass} value={form.price} onChange={e => handleChange("price", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Currency</Label>
          <Input className={inputClass} value={form.currency} onChange={e => handleChange("currency", e.target.value)} placeholder="XAF" />
        </div>
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
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white/50 text-xs">Description</Label>
                <Input className={inputClass} placeholder="What's included..." value={tier.description || ""}
                  onChange={e => handleTierChange(i, "description", e.target.value)} />
              </div>

              {/* Inclusions toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <TierToggle tier={tier} index={i} field="headphones_included" label="Headphones" />
                <TierToggle tier={tier} index={i} field="seat_included" label="Seat / Blanket" />
                <TierToggle tier={tier} index={i} field="snack_included" label="Snack" />
                <TierToggle tier={tier} index={i} field="drink_included" label="Drink" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">WhatsApp Number * (with country code)</Label>
          <Input className={inputClass} value={form.whatsapp_number} onChange={e => handleChange("whatsapp_number", e.target.value)} placeholder="+1234567890" required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">WhatsApp Pre-filled Message</Label>
          <Input className={inputClass} value={form.whatsapp_message} onChange={e => handleChange("whatsapp_message", e.target.value)} placeholder="Hi! I'd like to book..." />
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