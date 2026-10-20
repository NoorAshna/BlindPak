"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { useEffect, useRef, useState } from "react";
import { Bell, User, LogOut, Shield, Menu, X, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  postId?: string | null;
  actor?: { _id: string; name: string };
}

const typeIconMap: Record<string, string> = {
  follow: "👤",
  comment: "💬",
  mention: "📣",
  like: "❤️",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const { latestNotification } = useSocket();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // ── Fetch notifications ───────────────────────────────────────────────────
  const fetchNotifications = async () => {
    if (!user || (user.role !== "student" && user.role !== "admin")) return;
    try {
      const res = await api.get<Notification[]>("/users/notifications");
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.read).length);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Real-time notification received via Socket.IO
  useEffect(() => {
    if (!latestNotification) return;
    setNotifications((prev) => {
      // Avoid duplicate entry if already present
      if (prev.some((n) => n._id === latestNotification._id)) return prev;
      return [latestNotification, ...prev];
    });
    setUnreadCount((count) => count + 1);
  }, [latestNotification]);

  // Close notif dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openNotifications = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && unreadCount > 0) {
      try {
        await api.put("/users/notifications/read");
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      } catch { /* silent */ }
    }
  };

  const userInitials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-indigo-600 tracking-tight">
            BlindPak
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-3 sm:flex">
            {user ? (
              <>
                {/* User badge */}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Link
                    href={`/profile/${user._id}`}
                    className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                      {userInitials}
                    </div>
                    <span className="font-medium">{user.name}</span>
                    {user.role === "student" && user.university && (
                      <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 md:inline">
                        🎓 {user.university}
                      </span>
                    )}
                    {user.role === "admin" && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
                        🛡️ Admin
                      </span>
                    )}
                  </Link>
                </div>

                {/* Admin Dashboard */}
                {user.role === "admin" && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    <Shield size={15} />
                    Dashboard
                  </Link>
                )}

                {/* Notification bell */}
                {(user.role === "student" || user.role === "admin") && (
                  <div className="relative" ref={notifRef}>
                    <button
                      onClick={openNotifications}
                      className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
                      aria-label="Notifications"
                    >
                      <Bell size={20} />
                      {unreadCount > 0 && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {notifOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl"
                        >
                          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                            {notifications.length > 0 && (
                              <span className="text-xs text-gray-400">{notifications.length} total</span>
                            )}
                          </div>

                          <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <Bell size={28} className="mb-2 opacity-40" />
                                <p className="text-sm">No notifications yet</p>
                              </div>
                            ) : (
                              notifications.map((n) => (
                                <div
                                  key={n._id}
                                  className={`border-b border-gray-50 px-4 py-3 last:border-0 ${!n.read ? "bg-blue-50/50" : ""}`}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="mt-0.5 text-base">{typeIconMap[n.type] || "🔔"}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-gray-800 leading-snug">
                                        {n.postId ? (
                                          <Link
                                            href={`/posts/${n.postId}`}
                                            className="hover:text-indigo-600 transition"
                                            onClick={() => setNotifOpen(false)}
                                          >
                                            {n.message}
                                          </Link>
                                        ) : n.type === "follow" && n.actor ? (
                                          <Link
                                            href={`/profile/${n.actor._id}`}
                                            className="hover:text-indigo-600 transition"
                                            onClick={() => setNotifOpen(false)}
                                          >
                                            {n.message}
                                          </Link>
                                        ) : (
                                          n.message
                                        )}
                                      </p>
                                      <p className="mt-0.5 text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(n.createdAt))} ago
                                      </p>
                                    </div>
                                    {!n.read && (
                                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Logout */}
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-3">
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                  Login
                </Link>
                <Link href="/register" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 sm:hidden"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-100 bg-white sm:hidden"
          >
            <div className="space-y-1 px-4 pb-4 pt-2">
              {user ? (
                <>
                  <Link
                    href={`/profile/${user._id}`}
                    className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User size={16} />
                    My Profile
                    {user.role === "student" && user.university && (
                      <span className="ml-auto text-xs text-blue-700 font-semibold">🎓 {user.university}</span>
                    )}
                  </Link>

                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield size={16} />
                      Admin Dashboard
                    </Link>
                  )}

                  {(user.role === "student" || user.role === "admin") && (
                    <div className="px-3 py-2">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Notifications {unreadCount > 0 && `(${unreadCount})`}
                      </p>
                      {notifications.slice(0, 3).map((n) => (
                        <p key={n._id} className="text-xs text-gray-600 py-0.5">
                          {typeIconMap[n.type] || "🔔"} {n.message}
                        </p>
                      ))}
                      {notifications.length === 0 && <p className="text-xs text-gray-400">No notifications</p>}
                    </div>
                  )}

                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Link>
                  <Link href="/register" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50" onClick={() => setIsMenuOpen(false)}>
                    Register
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
