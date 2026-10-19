"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

interface User {
  _id: string;
  name: string;
  university?: string;
  role?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export default function MentionTextarea({
  value,
  onChange,
  placeholder = "Write a comment… use @name to mention someone",
  rows = 2,
  className = "",
  disabled = false,
}: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect @mention as user types
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart ?? 0;
    // Find the last '@' before the cursor that isn't followed by a space
    const textBefore = newValue.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      const query = atMatch[1];
      setMentionQuery(query);
      setMentionStart(cursor - atMatch[0].length);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (query.length >= 1) {
          try {
            const res = await api.get<User[]>("/users/search", { params: { q: query } });
            setSuggestions(res.data);
            setShowSuggestions(res.data.length > 0);
            setFocusedIndex(0);
          } catch {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 250);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const insertMention = (user: User) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart ?? 0);
    const inserted = `@${user.name} `;
    onChange(before + inserted + after);
    setShowSuggestions(false);
    setSuggestions([]);

    // Restore focus and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = (before + inserted).length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions[focusedIndex]) {
        e.preventDefault();
        insertMention(suggestions[focusedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full resize-none rounded border border-gray-300 p-2 text-gray-700 focus:border-blue-500 focus:outline-none ${className}`}
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 z-50 mb-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          {suggestions.map((user, idx) => (
            <li key={user._id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                  idx === focusedIndex ? "bg-blue-50 text-blue-700" : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="truncate font-medium">{user.name}</span>
                {user.university && (
                  <span className="ml-auto shrink-0 text-xs text-gray-400">{user.university}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
