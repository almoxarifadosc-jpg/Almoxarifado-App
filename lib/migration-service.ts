import { supabase, isSupabaseConfigured } from './supabase';
import { db } from './firebase';
import { collection, doc, setDoc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

export async function migrateData(onProgress?: (tableName: string, index: number, total: number) => void) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não está configurado. Verifique as variáveis de ambiente.');
  }

  const tables = [
    'profiles',
    'operations',
    'news_posts',
    'production_lines',
    'settings',
    'suppliers',
    'load_types',
    'receipts',
    'purchase_orders'
  ];

  const results: Record<string, string> = {};

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    try {
      if (onProgress) onProgress(table, i, tables.length);
      console.log(`Buscando dados da tabela: ${table}...`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.error(`Erro ao buscar dados do Supabase para ${table}:`, error);
        results[table] = `Error fetching: ${error.message}`;
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`Tabela ${table} está vazia.`);
        results[table] = 'No data to migrate';
        continue;
      }

      console.log(`Migrando ${data.length} registros da tabela ${table}...`);
      const colRef = collection(db, table);
      const CHUNK_SIZE = 500;
      let migratedCount = 0;

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const rawId = item.id || item.key || item.order_number || item.load_id;
          const docId = rawId ? String(rawId) : Math.random().toString(36).substring(2, 10);
          const docRef = doc(colRef, docId);
          
          const cleanData = JSON.parse(JSON.stringify(item));
          batch.set(docRef, cleanData);
        }

        await batch.commit();
        migratedCount += chunk.length;
      }

      results[table] = `Successfully migrated ${migratedCount} records`;
    } catch (err: any) {
      console.error(`Migration error for ${table}:`, err);
      results[table] = `Fatal error: ${err.message}`;
    }
  }

  return results;
}
