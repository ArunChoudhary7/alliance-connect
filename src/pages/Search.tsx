import { useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/AppLayout";
import { searchUsers } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect } from "react";

interface UserResult {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  department: string | null;
  total_aura: number | null;
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const search = async () => {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      const { data } = await searchUsers(debouncedQuery);
      if (data) {
        setResults(data as UserResult[]);
      }
      setLoading(false);
    };

    search();
  }, [debouncedQuery]);

  const getInitials = (name: string | null) => {
    if (!name) return "AU";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <AppLayout>
      <div className="max-w-lg mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users by name or username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-12 h-12 rounded-2xl bg-secondary/50 border-border/50 focus:border-primary"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-primary" />
          )}
        </motion.div>

        {/* Results */}
        <div className="mt-6 space-y-2">
          {results.length === 0 && debouncedQuery.length >= 2 && !loading && (
            <div className="text-center py-10">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}

          {results.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarImage src={user.avatar_url || ""} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                    {user.department && ` • ${user.department}`}
                  </p>
                </div>
                {user.total_aura && user.total_aura > 0 && (
                  <div className="text-right">
                    <p className="text-sm font-semibold gradient-text">{user.total_aura}</p>
                    <p className="text-xs text-muted-foreground">Aura</p>
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty state */}
        {query.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto mb-4 flex items-center justify-center">
              <SearchIcon className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Find your classmates</h3>
            <p className="text-muted-foreground text-sm">
              Search by name or username
            </p>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
