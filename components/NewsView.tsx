'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, Send, Trash2, Calendar, User, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

interface NewsPost {
  id?: string;
  title: string;
  content: string;
  author: string;
  created_at: any;
}

interface NewsViewProps {
  isAdmin: boolean;
  currentUserEmail: string;
}

export default function NewsView({ isAdmin, currentUserEmail }: NewsViewProps) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'news_posts'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const news = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsPost));
      setPosts(news);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'news_posts'), {
        title: title.trim(),
        content: content.trim(),
        author: currentUserEmail,
        created_at: serverTimestamp()
      });
      setTitle('');
      setContent('');
    } catch (err) {
      console.error('Erro ao postar notícia:', err);
      alert('Erro ao postar notícia.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta notícia?')) return;
    try {
      await deleteDoc(doc(db, 'news_posts', id));
    } catch (err) {
      console.error('Erro ao deletar notícia:', err);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Agora';
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Data inválida';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-headline font-extrabold text-on-surface">Portal de Notícias</h2>
          <p className="text-on-surface-variant mt-1">Comunicados e atualizações do almoxarifado</p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Newspaper className="w-6 h-6 text-primary" />
        </div>
      </div>

      {isAdmin && (
        <section className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
          <h3 className="text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Nova Publicação
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Título da Notícia</label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm"
                placeholder="Ex: Novo procedimento de recebimento"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Conteúdo</label>
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm resize-none"
                placeholder="Escreva a notícia aqui... Pressione Enter para novos parágrafos."
                required
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-8 py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Publicar Notícia
            </button>
          </form>
        </section>
      )}

      <div className="space-y-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-on-surface-variant font-medium">Carregando portal...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center">
              <Newspaper className="w-8 h-8 text-on-surface-variant/30" />
            </div>
            <p className="text-on-surface-variant font-bold">Nenhuma notícia encontrada</p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {posts.map((post) => (
                <motion.article 
                  key={post.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/10 shadow-sm transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-on-surface">{post.title}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-on-surface-variant/60">
                        <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {formatDate(post.created_at)}</span>
                        <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> {post.author.split('@')[0]}</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => post.id && handleDelete(post.id)}
                        className="p-2 text-error/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
