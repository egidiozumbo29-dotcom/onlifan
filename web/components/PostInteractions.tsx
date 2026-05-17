'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; displayName: string; avatarUrl?: string | null };
};

type Props = {
  postId: string;
  initialLikes: number;
  initialComments: number;
  /** If true, the post is locked behind paywall and interactions are disabled. */
  locked?: boolean;
};

export function PostInteractions({ postId, initialLikes, initialComments, locked }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [likeDelta, setLikeDelta] = useState(0);
  const [busyLike, setBusyLike] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(initialComments);

  useEffect(() => {
    if (!showComments || comments.length > 0) return;
    setLoadingComments(true);
    api
      .get<{ items: Comment[] }>(`/posts/${postId}/comments`)
      .then((res) => setComments(res.items ?? []))
      .catch(() => setComments([]))
      .finally(() => setLoadingComments(false));
  }, [showComments, postId, comments.length]);

  const onLike = async () => {
    if (locked) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setBusyLike(true);
    try {
      if (liked) {
        await api.delete(`/posts/${postId}/like`, true);
        setLiked(false);
        setLikeDelta((d) => d - 1);
      } else {
        await api.post(`/posts/${postId}/like`, {}, true);
        setLiked(true);
        setLikeDelta((d) => d + 1);
      }
    } catch {
      // Likely paywall (403) — silent fail
    } finally {
      setBusyLike(false);
    }
  };

  const onSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const created = await api.post<Comment>(
        `/posts/${postId}/comments`,
        { body: newComment.trim() },
        true,
      );
      setComments((c) => [
        {
          ...created,
          user: created.user ?? { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl },
        },
        ...c,
      ]);
      setCommentCount((n) => n + 1);
      setNewComment('');
    } catch {
      /* ignore */
    } finally {
      setSubmittingComment(false);
    }
  };

  const totalLikes = initialLikes + likeDelta;

  return (
    <div className="mt-4 pt-3 border-t border-[var(--border)]">
      <div className="flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={onLike}
          disabled={busyLike || locked}
          className={`inline-flex items-center gap-1.5 transition ${
            liked ? 'text-pink-400' : 'text-zinc-400 hover:text-pink-300'
          } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={liked ? 'Rimuovi like' : 'Like'}
        >
          <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
          <span>{totalLikes}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowComments((s) => !s)}
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition"
        >
          <span className="text-lg">💬</span>
          <span>{commentCount}</span>
          <span className="text-zinc-500">{showComments ? '· nascondi' : '· apri'}</span>
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-3">
          {user && !locked ? (
            <form onSubmit={onSubmitComment} className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Scrivi un commento…"
                className="input flex-1 text-sm"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={submittingComment || !newComment.trim()}
                className="btn-primary text-sm px-4"
              >
                Invia
              </button>
            </form>
          ) : !user ? (
            <p className="text-xs text-zinc-500">
              <a href="/login" className="text-pink-400 hover:underline">Accedi</a> per commentare.
            </p>
          ) : null}

          {loadingComments ? (
            <p className="text-sm text-zinc-500">Caricamento commenti…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-zinc-500">Nessun commento ancora. Sii il primo.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {c.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-white/[0.03] rounded-lg p-2 border border-[var(--border)]">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{c.user.displayName}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(c.createdAt).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-zinc-300 mt-0.5">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
