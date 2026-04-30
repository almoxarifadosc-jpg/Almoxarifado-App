'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  User,
  Building2,
  X,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  phone?: string;
  contact?: string;
  is_driver?: boolean;
  created_at: string;
}

interface SuppliersViewProps {
  isAdmin?: boolean;
}

export function SuppliersView({ isAdmin }: SuppliersViewProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [filterText, setFilterText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    phone: '',
    contact: '',
    is_driver: false
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'suppliers'), orderBy('name'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Supplier[];
      setSuppliers(data);
    } catch (err: any) {
      console.error('Error fetching suppliers:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    const unsubscribe = onSnapshot(collection(db, 'suppliers'), () => {
      fetchSuppliers();
    });
    return unsubscribe;
  }, []);

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .substring(0, 18);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .substring(0, 15);
  };

  const handleOpenModal = (supplier: Supplier | null = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        cnpj: supplier.cnpj,
        phone: supplier.phone || '',
        contact: supplier.contact || '',
        is_driver: supplier.is_driver || false
      });
    } else {
      setEditingSupplier(null);
      setFormData({
        name: '',
        cnpj: '',
        phone: '',
        contact: '',
        is_driver: false
      });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cnpjDigits = formData.cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      setError('CNPJ deve ter 14 dígitos.');
      setSaving(false);
      return;
    }

    // Check for duplicates
    const duplicate = suppliers.find(s => 
      (s.name.toLowerCase() === formData.name.toLowerCase() || s.cnpj === formData.cnpj) && 
      (!editingSupplier || s.id !== editingSupplier.id)
    );

    if (duplicate) {
      if (duplicate.name.toLowerCase() === formData.name.toLowerCase()) {
        setError('Já existe um fornecedor com este nome.');
      } else {
        setError('Já existe um fornecedor com este CNPJ.');
      }
      setSaving(false);
      return;
    }

    try {
      if (editingSupplier) {
        const docRef = doc(db, 'suppliers', editingSupplier.id);
        await updateDoc(docRef, formData);
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...formData,
          created_at: serverTimestamp()
        });
      }

      setIsModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      handleFirestoreError(err, editingSupplier ? OperationType.UPDATE : OperationType.CREATE, `suppliers/${editingSupplier?.id || ''}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;
    try {
      const docRef = doc(db, 'suppliers', supplierToDelete);
      await deleteDoc(docRef);
      setIsDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `suppliers/${supplierToDelete}`);
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(filterText.toLowerCase()) ||
    s.cnpj.includes(filterText)
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="pt-8 px-4 max-w-7xl mx-auto pb-32"
    >
      <section className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">Fornecedores</h2>
            <p className="text-on-surface-variant mt-1 font-medium">Gestão de fornecedores Intercompany.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="relative flex-1 min-w-[300px] bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10">
              <input 
                type="text"
                placeholder="Buscar por nome ou CNPJ..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full bg-transparent text-on-surface border-0 rounded-xl px-4 py-2 pl-10 focus:ring-0 outline-none text-sm"
              />
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
            </div>
            {isAdmin && (
              <button 
                onClick={() => handleOpenModal()}
                className="px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Novo Fornecedor
              </button>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-on-surface-variant font-bold animate-pulse">Carregando fornecedores...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-outline-variant/30 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center text-on-surface-variant/30">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Nenhum fornecedor encontrado</h3>
            <p className="text-on-surface-variant mt-1">Adicione seu primeiro fornecedor no botão acima.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <motion.div 
              key={supplier.id}
              layout
              className="glass-card p-6 rounded-3xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 className="w-6 h-6" />
                  </div>
                  {supplier.is_driver && (
                    <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 uppercase tracking-widest">
                      <Truck className="w-3 h-3" />
                      Motorista
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenModal(supplier)}
                      className="p-2 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => {
                        setSupplierToDelete(supplier.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 hover:bg-error/10 rounded-lg text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-headline font-bold text-on-surface text-lg leading-tight truncate">
                  {supplier.name}
                </h4>
                
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">CNPJ</span>
                  <span className="text-sm font-mono font-bold tracking-tight">{supplier.cnpj}</span>
                </div>

                <div className="pt-2 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <Phone className="w-3 h-3 opacity-40 shrink-0" />
                    <span className="text-xs font-semibold truncate">{supplier.phone || 'Sem tel.'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <User className="w-3 h-3 opacity-40 shrink-0" />
                    <span className="text-xs font-semibold truncate">{supplier.contact || 'Sem cont.'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cadastro/Edição Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface-container-lowest p-8 rounded-[32px] shadow-2xl w-full max-w-md border border-outline-variant/10"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    {editingSupplier ? <Edit2 className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-headline font-extrabold text-on-surface">
                      {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h3>
                    <p className="text-sm text-on-surface-variant">Preencha os dados cadastrais</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-on-surface-variant" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 bg-error/10 text-error rounded-2xl flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-xs font-bold leading-tight">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Nome do Fornecedor</label>
                  <input 
                    type="text"
                    required
                    maxLength={100}
                    className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none" 
                    placeholder="Razão Social ou Nome Fantasia"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">CNPJ</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none font-mono" 
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Telefone</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none" 
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-1">Contato</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-container-low text-on-surface border-0 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/20 outline-none" 
                      placeholder="Nome do contato"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-4 bg-surface-container-low rounded-2xl flex items-center justify-between border border-outline-variant/5">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      formData.is_driver ? "bg-tertiary/20 text-tertiary" : "bg-on-surface/5 text-on-surface/20"
                    )}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">Este fornecedor é motorista?</p>
                      <p className="text-[10px] text-on-surface-variant">Ative para aparecer na lista de cargas.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_driver: !prev.is_driver }))}
                    className={cn(
                      "w-12 h-6 rounded-full relative transition-colors duration-200 ease-in-out",
                      formData.is_driver ? "bg-tertiary" : "bg-outline-variant/30"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out",
                      formData.is_driver ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-surface-container-high text-on-surface font-bold py-4 rounded-2xl hover:bg-surface-container-highest transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-[2] bg-primary text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-outline-variant/10 relative text-center"
            >
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center text-error mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Excluir Fornecedor</h3>
              <p className="text-sm text-on-surface-variant mb-8">
                Tem certeza que deseja excluir este fornecedor? Esta ação removerá permanentemente os dados.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 bg-surface-container-high text-on-surface font-bold py-3 rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 bg-error text-white font-bold py-3 rounded-xl shadow-lg shadow-error/20 active:scale-95 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
