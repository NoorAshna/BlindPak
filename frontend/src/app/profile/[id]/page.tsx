"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import api from "@/lib/api";
import PostCard from "@/components/PostCard";
import { formatDistanceToNow } from "date-fns";
import { Users, FileText, Calendar, Pencil, Check, X } from "lucide-react";
import type { Post } from "@/components/PostCard";
import Link from "next/link";

interface ProfileUser {
  _id: string;
  name: string;
  role: "student" | "admin" | "public";
  university?: string;
  bio?: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postCount: number;
  isFollowing: boolean;
}

interface PostsResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Bio edit state
  const [editingBio, setEditingBio] = useState(false);
  const [bioValue, setBioValue] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const isOwnProfile = user && user._id === id;

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const res = await api.get<ProfileUser>(`/users/${id}`);
      setProfile(res.data);
      setBioValue(res.data.bio || "");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to load profile", "error");
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await api.get<PostsResponse>(`/users/${id}/posts`, {
        params: { limit: 10 },
      });
      setPosts(res.data.posts);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch {
      // silent
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadMorePosts = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<PostsResponse>(`/users/${id}/posts`, {
        params: { limit: 10, cursor: nextCursor },
      });
      setPosts((prev) => [...prev, ...res.data.posts]);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch {
      showToast("Failed to load more posts", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProfile();
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleFollow = async () => {
    if (!user) {
      showToast("Please log in to follow users", "info");
      return;
    }
    setFollowLoading(true);
    try {
      const res = await api.post<{ following: boolean; message: string }>(`/users/${id}/follow`);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: res.data.following,
              followersCount: res.data.following
                ? prev.followersCount + 1
                : prev.followersCount - 1,
            }
          : prev
      );
      showToast(res.data.message, "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await api.put("/users/me", { bio: bioValue });
      setProfile((prev) => (prev ? { ...prev, bio: bioValue } : prev));
      setEditingBio(false);
      showToast("Bio updated", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update bio", "error");
    } finally {
      setSavingBio(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-500">
        Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-gray-500">
        <p className="text-lg font-medium">User not found</p>
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          ← Back to feed
        </Link>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">

        {/* Profile card */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Header row */}
          <div className="mb-5 flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-700">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-gray-950">{profile.name}</h1>
                {profile.role === "student" && profile.university && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                    🎓 {profile.university}
                  </span>
                )}
                {profile.role === "admin" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
                    🛡️ Admin
                  </span>
                )}
              </div>

              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar size={12} />
                Joined {formatDistanceToNow(new Date(profile.createdAt))} ago
              </p>

              {/* Follow button (not own profile) */}
              {!isOwnProfile && (user?.role === "student" || user?.role === "admin") && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`mt-3 rounded-lg px-4 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                    profile.isFollowing
                      ? "border border-gray-300 bg-white text-gray-700 hover:border-red-300 hover:text-red-600"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  {followLoading
                    ? "…"
                    : profile.isFollowing
                    ? "Unfollow"
                    : "+ Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Bio section */}
          <div className="mb-5">
            {editingBio ? (
              <div>
                <textarea
                  value={bioValue}
                  onChange={(e) => setBioValue(e.target.value.slice(0, 300))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm text-gray-700 resize-none focus:border-indigo-400 focus:outline-none"
                  placeholder="Write a short bio…"
                  autoFocus
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{bioValue.length}/300</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingBio(false); setBioValue(profile.bio || ""); }}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      <X size={12} /> Cancel
                    </button>
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Check size={12} /> {savingBio ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-2">
                <p className="flex-1 text-sm text-gray-600 leading-relaxed">
                  {profile.bio || (isOwnProfile ? <span className="italic text-gray-400">No bio yet. Click ✏️ to add one.</span> : <span className="italic text-gray-400">No bio.</span>)}
                </p>
                {isOwnProfile && (
                  <button
                    onClick={() => setEditingBio(true)}
                    className="shrink-0 rounded p-1 text-gray-400 hover:text-indigo-600 transition"
                    title="Edit bio"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50">
            <div className="flex flex-col items-center py-3 px-2">
              <span className="text-lg font-bold text-gray-900">{profile.postCount}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><FileText size={11} />Posts</span>
            </div>
            <div className="flex flex-col items-center py-3 px-2">
              <span className="text-lg font-bold text-gray-900">{profile.followersCount}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><Users size={11} />Followers</span>
            </div>
            <div className="flex flex-col items-center py-3 px-2">
              <span className="text-lg font-bold text-gray-900">{profile.followingCount}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5"><Users size={11} />Following</span>
            </div>
          </div>
        </div>

        {/* Posts section */}
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Posts by {isOwnProfile ? "you" : profile.name}
        </h2>

        {loadingPosts ? (
          <div className="py-8 text-center text-sm text-gray-400">Loading posts…</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center shadow-sm">
            <FileText size={32} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">No posts yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onLike={async (postId) => {
                  await api.post(`/posts/${postId}/like`);
                  fetchPosts();
                }}
                onPostUpdated={fetchPosts}
                onPostDeleted={fetchPosts}
              />
            ))}

            {hasMore && (
              <button
                onClick={loadMorePosts}
                disabled={loadingMore}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition"
              >
                {loadingMore ? "Loading…" : "Load more posts"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
