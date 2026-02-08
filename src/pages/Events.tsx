import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Event {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  location: string | null;
  event_date: string;
  rsvp_count: number;
  created_by: string;
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [userRsvps, setUserRsvps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Create event form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true });

    setEvents(data || []);
  }, []);

  const fetchRsvps = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('event_rsvps')
      .select('event_id')
      .eq('user_id', user.id);

    setUserRsvps(new Set(data?.map(r => r.event_id) || []));
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchEvents(), fetchRsvps()]);
      setLoading(false);
    };
    loadData();
  }, [fetchEvents, fetchRsvps]);

  const handleRsvp = async (eventId: string) => {
    if (!user) return;

    const hasRsvp = userRsvps.has(eventId);

    try {
      if (hasRsvp) {
        await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);

        setUserRsvps(prev => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        toast.success('RSVP cancelled');
      } else {
        await supabase
          .from('event_rsvps')
          .insert({ event_id: eventId, user_id: user.id });

        setUserRsvps(prev => new Set([...prev, eventId]));
        toast.success('RSVP confirmed!');
      }
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update RSVP');
    }
  };

  const handleCreateEvent = async () => {
    if (!user || !title.trim() || !eventDate) return;

    setCreating(true);
    try {
      const { error } = await supabase.from('events').insert({
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: new Date(eventDate).toISOString(),
        created_by: user.id
      });

      if (error) throw error;

      toast.success('Event created!');
      setTitle('');
      setDescription('');
      setLocation('');
      setEventDate('');
      setShowCreateDialog(false);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl font-bold gradient-text">Events</h1>
            <p className="text-sm text-muted-foreground">Upcoming campus events</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader>
                <DialogTitle className="gradient-text">Create Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                    className="bg-secondary/30"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's the event about?"
                    className="bg-secondary/30"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where is it?"
                    className="bg-secondary/30"
                  />
                </div>
                <div>
                  <Label htmlFor="eventDate">Date & Time *</Label>
                  <Input
                    id="eventDate"
                    type="datetime-local"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="bg-secondary/30"
                  />
                </div>
                <Button
                  onClick={handleCreateEvent}
                  disabled={creating || !title.trim() || !eventDate}
                  className="w-full bg-gradient-primary"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Events list */}
        {events.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-2xl">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 rounded-2xl"
              >
                <div className="flex gap-4">
                  {/* Date badge */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-primary flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary-foreground">
                      {format(new Date(event.event_date), 'd')}
                    </span>
                    <span className="text-xs text-primary-foreground/80 uppercase">
                      {format(new Date(event.event_date), 'MMM')}
                    </span>
                  </div>

                  {/* Event info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">{event.title}</h3>
                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.event_date), 'h:mm a')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.rsvp_count} going
                      </span>
                    </div>
                  </div>

                  {/* RSVP button */}
                  <Button
                    size="sm"
                    variant={userRsvps.has(event.id) ? "secondary" : "default"}
                    onClick={() => handleRsvp(event.id)}
                    className={userRsvps.has(event.id) ? "" : "bg-gradient-primary"}
                  >
                    {userRsvps.has(event.id) ? 'Going ✓' : 'RSVP'}
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
