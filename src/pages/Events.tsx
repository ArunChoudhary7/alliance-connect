import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, MapPin, X, Upload, Sparkles, Trash2, Radio } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PulseBeacon } from "@/components/layout/PulseBeacon";
import { validateEventCreate, sanitizeField, eventLimiter, isRateLimited } from "@/lib/security";
import { uploadFile } from "@/lib/storage";

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  event_date: string;
  created_by: string;
}

export default function Events() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchEvents();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchEvents = async () => {
    // Fetch events from the last 24 hours onwards so they don't disappear immediately
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', yesterday.toISOString())
      .order('event_date', { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("Could not load events");
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !title || !eventDate || !file) {
      toast.error("Please fill all required fields and upload a poster");
      return;
    }

    // SECURITY: Validate event data
    const validation = validateEventCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      event_date: eventDate
    });
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // SECURITY: Rate limit event creation
    if (isRateLimited(eventLimiter, 'create_event')) return;

    setCreating(true);
    try {
      // 1. Upload Poster to Cloudinary
      const { url: publicUrl, error: uploadError } = await uploadFile('events', file, user.id);

      if (uploadError) throw uploadError;
      if (!publicUrl) throw new Error("Failed to upload poster");

      const uploadToast = toast.loading("Broadcasting Event...");
      // 2. Insert Event (sanitized)
      const { error: dbError } = await createEvent({
        title: sanitizeField(title.trim(), 200),
        description: sanitizeField(description.trim(), 2000),
        location: sanitizeField(location.trim(), 200),
        event_date: new Date(eventDate).toISOString(),
        cover_url: publicUrl,
        created_by: user.id
      });

      toast.dismiss(uploadToast);

      if (dbError) throw dbError;

      toast.success("Event Broadcasted Successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to cancel this event?")) return;

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) toast.error("Failed to delete event");
    else {
      toast.success("Event Cancelled");
      fetchEvents();
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setEventDate('');
    setFile(null);
  };

  return (
    <AppLayout>
      <div className="min-h-screen pb-20 relative overflow-hidden">
        {/* Background Ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/50"
              >
                Events
              </motion.h1>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 mt-2"
              >
                <div className="h-0.5 w-12 bg-pink-500" />
                <p className="text-sm font-bold uppercase tracking-widest text-pink-400">Campus Happenings</p>
              </motion.div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              <PulseBeacon
                trigger={
                  <Button variant="outline" className="h-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md gap-3 group w-full sm:w-auto justify-center">
                    <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
                      Uncover PulseBeacon
                    </span>
                  </Button>
                }
              />

              {(user?.email === 'arunchoudhary@alliance.edu.in' || profile?.username === 'arun' || profile?.username === 'koki' || profile?.role === 'admin') && (
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="h-12 px-6 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-none font-black uppercase tracking-widest shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] transition-all transform hover:-translate-y-1 w-full sm:w-auto">
                      <Plus className="h-5 w-5 mr-2" />
                      Host Event
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-card border-white/10 sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter gradient-text">Broadcast Event</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Event Title</Label>
                          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="super-input bg-black/40 border-white/10" placeholder="MEGA EVENT 2024" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Description</Label>
                          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="super-input bg-black/40 border-white/10 min-h-[100px]" placeholder="What's happening?" />
                        </div>
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Location</Label>
                          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="super-input bg-black/40 border-white/10" placeholder="Audi 1" />
                        </div>
                        <div>
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Date & Time</Label>
                          <Input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="super-input bg-black/40 border-white/10" />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Event Poster (Required)</Label>
                          <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:bg-white/5 transition-colors relative group">
                            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="flex flex-col items-center gap-2">
                              {file ? (
                                <>
                                  <span className="text-xs font-bold text-green-400">{file.name}</span>
                                  <div className="h-32 w-full max-w-[200px] overflow-hidden rounded-lg mt-2">
                                    <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 opacity-40 group-hover:scale-110 transition-transform" />
                                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest">Click to Upload Poster</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleCreate} disabled={creating} className="w-full h-12 rounded-xl font-black uppercase tracking-widest bg-white text-black hover:bg-white/90">
                        {creating ? "Broadcasting..." : "Launch Event"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Events Gallery - Masonry / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  layoutId={event.id}
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="group relative aspect-[3/4] rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer"
                  onClick={() => setActiveEvent(activeEvent === event.id ? null : event.id)}
                >
                  {/* Background Image/Poster */}
                  <div className="absolute inset-0 bg-zinc-900">
                    {event.cover_url ? (
                      <img src={event.cover_url} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <Calendar className="h-12 w-12 opacity-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      {/* Date Badge */}
                      <div className="absolute top-6 right-6 h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center">
                        <span className="text-lg font-black">{format(new Date(event.event_date), 'd')}</span>
                        <span className="text-[10px] uppercase font-bold opacity-60">{format(new Date(event.event_date), 'MMM')}</span>
                      </div>

                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 rounded-lg bg-pink-500/20 border border-pink-500/30 text-[9px] font-black uppercase tracking-widest text-pink-300 mb-2">
                          {event.location || "Campus"}
                        </span>
                      </div>

                      <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none mb-2 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                        {event.title}
                      </h3>

                      <p className="text-sm text-white/90 line-clamp-2 mb-4 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 drop-shadow-md">
                        {event.description}
                      </p>

                      <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
                          {format(new Date(event.event_date), 'h:mm a')}
                        </span>
                        {user?.id === event.created_by && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white"
                            onClick={(e) => handleDelete(event.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {events.length === 0 && !loading && (
              <div className="col-span-full flex flex-col items-center justify-center py-32 opacity-60 text-center animate-in fade-in duration-700">
                <div className="relative group cursor-pointer mb-6" onClick={() => setShowCreateDialog(true)}>
                  <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl group-hover:bg-pink-500/30 transition-all duration-500" />
                  <Sparkles className="h-20 w-20 relative z-10 text-pink-500 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-widest mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-white/80 to-white/40">
                  Radar Silent
                </h3>
                <p className="text-sm font-medium text-white/50 max-w-xs mx-auto leading-relaxed">
                  No signals detected. Be the spark that ignites the campus.
                </p>
                <Button
                  variant="link"
                  className="mt-4 text-pink-400 font-bold uppercase tracking-widest text-xs hover:text-pink-300"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Initiate First Broadcast &rarr;
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
