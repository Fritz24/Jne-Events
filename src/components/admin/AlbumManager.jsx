import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Image as ImageIcon, Trash2, Upload, Check, CheckCircle2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AlbumManager() {
  const qc = useQueryClient();
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Fetch minimal events list for selection
  const { data: events = [] } = useQuery({
    queryKey: ["events_minimal_album"],
    queryFn: async () => {
      const { data } = await supabase
        .from('jne_events')
        .select('id, title, date')
        .order('date', { ascending: false });
      return data || [];
    }
  });

  // Fetch Albums from jne_settings
  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["albums_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jne_settings')
        .select('value')
        .eq('key', 'albums')
        .maybeSingle();

      if (error) throw error;
      const value = data?.value;
      if (value) {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error("Failed to parse albums:", e);
        }
      }
      return [];
    }
  });

  const saveAlbums = useMutation({
    mutationFn: async (newAlbums) => {
      const stringified = JSON.stringify(newAlbums);
      const { error } = await supabase
        .from('jne_settings')
        .upsert({
          key: 'albums',
          value: stringified,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums_settings"] })
  });

  const handleCreate = () => {
    const newAlbum = {
      id: `alb_${Date.now()}`,
      title: "New Album",
      date: new Date().toISOString().split('T')[0],
      coverImage: "",
      images: [],
      event_id: null
    };
    saveAlbums.mutate([...albums, newAlbum], {
      onSuccess: () => {
        setEditingAlbum(newAlbum);
      }
    });
  };

  const handleDelete = (id) => {
    if(confirm("Are you sure you want to delete this album?")) {
      saveAlbums.mutate(albums.filter(a => a.id !== id));
      if (editingAlbum?.id === id) setEditingAlbum(null);
    }
  };

  const handleUpdateAlbum = (updates) => {
    if (!editingAlbum) return;
    const updated = { ...editingAlbum, ...updates };
    setEditingAlbum(updated);
    saveAlbums.mutate(albums.map(a => a.id === updated.id ? updated : a));
  };

  const uploadImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !editingAlbum) return;

    setUploading(true);
    const newUrls = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `albums/${editingAlbum.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('events')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('events')
          .getPublicUrl(filePath);
        
        newUrls.push(data.publicUrl);
      }

      const updatedImages = [...(editingAlbum.images || []), ...newUrls];
      handleUpdateAlbum({ 
        images: updatedImages, 
        coverImage: editingAlbum.coverImage || newUrls[0] // Set first image as cover if none
      });

    } catch (err) {
      console.error("Upload error:", err);
      alert(`Failed to upload images: ${err.message || err.error_description || "Storage error"}`);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (imgUrl) => {
    const newImages = editingAlbum.images.filter(url => url !== imgUrl);
    handleUpdateAlbum({ 
      images: newImages,
      coverImage: editingAlbum.coverImage === imgUrl ? (newImages[0] || "") : editingAlbum.coverImage
    });
  };

  if (isLoading) return <div className="text-white/50 text-center py-10">Loading albums...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight">Photo Albums</h2>
        <Button onClick={handleCreate} className="bg-violet-600 hover:bg-violet-500 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Create Album
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Album List */}
        <div className="col-span-1 space-y-3">
          {albums.map(album => (
            <div 
              key={album.id}
              onClick={() => setEditingAlbum(album)}
              className={`p-4 rounded-xl cursor-pointer border transition-all flex items-center justify-between group ${editingAlbum?.id === album.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              <div>
                <p className="text-white font-medium truncate max-w-[150px]">{album.title}</p>
                <p className="text-white/40 text-xs">{album.images?.length || 0} photos</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={(e) => { e.stopPropagation(); handleDelete(album.id); }}
                className="w-8 h-8 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {albums.length === 0 && <div className="text-white/30 text-sm py-4">No albums created yet.</div>}
        </div>

        {/* Album Editor */}
        <div className="col-span-1 md:col-span-2">
          {editingAlbum ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
              {/* Header with Done Button & Status */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-white font-semibold text-base flex items-center gap-2">
                    <span>Editing Album:</span>
                    <span className="text-violet-400 font-bold truncate max-w-[200px]">{editingAlbum.title || "Untitled"}</span>
                  </h3>
                  <p className="text-white/40 text-xs mt-0.5">Edit metadata, upload photos, or choose a cover image</p>
                </div>
                <div className="flex items-center gap-3">
                  {saveAlbums.isPending ? (
                    <span className="text-amber-400 text-xs flex items-center gap-1.5 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-xs flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  <Button 
                    onClick={() => setEditingAlbum(null)} 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-4 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                  >
                    <Check className="w-3.5 h-3.5" /> Done
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/70">Album Title</Label>
                  <Input 
                    value={editingAlbum.title}
                    onChange={(e) => handleUpdateAlbum({ title: e.target.value })}
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Event Date</Label>
                  <Input 
                    type="date"
                    value={editingAlbum.date}
                    onChange={(e) => handleUpdateAlbum({ date: e.target.value })}
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/70">Tied Event (Optional)</Label>
                  <Select
                    value={editingAlbum.event_id || "none"}
                    onValueChange={(val) => handleUpdateAlbum({ event_id: val === "none" ? null : val })}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#111118] border-white/10 text-white">
                      <SelectItem value="none">None / General Album</SelectItem>
                      {events.map(ev => (
                        <SelectItem key={ev.id} value={ev.id}>
                          {ev.title} ({ev.date ? new Date(ev.date).toLocaleDateString() : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-white/70">Photos ({editingAlbum.images?.length || 0})</Label>
                  <div>
                    <input type="file" id="album-upload" multiple accept="image/*" className="hidden" onChange={uploadImages} disabled={uploading} />
                    <Label htmlFor="album-upload" className="cursor-pointer inline-flex items-center justify-center h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                      {uploading ? "Uploading..." : "Add Photos"}
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {editingAlbum.images?.map((url, idx) => (
                    <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden group border-2 ${editingAlbum.coverImage === url ? 'border-amber-500' : 'border-transparent'}`}>
                      <img src={url} alt="album photo" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        {editingAlbum.coverImage !== url && (
                          <button onClick={() => handleUpdateAlbum({ coverImage: url })} className="text-[10px] bg-black/80 text-white px-2 py-1 rounded">Set Cover</button>
                        )}
                        <button onClick={() => removeImage(url)} className="w-6 h-6 bg-red-500/80 rounded-full flex items-center justify-center text-white"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {(!editingAlbum.images || editingAlbum.images.length === 0) && (
                    <div className="col-span-full py-8 text-center border-2 border-dashed border-white/10 rounded-xl text-white/30 text-sm">
                      No photos uploaded yet. Click "Add Photos" above to start uploading.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Done Bar */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/40">Photos and changes are saved automatically.</span>
                <Button 
                  onClick={() => setEditingAlbum(null)} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2 h-auto rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" /> Done & Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-white/30 bg-white/5 border border-white/5 rounded-2xl">
              <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
              <p>Select an album to edit or create a new one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
