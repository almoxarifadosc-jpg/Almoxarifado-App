'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Send, User, Calendar, Upload, X, Search, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { NewsPost } from '@/app/page';

interface LaunchViewProps {
  posts: NewsPost[];
  onAddPost: (post: NewsPost) => void;
  onUpdatePost: (post: NewsPost) => void;
  onDeletePost: (id: string) => void;
  filter: string;
  onFilterChange: (val: string) => void;
}

export function LaunchView({ posts, onAddPost, onUpdatePost, onDeletePost, filter, onFilterChange }: LaunchViewProps) {
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setText(post.text);
    setAuthor(post.author);
    setImageFile(post.imageUrl || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText('');
    setAuthor('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text || !author) return;

    if (editingId) {
      onUpdatePost({
        id: editingId,
        imageUrl: imageFile || undefined,
        text,
        author,
        date: posts.find(p => p.id === editingId)?.date || new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      });
      setEditingId(null);
    } else {
      const newPost: NewsPost = {
        id: Date.now().toString(),
        imageUrl: imageFile || undefined,
        text,
        author,
        date: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      };
      onAddPost(newPost);
    }

    setImageFile(null);
    setText('');
    setAuthor('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="pt-24 px-6 max-w-5xl mx-auto pb-32"
    >
      <div className="mb-10">
        <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">Portal de Notícias</h2>
        <p className="text-on-surface-variant font-body">Compartilhe atualizações e informações importantes do Almoxarifado Ventisol.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Post Creation Form */}
        <div className="lg:col-span-5 glass-card p-6 rounded-xl shadow-sm border border-outline-variant/10 sticky top-24 z-30 bg-surface/95 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline font-bold text-lg flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              {editingId ? 'Editar Postagem' : 'Nova Postagem'}
            </h3>
            {editingId && (
              <button onClick={cancelEdit} className="text-xs font-bold text-error hover:underline">Cancelar</button>
            )}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Imagem (Opcional)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full aspect-video bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-high transition-all overflow-hidden"
                style={{ height: 'auto', minHeight: '60px' }}
              >
                {imageFile ? (
                  <div className="relative w-full h-24">
                    <Image src={imageFile} alt="Preview" fill className="object-cover" />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="py-4 flex flex-col items-center">
                    <Upload className="w-5 h-5 text-on-surface-variant/40 mb-1" />
                    <span className="text-[10px] text-on-surface-variant font-medium">Upload</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Seu Nome</label>
              <div className="relative">
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-2.5 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm" 
                  placeholder="Nome do autor"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  required
                />
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 px-1">Texto Informativo</label>
              <textarea 
                className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm min-h-[100px] resize-none" 
                placeholder="O que está acontecendo?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
              />
            </div>

            <button 
              className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
              type="submit"
            >
              {editingId ? 'Salvar Alterações' : 'Publicar Notícia'}
            </button>
          </form>
        </div>

        {/* News Feed */}
        <div className="lg:col-span-7 space-y-6">
          {/* Filter */}
          <div className="sticky top-[480px] lg:relative lg:top-0 z-20 bg-surface/95 backdrop-blur-md py-2 -mx-2 px-2 rounded-xl border border-outline-variant/10 lg:border-0 lg:bg-transparent lg:backdrop-blur-none shadow-sm lg:shadow-none">
            <div className="relative">
              <input 
                type="text"
                placeholder="Pesquisar notícias..."
                value={filter}
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm shadow-sm"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div 
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm group"
              >
                {post.imageUrl && (
                  <div className="relative h-48 w-full bg-surface-container-low">
                    <Image 
                      src={post.imageUrl} 
                      alt="Notícia" 
                      fill 
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-primary">
                      <User className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{post.author}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{post.date}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(post)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeletePost(post.id)} className="p-1.5 text-error hover:bg-error/10 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-on-surface font-medium leading-relaxed">
                    {post.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {posts.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant/50 font-medium">
              Nenhuma notícia encontrada.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
