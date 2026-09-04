import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, X, Loader2, Plus, Trash2, Check, Star, Users, Calendar, Clock, Repeat, ArrowRight, Info, Sparkles, CheckCircle2, Languages } from "lucide-react";
import { translateAsync } from "@/lib/translator";
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
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyTier = () => ({
  label: "", price: "", description: "",
  inclusions: [],
});

function getUpcomingRecurrencePreview(startDateStr, formState, count = 4) {
  if (!startDateStr) return [];
  const baseDate = new Date(startDateStr);
  if (isNaN(baseDate.getTime())) return [];

  const interval = Math.max(1, Number(formState.recurrence_interval || 1));
  const unit = formState.recurrence_unit || "weeks";
  const results = [new Date(baseDate)];

  const maxLookahead = 300;
  let iterations = 0;

  if (unit === "days") {
    let cur = new Date(baseDate);
    while (results.length < count && iterations < maxLookahead) {
      iterations++;
      cur = new Date(cur.getTime() + interval * 24 * 60 * 60 * 1000);
      results.push(new Date(cur));
    }
  } else if (unit === "weeks") {
    const rawDays = Array.isArray(formState.recurrence_days)
      ? formState.recurrence_days
      : typeof formState.recurrence_days === "string"
      ? formState.recurrence_days.split(",")
      : [];
    const targetDays = rawDays.length > 0 ? rawDays.map(s => Number(String(s).trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6) : [baseDate.getDay()];

    if (targetDays.length === 1 && targetDays[0] === baseDate.getDay()) {
      let cur = new Date(baseDate);
      while (results.length < count && iterations < maxLookahead) {
        iterations++;
        cur = new Date(cur.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
        results.push(new Date(cur));
      }
    } else {
      let currentWeekSunday = new Date(baseDate);
      currentWeekSunday.setDate(currentWeekSunday.getDate() - currentWeekSunday.getDay());

      let weekOffset = 0;
      while (results.length < count && iterations < maxLookahead) {
        iterations++;
        for (const dayIdx of targetDays.slice().sort((a, b) => a - b)) {
          const candidate = new Date(currentWeekSunday);
          candidate.setDate(currentWeekSunday.getDate() + (weekOffset * 7) + dayIdx);
          candidate.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);

          if (candidate > baseDate && !results.some(r => r.getTime() === candidate.getTime())) {
            results.push(candidate);
            if (results.length >= count) break;
          }
        }
        weekOffset += interval;
      }
    }
  } else if (unit === "months") {
    const monthMode = formState.recurrence_month_mode || "same_date";
    let monthOffset = interval;

    while (results.length < count && iterations < maxLookahead) {
      iterations++;
      const targetYear = baseDate.getFullYear();
      const targetMonth = baseDate.getMonth() + monthOffset;
      const targetHours = baseDate.getHours();
      const targetMinutes = baseDate.getMinutes();

      if (monthMode === "same_date") {
        const targetDay = baseDate.getDate();
        const d = new Date(targetYear, targetMonth, targetDay, targetHours, targetMinutes, 0, 0);
        const expectedMonth = ((targetMonth % 12) + 12) % 12;
        if (d.getMonth() !== expectedMonth) {
          const lastDay = new Date(targetYear, targetMonth + 1, 0, targetHours, targetMinutes, 0, 0);
          results.push(lastDay);
        } else {
          results.push(d);
        }
      } else {
        const dayOfWeek = baseDate.getDay();
        const nthWeek = Math.floor((baseDate.getDate() - 1) / 7) + 1;
        let found = null;
        let c = 0;
        for (let day = 1; day <= 31; day++) {
          const testD = new Date(targetYear, targetMonth, day, targetHours, targetMinutes, 0, 0);
          const expMonth = ((targetMonth % 12) + 12) % 12;
          if (testD.getMonth() !== expMonth) break;
          if (testD.getDay() === dayOfWeek) {
            c++;
            if (c === nthWeek) {
              found = testD;
              break;
            }
            found = testD;
          }
        }
        if (found) results.push(found);
      }
      monthOffset += interval;
    }
  }

  return results.slice(0, count);
}

function buildInitialForm(event) {
  const initialDate = event?.date ? getLocalDatetimeLocal(event.date) : (() => { const d = new Date(); d.setHours(18, 30, 0, 0); return getLocalDatetimeLocal(d); })();
  const parsedDate = new Date(initialDate);
  const defaultDayOfWeek = !isNaN(parsedDate.getTime()) ? String(parsedDate.getDay()) : "0";

  let defaultDays = [defaultDayOfWeek];
  if (event?.recurrence_days) {
    if (Array.isArray(event.recurrence_days)) {
      defaultDays = event.recurrence_days.map(String);
    } else if (typeof event.recurrence_days === "string") {
      defaultDays = event.recurrence_days.split(",").map(s => s.trim()).filter(Boolean);
    }
  } else if (event?.recurrence_day !== undefined && event?.recurrence_day !== null) {
    defaultDays = [String(event.recurrence_day)];
  }

  let defaultUnit = event?.recurrence_unit || "weeks";
  if (!event?.recurrence_unit && event?.recurrence_freq) {
    if (event.recurrence_freq === "weekly" || event.recurrence_freq === "biweekly") defaultUnit = "weeks";
    else if (event.recurrence_freq === "monthly") defaultUnit = "months";
  }

  let defaultInterval = event?.recurrence_interval || (event?.recurrence_freq === "biweekly" ? 2 : 1);

  return {
    title: event?.title || "",
    title_fr: event?.title_fr || "",
    type: event?.type || "movie_night",
    description: event?.description || "",
    description_fr: event?.description_fr || "",
    date: initialDate,
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
    genre_fr: event?.genre_fr || "",
    image_url: event?.image_url || "",
    is_recurring: !!event?.is_recurring,
    recurrence_interval: defaultInterval,
    recurrence_unit: defaultUnit,
    recurrence_days: defaultDays,
    recurrence_month_mode: event?.recurrence_month_mode || "same_date",
    recurrence_lead_days: event?.recurrence_lead_days || 14,
    recurrence_end_type: event?.recurrence_end_type || "never",
    recurrence_count: event?.recurrence_count || 10,
    recurrence_until: event?.recurrence_until || "",
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
    const initial = buildInitialForm(event);
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.form) {
          return {
            ...initial,
            ...parsed.form,
            recurrence_interval: parsed.form.recurrence_interval || initial.recurrence_interval || 1,
            recurrence_unit: parsed.form.recurrence_unit || initial.recurrence_unit || "weeks",
            recurrence_days: Array.isArray(parsed.form.recurrence_days) ? parsed.form.recurrence_days : initial.recurrence_days || ["0"],
            recurrence_month_mode: parsed.form.recurrence_month_mode || initial.recurrence_month_mode || "same_date",
            recurrence_lead_days: parsed.form.recurrence_lead_days || initial.recurrence_lead_days || 14,
            recurrence_end_type: parsed.form.recurrence_end_type || initial.recurrence_end_type || "never",
          };
        }
      }
    } catch { }
    return initial;
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
  const [isTranslating, setIsTranslating] = useState(false);
  const [formError, setFormError] = useState("");
  const [whatsappContacts, setWhatsappContacts] = useState([]); // Array of { number, label, isDefault }
  const [savedInclusions, setSavedInclusions] = useState([]); // Array of strings
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["event_categories"],
    queryFn: async () => {
      const defaults = [
        { id: "movie_night", label: "Movie Night" },
        { id: "music", label: "Music Event" }
      ];

      try {
        const { data } = await supabase
          .from('jne_settings')
          .select('value')
          .eq('key', 'event_categories')
          .maybeSingle();

        if (data?.value) {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const list = parsed.map(c => {
              if (typeof c === 'string') return { id: c.trim(), label: c.trim() };
              const id = (c.id || c.label || "").trim();
              const label = (c.label || c.id || "").trim();
              return { id, label };
            }).filter(c => c.id && c.label);

            // Merge defaults and custom categories
            const merged = [...defaults];
            list.forEach(item => {
              const exists = merged.some(m => m.id.toLowerCase().replace(/[^a-z0-9]/g, '') === item.id.toLowerCase().replace(/[^a-z0-9]/g, ''));
              if (!exists) {
                merged.push(item);
              }
            });
            return merged;
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
      return defaults;
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
    setActiveTemplateId(template.id);
  };

  const handleUpdateTemplate = async () => {
    if (!activeTemplateId) return;
    const template = templates.find(t => t.id === activeTemplateId);
    if (!template) return;

    const templateForm = {
      ...form,
      date: "",
    };

    const updatedTemplate = {
      ...template,
      form: templateForm,
      tiers
    };

    const updatedTemplatesList = templates.map(t => t.id === activeTemplateId ? updatedTemplate : t);

    const { error } = await supabase
      .from('jne_settings')
      .upsert({
        key: 'event_templates',
        value: JSON.stringify(updatedTemplatesList),
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setTemplates(updatedTemplatesList);
      alert(`Template "${template.name}" updated successfully with current changes!`);
    } else {
      alert("Failed to update template: " + error.message);
    }
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
      if (activeTemplateId === id) {
        setActiveTemplateId(null);
      }
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

  const handleChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === "date" && value) {
        const newD = new Date(value);
        if (!isNaN(newD.getTime())) {
          updated.recurrence_days = [String(newD.getDay())];
        }
      }
      return updated;
    });
  };

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
    setFormError("");

    try {
      const intervalNum = Math.max(1, Number(form.recurrence_interval || 1));
      const rawDays = Array.isArray(form.recurrence_days)
        ? form.recurrence_days
        : typeof form.recurrence_days === "string"
        ? form.recurrence_days.split(",")
        : [];
      const primaryDay = rawDays.length > 0 ? Number(rawDays[0]) : 0;

      const daysOfWeekNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      let legacyPattern = `weekly_${daysOfWeekNames[primaryDay] || "sunday"}`;
      if (form.recurrence_unit === "weeks" && intervalNum === 2) {
        legacyPattern = `biweekly_${daysOfWeekNames[primaryDay] || "sunday"}`;
      } else if (form.recurrence_unit === "months") {
        legacyPattern = `monthly_${form.recurrence_month_mode || "same_date"}`;
      }

      // Explicitly construct the exact payload recognized by Supabase jne_events table
      const data = {
        title: form.title || "",
        title_fr: form.title_fr || null,
        type: form.type || "movie_night",
        description: form.description || "",
        date: form.date ? new Date(form.date).toISOString() : null,
        venue: form.venue || "",
        venue_fr: form.venue_fr || null,
        city: form.city || null,
        venue_description: form.venue_description || null,
        price: form.price !== "" && form.price !== null ? Number(form.price) : 0,
        currency: form.currency || "XAF",
        whatsapp_number: form.whatsapp_number || null,
        whatsapp_message: form.whatsapp_message || null,
        featured: !!form.featured,
        capacity: form.capacity ? Number(form.capacity) : null,
        status: form.status || "upcoming",
        artist_or_movie: form.artist_or_movie || null,
        genre: form.genre || null,
        image_url: form.image_url || null,
        is_recurring: !!form.is_recurring,
        recurrence_pattern: form.is_recurring ? legacyPattern : null,
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
      onSave();
    } catch (err) {
      console.error("Failed to save event:", err);
      setFormError(err.message || "Failed to save event. Please check required fields.");
    } finally {
      setSaving(false);
    }
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
          {activeTemplateId ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-violet-300 font-bold bg-violet-500/15 border border-violet-500/20 rounded-lg px-2 py-1 max-w-[140px] truncate">
                Editing: {templates.find(t => t.id === activeTemplateId)?.name}
              </span>
              <Button
                type="button"
                onClick={handleUpdateTemplate}
                className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1.5 h-auto font-semibold"
                title="Overwrite the active template with current form details"
              >
                Update Template
              </Button>
              <Button
                type="button"
                onClick={handleSaveTemplate}
                className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs px-2.5 py-1.5 h-auto"
                title="Save as a new separate template"
              >
                Save as New
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTemplateId(null)}
                variant="ghost"
                className="text-white/40 hover:text-white hover:bg-white/5 text-xs px-2 py-1.5 h-auto"
              >
                Unlink
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSaveTemplate}
              className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-xs px-3 py-1.5 h-auto"
            >
              Save as Template
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-white/70">Title (English) *</Label>
          <Input className={inputClass} value={form.title} onChange={e => handleChange("title", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Type *</Label>
          <Select 
            value={form.type || "movie_night"} 
            onValueChange={v => handleChange("type", v)}
          >
            <SelectTrigger className={`${inputClass} flex items-center justify-between cursor-pointer`}>
              <SelectValue placeholder="Select event type..." />
            </SelectTrigger>
            <SelectContent className="bg-[#14141c] border border-white/10 text-white shadow-2xl z-[150] rounded-xl">
              {categories.map(cat => (
                <SelectItem 
                  key={cat.id} 
                  value={cat.id}
                  className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg text-sm text-white/90 py-2 px-3 transition-colors"
                >
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* French Translation Box with Auto-Translate Button */}
      <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-violet-500/10">
          <div>
            <p className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-violet-400" />
              French Translations (Automated)
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              Displayed when visitors switch language to FR. You can auto-generate or customize below.
            </p>
          </div>
          <Button
            type="button"
            onClick={async () => {
              setIsTranslating(true);
              try {
                const [tTitle, tVenue, tDesc] = await Promise.all([
                  form.title ? translateAsync(form.title, "fr", "en") : "",
                  form.venue ? translateAsync(form.venue, "fr", "en") : "",
                  form.description ? translateAsync(form.description, "fr", "en") : "",
                ]);
                setForm(prev => ({
                  ...prev,
                  title_fr: tTitle || prev.title_fr,
                  venue_fr: tVenue || prev.venue_fr,
                  description_fr: tDesc || prev.description_fr,
                }));
              } catch (err) {
                console.error("Auto translation error:", err);
              } finally {
                setIsTranslating(false);
              }
            }}
            disabled={isTranslating || (!form.title && !form.description && !form.venue)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-3.5 py-1.5 h-8 rounded-xl shrink-0 flex items-center gap-1.5 shadow-lg shadow-violet-950/40"
          >
            {isTranslating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            {isTranslating ? "Translating..." : "Auto-Translate to French"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Titre (Français)</Label>
            <Input className={inputClass} value={form.title_fr} onChange={e => handleChange("title_fr", e.target.value)} placeholder="e.g. Soirée cinéma sous les étoiles" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs">Lieu / Salle (Français)</Label>
            <Input className={inputClass} value={form.venue_fr} onChange={e => handleChange("venue_fr", e.target.value)} placeholder="e.g. L'Hippodrome The Nest" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-white/70 text-xs">Description (Français)</Label>
            <Textarea className={inputClass} rows={2} value={form.description_fr} onChange={e => handleChange("description_fr", e.target.value)} placeholder="Description en français..." />
          </div>
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
              <SelectTrigger className={`${inputClass} flex items-center justify-between cursor-pointer`}>
                <SelectValue placeholder="Select status..." />
              </SelectTrigger>
              <SelectContent className="bg-[#14141c] border border-white/10 text-white shadow-2xl z-[150] rounded-xl">
                <SelectItem value="upcoming" className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg py-2 px-3">Upcoming</SelectItem>
                <SelectItem value="ongoing" className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg py-2 px-3">Ongoing</SelectItem>
                <SelectItem value="sold_out" className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg py-2 px-3">Sold Out</SelectItem>
                <SelectItem value="cancelled" className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg py-2 px-3">Cancelled</SelectItem>
                <SelectItem value="completed" className="cursor-pointer hover:bg-violet-600 focus:bg-violet-600 focus:text-white rounded-lg py-2 px-3">Completed</SelectItem>
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

      {/* Apple-style Repeat / Recurring Event Section */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden">
        {/* Repeat Row — always visible */}
        <button
          type="button"
          onClick={() => {
            const baseD = form.date ? new Date(form.date) : new Date();
            const defaultDayStr = String(!isNaN(baseD.getTime()) ? baseD.getDay() : 0);
            setForm(prev => ({
              ...prev,
              is_recurring: !prev.is_recurring,
              recurrence_interval: prev.recurrence_interval || 1,
              recurrence_unit: prev.recurrence_unit || "weeks",
              recurrence_days: prev.recurrence_days?.length ? prev.recurrence_days : [defaultDayStr],
              recurrence_month_mode: prev.recurrence_month_mode || "same_date",
              recurrence_lead_days: prev.recurrence_lead_days || 14,
              recurrence_end_type: prev.recurrence_end_type || "never",
              _repeatPreset: prev._repeatPreset || "never",
            }));
          }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
              <Repeat className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-white">Repeat</p>
              <p className="text-xs text-white/40 mt-0.5">Set how often this event recurs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${form.is_recurring ? "text-violet-300" : "text-white/40"}`}>
              {!form.is_recurring ? "Never" : (() => {
                const p = form._repeatPreset;
                if (p === "daily") return "Daily";
                if (p === "weekdays") return "Weekdays";
                if (p === "weekends") return "Weekends";
                if (p === "weekly") return "Weekly";
                if (p === "biweekly") return "Every 2 Weeks";
                if (p === "monthly") return "Monthly";
                if (p === "every3months") return "Every 3 Months";
                if (p === "every6months") return "Every 6 Months";
                if (p === "yearly") return "Yearly";
                if (p === "custom") return "Custom";
                return "Weekly";
              })()}
            </span>
            <ArrowRight className={`w-4 h-4 transition-all ${form.is_recurring ? "rotate-90 text-violet-400" : "text-white/20 group-hover:text-white/40"}`} />
          </div>
        </button>

        {/* Expanded repeat options */}
        {form.is_recurring && (() => {
          const eventDateObj = form.date ? new Date(form.date) : new Date();
          const isValidDate = !isNaN(eventDateObj.getTime());
          const eventDayNum = isValidDate ? eventDateObj.getDate() : 11;
          const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const eventDayOfWeekName = isValidDate ? daysFull[eventDateObj.getDay()] : "Tuesday";
          const eventDayIdx = isValidDate ? eventDateObj.getDay() : 2;

          const interval = Math.max(1, Number(form.recurrence_interval || 1));
          const unit = form.recurrence_unit || "weeks";
          const rawDays = Array.isArray(form.recurrence_days)
            ? form.recurrence_days.map(String)
            : [String(eventDayIdx)];

          const nthWeekNum = isValidDate ? Math.floor((eventDayNum - 1) / 7) + 1 : 2;
          const nthOrdinal = ["1st", "2nd", "3rd", "4th", "5th"][nthWeekNum - 1] || `${nthWeekNum}th`;

          const preset = form._repeatPreset || "weekly";
          const isCustom = preset === "custom";

          // Toggle day in recurrence_days
          const toggleDay = (dayIdxStr) => {
            let nextDays;
            if (rawDays.includes(dayIdxStr)) {
              if (rawDays.length > 1) {
                nextDays = rawDays.filter(d => d !== dayIdxStr);
              } else {
                nextDays = rawDays;
              }
            } else {
              nextDays = [...rawDays, dayIdxStr];
            }
            handleChange("recurrence_days", nextDays);
          };

          const applyPreset = (p) => {
            const dayStr = String(eventDayIdx);
            const updates = { _repeatPreset: p };
            if (p === "daily") {
              Object.assign(updates, { recurrence_unit: "days", recurrence_interval: 1, recurrence_days: [dayStr] });
            } else if (p === "weekdays") {
              Object.assign(updates, { recurrence_unit: "weeks", recurrence_interval: 1, recurrence_days: ["1","2","3","4","5"] });
            } else if (p === "weekends") {
              Object.assign(updates, { recurrence_unit: "weeks", recurrence_interval: 1, recurrence_days: ["0","6"] });
            } else if (p === "weekly") {
              Object.assign(updates, { recurrence_unit: "weeks", recurrence_interval: 1, recurrence_days: [dayStr] });
            } else if (p === "biweekly") {
              Object.assign(updates, { recurrence_unit: "weeks", recurrence_interval: 2, recurrence_days: [dayStr] });
            } else if (p === "monthly") {
              Object.assign(updates, { recurrence_unit: "months", recurrence_interval: 1, recurrence_month_mode: "same_date" });
            } else if (p === "every3months") {
              Object.assign(updates, { recurrence_unit: "months", recurrence_interval: 3 });
            } else if (p === "every6months") {
              Object.assign(updates, { recurrence_unit: "months", recurrence_interval: 6 });
            } else if (p === "yearly") {
              Object.assign(updates, { recurrence_unit: "months", recurrence_interval: 12 });
            } else if (p === "custom") {
              Object.assign(updates, { recurrence_unit: "weeks", recurrence_interval: 3, recurrence_days: [dayStr] });
            }
            setForm(prev => ({ ...prev, ...updates }));
          };

          const PRESETS = [
            { id: "daily",        label: "Daily" },
            { id: "weekdays",     label: "Weekdays", sub: "Mon – Fri" },
            { id: "weekends",     label: "Weekends", sub: "Sat & Sun" },
            { id: "weekly",       label: "Weekly",   sub: `Every ${eventDayOfWeekName}` },
            { id: "biweekly",     label: "Biweekly", sub: `Every other ${eventDayOfWeekName}` },
            { id: "monthly",      label: "Monthly" },
            { id: "every3months", label: "Every 3 Months" },
            { id: "every6months", label: "Every 6 Months" },
            { id: "yearly",       label: "Yearly" },
            { id: "custom",       label: "Custom…" },
          ];

          const upcomingPreviews = getUpcomingRecurrencePreview(form.date, form, 4);

          return (
            <div className="border-t border-white/10 animate-in fade-in duration-200">
              {/* Preset List — Apple-style rows */}
              <div className="divide-y divide-white/[0.06]">
                {PRESETS.map(p => {
                  const isSelected = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors text-left group ${
                        isSelected ? "bg-violet-600/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div>
                        <span className={`text-sm font-medium ${isSelected ? "text-violet-300" : "text-white/80"}`}>
                          {p.label}
                        </span>
                        {p.sub && (
                          <span className="ml-2 text-xs text-white/30">{p.sub}</span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-violet-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Monthly sub-option */}
              {preset === "monthly" && (
                <div className="px-5 pb-4 pt-2 space-y-2 bg-white/[0.02]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Monthly on…</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { mode: "same_date",    label: `Day ${eventDayNum}${eventDayNum >= 11 && eventDayNum <= 13 ? "th" : ["st","nd","rd"][(eventDayNum % 10) - 1] || "th"} of every month` },
                      { mode: "same_weekday", label: `The ${nthOrdinal} ${eventDayOfWeekName} of every month` },
                    ].map(opt => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => handleChange("recurrence_month_mode", opt.mode)}
                        className={`p-3 rounded-xl text-left border text-xs transition-all ${
                          (form.recurrence_month_mode || "same_date") === opt.mode
                            ? "bg-violet-600/20 border-violet-500 text-white font-medium"
                            : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom options */}
              {isCustom && (
                <div className="px-5 py-4 space-y-4 bg-white/[0.02] border-t border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Custom Schedule</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-white/60">Repeat every</span>
                    <Input
                      type="number"
                      min="1"
                      max="99"
                      value={interval}
                      onChange={e => handleChange("recurrence_interval", Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-white/5 border-white/10 text-white font-mono text-center text-sm h-9"
                    />
                    <Select value={unit} onValueChange={v => handleChange("recurrence_unit", v)}>
                      <SelectTrigger className="w-28 bg-white/5 border-white/10 text-white text-sm h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#181822] border-white/10 text-white z-[200]">
                        <SelectItem value="days">{interval === 1 ? "Day" : "Days"}</SelectItem>
                        <SelectItem value="weeks">{interval === 1 ? "Week" : "Weeks"}</SelectItem>
                        <SelectItem value="months">{interval === 1 ? "Month" : "Months"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {unit === "weeks" && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40">Repeat on:</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {daysShort.map((d, i) => {
                          const dayStr = String(i);
                          const isSelected = rawDays.includes(dayStr);
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => toggleDay(dayStr)}
                              className={`w-10 h-10 rounded-full text-xs font-bold transition-all border ${
                                isSelected
                                  ? "bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-900/50"
                                  : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {unit === "months" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { mode: "same_date",    label: `Day ${eventDayNum} of the month` },
                        { mode: "same_weekday", label: `${nthOrdinal} ${eventDayOfWeekName} of the month` },
                      ].map(opt => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => handleChange("recurrence_month_mode", opt.mode)}
                          className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                            (form.recurrence_month_mode || "same_date") === opt.mode
                              ? "bg-violet-600/20 border-violet-500 text-white font-medium"
                              : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* End / Publishing settings */}
              <div className="border-t border-white/[0.06] px-5 py-4 space-y-4 bg-white/[0.015]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      Publish Tickets In Advance
                    </Label>
                    <Select
                      value={String(form.recurrence_lead_days || 14)}
                      onValueChange={v => handleChange("recurrence_lead_days", Number(v))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#181822] border-white/10 text-white z-[200]">
                        <SelectItem value="7">7 days before</SelectItem>
                        <SelectItem value="14">14 days before (Recommended)</SelectItem>
                        <SelectItem value="21">21 days before</SelectItem>
                        <SelectItem value="30">30 days before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      Ends
                    </Label>
                    <Select
                      value={form.recurrence_end_type || "never"}
                      onValueChange={v => handleChange("recurrence_end_type", v)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#181822] border-white/10 text-white z-[200]">
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="after_count">After N events</SelectItem>
                        <SelectItem value="until_date">On date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.recurrence_end_type === "after_count" && (
                  <div className="flex items-center gap-3">
                    <Label className="text-white/60 text-xs shrink-0">Stop after</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={form.recurrence_count || 10}
                      onChange={e => handleChange("recurrence_count", parseInt(e.target.value) || 1)}
                      className="w-20 bg-white/5 border-white/10 text-white text-xs h-8"
                    />
                    <Label className="text-white/40 text-xs">events</Label>
                  </div>
                )}

                {form.recurrence_end_type === "until_date" && (
                  <div className="flex items-center gap-3">
                    <Label className="text-white/60 text-xs shrink-0">End date</Label>
                    <Input
                      type="date"
                      value={form.recurrence_until ? form.recurrence_until.split("T")[0] : ""}
                      onChange={e => handleChange("recurrence_until", e.target.value)}
                      className="w-44 bg-white/5 border-white/10 text-white text-xs h-8"
                    />
                  </div>
                )}
              </div>

              {/* Release schedule preview */}
              {upcomingPreviews.length > 0 && (
                <div className="border-t border-white/[0.06] px-5 pb-5 pt-4 space-y-3">
                  <p className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    Upcoming Dates Preview
                  </p>
                  <div className="space-y-2">
                    {upcomingPreviews.map((occDate, idx) => {
                      const isFirst = idx === 0;
                      const leadDaysVal = Number(form.recurrence_lead_days || 14);
                      const autoPublishDate = new Date(occDate.getTime() - leadDaysVal * 24 * 60 * 60 * 1000);
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                            isFirst
                              ? "bg-violet-600/10 border-violet-500/30"
                              : "bg-white/[0.02] border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              isFirst ? "bg-violet-600 text-white" : "bg-white/10 text-white/50"
                            }`}>
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-white">{format(occDate, "EEE, MMM d, yyyy")} · {format(occDate, "hh:mm a")}</p>
                              <p className="text-[11px] text-white/40 mt-0.5">
                                {isFirst
                                  ? "Tickets go live on save"
                                  : `Tickets go live: ${format(autoPublishDate, "MMM d, yyyy")}`}
                              </p>
                            </div>
                          </div>
                          {isFirst && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-full border border-emerald-500/30 shrink-0">
                              Now
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {formError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between">
          <span>{formError}</span>
          <button type="button" onClick={() => setFormError("")} className="p-1 hover:bg-red-500/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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