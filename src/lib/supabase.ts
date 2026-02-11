import { supabase } from "@/integrations/supabase/client";

// Email domain validation
export const ALLOWED_DOMAIN = ".alliance.edu.in";
export function isValidAllianceEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

// --- AUTH FUNCTIONS ---
export async function signUp(email: string, password: string) {
  if (!isValidAllianceEmail(email)) {
    return { error: { message: "Only .alliance.edu.in email addresses are allowed" }, data: null };
  }
  const redirectUrl = `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signUp({ 
    email, password, options: { emailRedirectTo: redirectUrl } 
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  if (!isValidAllianceEmail(email)) {
    return { error: { message: "Only .alliance.edu.in email addresses are allowed" }, data: null };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// --- PROFILE & SEARCH FUNCTIONS ---
export async function getProfile(userId: string) {
  return await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
}

export async function getProfileByUsername(username: string) {
  return await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
}

export async function searchUsers(query: string) {
  return await supabase.from("profiles").select("*").or(`username.ilike.%${query}%,full_name.ilike.%${query}%`).limit(20);
}

export async function checkUsernameAvailable(username: string) {
  const { data } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle();
  return { available: !data };
}

export async function updateProfile(userId: string, updates: any) {
  return await supabase.from("profiles").update(updates).eq("user_id", userId).select().single();
}

// --- FOLLOW FUNCTIONS ---
export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase.from("follows").select("id").eq("follower_id", followerId).eq("following_id", followingId).maybeSingle();
  return { isFollowing: !!data, error };
}
export const checkIsFollowing = isFollowing; 

export async function getFollowerCount(userId: string) {
  return await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
}

export async function getFollowingCount(userId: string) {
  return await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
}

// --- POSTS & FEED ---
export async function createPost(post: { 
  user_id: string; 
  content?: string; 
  images?: string[] | null; 
  video_url?: string | null;
  expires_at?: string | null;
  is_stealth?: boolean;
}) {
  return await supabase.from("posts").insert([post]).select().single();
}

export async function getPosts(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles!user_id (
        username,
        full_name,
        avatar_url
      )
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { data: null, error };
  
  return { 
    data: data.map((post: any) => ({ 
        ...post, 
        aura_count: Number(post.aura_count) || 0,
        profiles: post.profiles || { full_name: 'AU User', username: 'user' } 
    })), 
    error: null 
  };
}

export async function getUserPosts(userId: string, limit = 12, offset = 0) {
  const { data: postsData, error } = await supabase
    .from("posts")
    .select(`
      *,
      profiles!user_id (
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !postsData) return { data: null, error };
  
  return { 
    data: postsData.map((post: any) => ({ 
        ...post, 
        aura_count: Number(post.aura_count) || 0,
        profiles: post.profiles || { full_name: 'AU User', username: 'user' } 
    })), 
    error: null 
  };
}

// --- SIGNAL & BEAM FUNCTIONS ---

export async function getShareSuggestions(userId: string) {
    return await supabase
      .from("profiles")
      .select("user_id, username, full_name, avatar_url")
      .limit(10);
}

export async function beamToStory(userId: string, postId: string) {
    return await supabase.from("stories").insert({
      user_id: userId,
      post_id: postId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      type: 'post_share'
    }).select().single();
}

// --- COMMENTS & AURA ---
export async function getComments(postId: string) {
  return await supabase
    .from("comments")
    .select(`
      *,
      profiles!user_id (
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
}

export async function createComment({ user_id, post_id, content, parent_id = null }: any) {
  const { data, error } = await supabase
    .from("comments")
    .insert([{
      user_id,
      post_id,
      content: content.trim(),
      parent_id
    }])
    .select(`
      *,
      profiles:user_id (
        username,
        full_name,
        avatar_url
      )
    `)
    .single();

  return { data, error };
}

export async function toggleAura(userId: string, postId: string) {
  const { data: existing, error: checkError } = await supabase
    .from("auras")
    .select("id")
    .eq("user_id", userId)
    .eq("post_id", postId)
    .maybeSingle();

  if (checkError) return { action: "error", error: checkError };

  if (existing) {
    const { error: delError } = await supabase.from("auras").delete().eq("id", existing.id);
    return { action: "removed", error: delError };
  } else {
    const { error: insError } = await supabase.from("auras").insert([{ user_id: userId, post_id: postId }]);
    return { action: "added", error: insError };
  }
}

export async function getAuraLeaderboard(limit = 10) {
  return await supabase.from("profiles").select("username, full_name, avatar_url, total_aura, department").order("total_aura", { ascending: false }).limit(limit);
}
// --- SETTINGS & PRIVACY ---
export async function getNotificationPrefs(userId: string) {
  return await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
}

export async function updateNotificationPrefs(userId: string, prefs: any) {
  return await supabase.from("notification_preferences").upsert({ user_id: userId, ...prefs });
}

export async function submitSupportTicket(ticket: { user_id: string; type: 'bug' | 'feedback' | 'contact'; message: string }) {
  return await supabase.from("support_tickets").insert([ticket]);
}

export async function getBlockedUsers(userId: string) {
  return await supabase.from("blocks").select("blocked_id, profiles!blocked_id(*)").eq("blocker_id", userId);
}
export { supabase };