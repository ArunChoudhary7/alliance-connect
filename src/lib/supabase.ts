import { supabase } from "@/integrations/supabase/client";

// Email domain validation
export const ALLOWED_DOMAIN = ".alliance.edu.in";
export function isValidAllianceEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

// --- AUTH FUNCTIONS (FIXES AUTHFORM.TSX ERRORS) ---
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
export const checkIsFollowing = isFollowing; // Alias for compatibility

export async function getFollowerCount(userId: string) {
  return await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId);
}

export async function getFollowingCount(userId: string) {
  return await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId);
}

// --- POSTS & FEED ---
export async function createPost(post: { user_id: string; content?: string; images?: string[] | null; video_url?: string | null }) {
  return await supabase.from("posts").insert([post]).select().single();
}

export async function getPosts(limit = 20, offset = 0) {
  const { data: postsData, error } = await supabase.from("posts").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error || !postsData) return { data: null, error };
  const userIds = [...new Set(postsData.map((p) => p.user_id))];
  const { data: profiles } = await supabase.from("profiles").select("user_id, username, full_name, avatar_url").in("user_id", userIds);
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
  return { data: postsData.map((post) => ({ ...post, profiles: profileMap.get(post.user_id) || { full_name: 'AU User', username: 'user' } })), error: null };
}

export async function getUserPosts(userId: string, limit = 12, offset = 0) {
  const { data: postsData, error } = await supabase.from("posts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (error || !postsData) return { data: null, error };
  const { data: profile } = await supabase.from("profiles").select("user_id, username, full_name, avatar_url").eq("user_id", userId).maybeSingle();
  return { data: postsData.map((post) => ({ ...post, profiles: profile || { full_name: 'AU User', username: 'user' } })), error: null };
}

export async function getSavedPosts(userId: string) {
  const { data: savedData, error } = await supabase.from("saved_posts").select("post_id").eq("user_id", userId);
  if (error || !savedData || savedData.length === 0) return { data: [], error: null };
  const postIds = savedData.map((s) => s.post_id);
  const { data: postsData } = await supabase.from("posts").select("*").in("id", postIds).order("created_at", { ascending: false });
  return { data: postsData || [], error: null };
}

// --- COMMENTS & AURA ---
export async function getComments(postId: string) {
  return await supabase.from("comments").select("*, profiles(full_name, avatar_url)").eq("post_id", postId).order("created_at", { ascending: true });
}

export async function createComment(comment: { user_id: string; post_id: string; content: string, parent_id?: string }) {
  return await supabase.from("comments").insert([comment]).select().single();
}

export async function toggleAura(userId: string, postId: string) {
  const { data: existing } = await supabase.from("auras").select("id").eq("user_id", userId).eq("post_id", postId).maybeSingle();
  if (existing) {
    await supabase.from("auras").delete().eq("id", existing.id);
    return { action: "removed" };
  } else {
    await supabase.from("auras").insert([{ user_id: userId, post_id: postId }]);
    return { action: "added" };
  }
}

export async function getAuraLeaderboard(limit = 10) {
  return await supabase.from("profiles").select("username, full_name, avatar_url, total_aura, department").order("total_aura", { ascending: false }).limit(limit);
}

export { supabase };