import SeparationDashboardView from "@/components/SeparationDashboardView";

export interface Operation {
  id: string;
  line: string;
  quantity: number;
  date: string;
  progress: number;
  steps: boolean[];
  iconType?: 'factory' | 'settings' | 'check';
  isCompleted?: boolean;
  isUrgente?: boolean;
  isLicitacao?: boolean;
  isAtrasada?: boolean;
  createdAt?: string;
}

export interface NewsPost {
  id: string;
  imageUrl?: string;
  text: string;
  author: string;
  date: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category?: string;
  allowed_groups?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_viewer?: boolean;
  is_conferente?: boolean;
  created_at?: string;
}

export interface ProductionLine {
  id?: string;
  name: string;
}

export interface Setting {
  id?: string;
  key: string;
  value: string;
}

export interface Supplier {
  id?: string;
  name: string;
  cnpj?: string;
  is_driver?: boolean;
}

export interface LoadType {
  id?: string;
  name: string;
  color: string;
}

export interface Receipt {
  id?: string;
  load_id: string;
  invoices: string[];
  driver: string;
  supplier_name: string;
  load_type: string;
  load_type_color?: string;
  status: string;
  observation?: string;
  image_url?: string;
  divergence_observation?: string;
  divergence_photo_url?: string;
  author_id: string;
  created_at: string;
  updated_at?: string;
  updated_by_name?: string;
  invoice_count: number;
  status_history?: Record<string, any>;
}

export interface PurchaseOrder {
  id?: string;
  order_number: string;
  supplier_name: string;
  product_location: string;
  date: string;
  total_amount: number;
  items?: any[];
  status: string;
  pdf_url?: string;
  created_at?: string;
  assigned_users?: string[];
  conferred_by_id?: string;
  conferred_by_name?: string;
  conferred_at?: string;
  is_signed?: boolean;
  signed_at?: string;
  signed_by_name?: string;
  signature_url?: string;
  sequence?: number;
  pis?: string[];
  observation?: string;
  photos?: string[];
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <SeparationDashboardView />
    </main>
  );
}
