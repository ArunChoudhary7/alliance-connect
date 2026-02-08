import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Users, Lock, Globe, MessageCircle, Send, Loader2, 
  Settings, UserPlus, FileText, Image as ImageIcon, MoreVertical, 
  Download, Plus, VolumeX, Trash2, FileUp, Music, Film, Layers
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { uploadFile } from "@/lib/storage";

export default function CircleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const [circle, setCircle] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showAdminHQ, setShowAdminHQ] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const isAdmin = userRole === 'admin' || userRole === 'moderator';

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [cRes, mRes, uRes, fRes] = await Promise.all([
      supabase.from('circles').select('*').eq('id', id).single(),
      supabase.from('circle_messages').select('*, profiles:user_id(username, avatar_url, full_name)').eq('circle_id', id).order('created_at', { ascending: true }),
      supabase.from('profiles').select('user_id, username, avatar_url').limit(8),
      supabase.from('circle_files').select('*, profiles:user_id(username)').eq('circle_id', id).order('created_at', { ascending: false })
    ]);
    setCircle(cRes.data);
    setMessages(mRes.data || []);
    setAllUsers(uRes.data || []);
    setFiles(fRes.data || []);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [id]);

  useEffect(() => {
    const init = async () => {
      if (user) {
        const { data } = await supabase.from('circle_members').select('role').eq('circle_id', id).eq('user_id', user.id).single();
        setIsMember(!!data); setUserRole(data?.role || null);
      }
      await fetchData();
      setLoading(false);
    };
    init();

    const channel = supabase.channel(`realtime-circle-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_messages', filter: `circle_id=eq.${id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'circle_files', filter: `circle_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, user, fetchData]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || (circle?.only_admins_can_post && !isAdmin)) return;
    await supabase.from('circle_messages').insert({ circle_id: id, user_id: user.id, content: newMessage.trim() });
    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const { url } = await uploadFile('marketplace', file, `circles/${id}/${Date.now()}_${file.name}`);
      
      // 1. Add to Files Table
      const { data: fileRecord } = await supabase.from('circle_files').insert({ 
        circle_id: id, user_id: user.id, file_url: url, file_name: file.name, file_type: file.type 
      }).select().single();

      // 2. Add a message to the chat that references this file
      await supabase.from('circle_messages').insert({
        circle_id: id,
        user_id: user.id,
        content: `Shared a file: ${file.name}`,
        file_id: fileRecord.id
      });

      toast.success("File shared!", { id: toastId });
      fetchData();
    } catch (err) {
      toast.error("Upload failed", { id: toastId });
    }
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        {/* WHATSAPP HEADER */}
        <div className="p-4 flex items-center gap-3 bg-background/80 backdrop-blur-md border-b border-white/5 cursor-pointer" onClick={() => setShowAdminHQ(true)}>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate('/circles'); }}><ArrowLeft /></Button>
          <Avatar className="h-10 w-10 border-2 border-primary/20"><AvatarImage src={circle?.cover_url} /><AvatarFallback>{circle?.name?.[0]}</AvatarFallback></Avatar>
          <div className="flex-1">
            <h2 className="font-black uppercase italic tracking-tighter text-lg">{circle?.name}</h2>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{circle?.member_count} Members</p>
          </div>
        </div>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 bg-secondary/30 rounded-xl p-1">
            <TabsTrigger value="chat" className="flex-1 rounded-lg text-[10px] font-black uppercase">Chat</TabsTrigger>
            <TabsTrigger value="media" className="flex-1 rounded-lg text-[10px] font-black uppercase">Media & Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                  <Link to={`/profile/${m.profiles?.username}`}><Avatar className="h-8 w-8"><AvatarImage src={m.profiles?.avatar_url} /><AvatarFallback>{m.profiles?.username?.[0]}</AvatarFallback></Avatar></Link>
                  <div className={`flex flex-col ${m.user_id === user?.id ? 'items-end' : 'items-start'} max-w-[80%]`}>
                    <span className="text-[9px] font-black uppercase text-primary mb-1">@{m.profiles?.username}</span>
                    
                    {/* FILE MESSAGE RENDERING */}
                    {m.file_id ? (
                      <div className="bg-secondary/40 p-3 rounded-2xl border border-white/5 flex items-center gap-3 group cursor-pointer hover:bg-secondary/60 transition-all" onClick={() => window.open(files.find(f => f.id === m.file_id)?.file_url)}>
                        <div className="bg-primary/20 p-2 rounded-lg text-primary"><FileText className="h-5 w-5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate">{m.content.replace('Shared a file: ', '')}</p>
                          <p className="text-[8px] font-black uppercase opacity-40">Click to Download</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm ${m.user_id === user?.id ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none'}`}>
                        {m.content}
                      </div>
                    )}
                    <span className="text-[8px] font-bold opacity-20 mt-1 uppercase">{formatDistanceToNow(new Date(m.created_at))} ago</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-background border-t border-white/5">
              <div className="flex gap-2 items-center bg-secondary/50 p-2 rounded-2xl">
                <label className="cursor-pointer p-2 hover:bg-primary/20 rounded-full transition-all"><Plus className="h-5 w-5 text-primary" /><input type="file" className="hidden" onChange={handleFileUpload} /></label>
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Message squad..." className="border-none bg-transparent focus-visible:ring-0" />
                <Button onClick={handleSendMessage} size="icon" className="rounded-xl"><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </TabsContent>

          {/* MEDIA GALLERY TAB */}
          <TabsContent value="media" className="flex-1 overflow-y-auto p-4 scrollbar-hide">
            <div className="grid grid-cols-2 gap-3 pb-20">
              {files.map(file => (
                <motion.div key={file.id} whileHover={{ scale: 1.02 }} className="glass-card p-4 rounded-2xl border-none shadow-lg flex flex-col gap-3 group relative">
                  <div className="aspect-square rounded-xl bg-primary/5 flex items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
                    {file.file_type?.includes('image') ? <ImageIcon className="h-10 w-10" /> : <FileText className="h-10 w-10" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase truncate">{file.file_name}</p>
                    <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest mt-1">By @{file.profiles?.username}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="absolute bottom-2 right-2 rounded-full hover:bg-primary hover:text-white" onClick={() => window.open(file.file_url)}><Download className="h-4 w-4" /></Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ADMIN HQ remains the same with its high-end controls */}
      <Sheet open={showAdminHQ} onOpenChange={setShowAdminHQ}>
        <SheetContent className="glass-card border-none overflow-y-auto sm:max-w-md rounded-l-[3rem]">
          <SheetHeader><SheetTitle className="text-2xl font-black uppercase italic gradient-text">Command Center</SheetTitle></SheetHeader>
          <div className="mt-8 space-y-8 pb-10">
            {/* Invite logic and Admin toggles go here */}
            <div className="space-y-4">
               <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Invite Squad</Label>
               {allUsers.map(u => (
                 <div key={u.user_id} className="flex items-center justify-between p-3 bg-secondary/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarImage src={u.avatar_url} /><AvatarFallback>{u.username?.[0]}</AvatarFallback></Avatar>
                      <span className="text-xs font-bold uppercase">@{u.username}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-primary font-black uppercase text-[10px]" onClick={() => supabase.from('circle_members').insert({ circle_id: id, user_id: u.user_id, role: 'member' }).then(() => toast.success("Added!"))}>Add</Button>
                 </div>
               ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}