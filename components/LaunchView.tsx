'use client';

import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Send, User, Calendar, Upload, X, Search, Pencil, Trash2, Plus } from 'lucide-react';
import Image from 'next/image';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setIsModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setText('');
    setAuthor('');
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsModalOpen(false);
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
    setIsModalOpen(false);
  };

  return (
    <div className="pt-24 px-6 max-w-4xl mx-auto pb-32">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight mb-2">Portal de Informações</h2>
          <p className="text-on-surface-variant font-body">Compartilhe atualizações e informações importantes do Almoxarifado Ventisol.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setText('');
            setAuthor('');
            setImageFile(null);
            setIsModalOpen(true);
          }}
          className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          Nova Postagem
        </button>
      </div>

      <div className="space-y-6">
        {/* Filter */}
        <div className="sticky top-24 z-20 bg-surface/95 backdrop-blur-md py-2 -mx-2 px-2 rounded-xl border border-outline-variant/10 shadow-sm">
          <div className="relative">
            <input 
              type="text"
              placeholder="Pesquisar informações..."
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 pl-10 focus:ring-1 focus:ring-primary outline-none text-sm shadow-sm"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          </div>
        </div>

        {/* News Feed */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div 
              key={post.id}
              className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10 shadow-sm group"
            >
                {post.imageUrl && (
                  <div className="relative h-64 w-full bg-surface-container-low">
                    <Image 
                      src={post.imageUrl} 
                      alt="Informação" 
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
              </div>
            ))}
          {posts.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant/50 font-medium">
              Nenhuma informação encontrada.
            </div>
          )}
        </div>
      </div>

      {/* Post Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-outline-variant/20 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-headline font-extrabold flex items-center gap-2">
                  <Send className="w-6 h-6 text-primary" />
                  {editingId ? 'Editar Postagem' : 'Nova Postagem'}
                </h3>
                <button onClick={cancelEdit} className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Imagem (Opcional)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full aspect-video bg-surface-container-low border-2 border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-high transition-all overflow-hidden"
                  >
                    {imageFile ? (
                      <div className="relative w-full h-full">
                        <Image src={imageFile} alt="Preview" fill className="object-cover" />
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="py-8 flex flex-col items-center">
                        <Upload className="w-8 h-8 text-on-surface-variant/40 mb-2" />
                        <span className="text-xs text-on-surface-variant font-medium">Clique para fazer upload</span>
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
                
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Seu Nome</label>
                  <div className="relative">
                    <input 
                      className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 pl-11 focus:ring-1 focus:ring-primary outline-none text-sm" 
                      placeholder="Nome do autor"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                    />
                    <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Texto Informativo</label>
                  <textarea 
                    className="w-full bg-surface-container-low border-0 rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary outline-none text-sm min-h-[150px] resize-none" 
                    placeholder="O que deseja compartilhar?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 px-6 py-3 bg-surface-container-high text-on-surface font-bold rounded-xl hover:bg-surface-container-highest transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    className="flex-[2] bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all text-sm"
                    type="submit"
                  >
                    {editingId ? 'Salvar Alterações' : 'Publicar Informação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }
