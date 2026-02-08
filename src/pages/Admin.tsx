import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Ban, Eye, Trash2 } from "lucide-react";

interface Report {
  id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
  target_user_id?: string;
  target_post_id?: string;
  reporter_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  target_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Admin() {
  const { profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.is_admin === true;

  useEffect(() => {
    if (!isAdmin) return;
    fetchReports();
  }, [isAdmin]);

  const fetchReports = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load reports");
      setLoading(false);
      return;
    }

    if (!data) {
      setReports([]);
      setLoading(false);
      return;
    }

    // Fetch reporter & target profiles
    const userIds = [
      ...new Set(
        data
          .flatMap((r) => [r.reporter_id, r.target_user_id])
          .filter(Boolean)
      ),
    ];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", userIds as string[]);

    const profileMap = new Map(
      profiles?.map((p) => [p.user_id, p]) || []
    );

    const enriched: Report[] = data.map((r) => ({
      ...r,
      reporter_profile: profileMap.get(r.reporter_id),
      target_profile: profileMap.get(r.target_user_id || ""),
    }));

    setReports(enriched);
    setLoading(false);
  };

  const banUser = async (userId?: string) => {
    if (!userId) return;

    const confirmBan = confirm("Ban this user?");
    if (!confirmBan) return;

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: true })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to ban user");
    } else {
      toast.success("User banned");
      fetchReports();
    }
  };

  const deletePost = async (postId?: string) => {
    if (!postId) return;

    const confirmDelete = confirm("Delete this post?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);

    if (error) {
      toast.error("Failed to delete post");
    } else {
      toast.success("Post deleted");
      fetchReports();
    }
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="p-10 text-center">
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground">Admins only.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold">Admin Reports</h1>

        {loading && <p>Loading reports...</p>}

        {!loading && reports.length === 0 && (
          <p className="text-muted-foreground">No reports yet.</p>
        )}

        {reports.map((report) => (
          <div
            key={report.id}
            className="border rounded-xl p-4 flex flex-col gap-3 bg-card"
          >
            {/* Reporter */}
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={report.reporter_profile?.avatar_url || ""} />
                <AvatarFallback>
                  {report.reporter_profile?.full_name?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {report.reporter_profile?.full_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  @{report.reporter_profile?.username}
                </p>
              </div>
            </div>

            {/* Reason */}
            <p className="text-sm">Reason: {report.reason}</p>

            {/* Target */}
            {report.target_profile && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={report.target_profile.avatar_url || ""} />
                  <AvatarFallback>
                    {report.target_profile.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {report.target_profile.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{report.target_profile.username}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {report.target_user_id && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => banUser(report.target_user_id)}
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}

                  {report.target_post_id && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => deletePost(report.target_post_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}

                  {report.target_profile?.username && (
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() =>
                        window.open(`/u/${report.target_profile?.username}`, "_blank")
                      }
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
