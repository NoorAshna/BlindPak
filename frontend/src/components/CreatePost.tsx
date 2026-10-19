"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ImageIcon, Send } from 'lucide-react';

interface FormData {
  title: string;
  content: string;
}

export default function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { register, handleSubmit, reset, watch } = useForm<FormData>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const contentValue = watch('content', '');

  if (user?.role !== 'student' && user?.role !== 'admin') return null;

  const onSubmit = async (data: FormData) => {
    if (!data.content?.trim()) {
      showToast('Post content cannot be empty', 'warning');
      return;
    }

    setLoading(true);
    try {
      await api.post('/posts', { content: data.content.trim(), title: data.title?.trim() || null });
      reset();
      setExpanded(false);
      onPostCreated();
      showToast('Post created successfully! 🎉', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || 'Failed to create post', 'error');
    } finally {
      setLoading(false);
    }
  };

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {userInitials}
          </div>

          <div className="flex-1">
            {/* Content textarea */}
            <textarea
              {...register('content', { required: true })}
              placeholder="What's on your mind? Share anonymously…"
              onFocus={() => setExpanded(true)}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none transition"
              rows={expanded ? 3 : 2}
            />

            {/* Optional heading + submit — visible when expanded */}
            {expanded && (
              <div className="mt-2 space-y-2">
                <input
                  {...register('title')}
                  type="text"
                  placeholder="Add a heading (optional)"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-sm font-semibold text-gray-800 placeholder-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none transition"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {contentValue.length > 0 && `${contentValue.length} chars`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { reset(); setExpanded(false); }}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !contentValue.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      <Send size={14} />
                      {loading ? 'Posting…' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
