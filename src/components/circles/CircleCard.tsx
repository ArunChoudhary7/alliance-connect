import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Lock, Globe, Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Circle {
  id: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  is_private: boolean;
  member_count: number;
  created_by: string;
}

interface CircleCardProps {
  circle: Circle;
  isMember: boolean;
  onJoin: (circleId: string) => void;
  onLeave: (circleId: string) => void;
  onClick: (circleId: string) => void;
}

export function CircleCard({ circle, isMember, onJoin, onLeave, onClick }: CircleCardProps) {
  const { user } = useAuth();
  const [joining, setJoining] = useState(false);

  const handleJoinLeave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setJoining(true);
    try {
      if (isMember) {
        await onLeave(circle.id);
      } else {
        await onJoin(circle.id);
      }
    } finally {
      setJoining(false);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(circle.id)}
      className="glass-card p-4 rounded-2xl cursor-pointer"
    >
      {/* Cover image */}
      <div className="relative h-24 rounded-xl overflow-hidden mb-3 bg-gradient-to-br from-primary/30 to-accent/30">
        {circle.cover_url && (
          <img
            src={circle.cover_url}
            alt={circle.name}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={circle.is_private ? "secondary" : "outline"} className="gap-1">
            {circle.is_private ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
            {circle.is_private ? 'Private' : 'Public'}
          </Badge>
        </div>
      </div>

      {/* Circle info */}
      <h3 className="font-semibold text-foreground mb-1">{circle.name}</h3>
      {circle.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {circle.description}
        </p>
      )}

      {/* Members and action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{circle.member_count} members</span>
        </div>

        {user && (
          <Button
            size="sm"
            variant={isMember ? "outline" : "default"}
            onClick={handleJoinLeave}
            disabled={joining}
            className={isMember ? "" : "bg-gradient-primary"}
          >
            {isMember ? 'Leave' : 'Join'}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
