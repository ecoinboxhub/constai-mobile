export interface CompanyDTO {
  id: number;
  name: string;
  industry?: string;
  country?: string;
  contact_email?: string;
  subscription_tier: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserDTO {
  id: number;
  username: string;
  role: string;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDTO {
  id: number;
  name: string;
  contractor_name: string;
  location: string;
  state?: string;
  lga?: string;
  project_type: string;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  project_status: string;
  budget_allocated?: number;
  budget_spent?: number;
  workforce_count?: number;
  equipment_count?: number;
  material_cost?: number;
  completion_percentage?: number;
  weather_delay_days?: number;
  safety_incidents?: number;
  inspection_score?: number;
  task_completion_rate?: number;
  daily_progress_rate?: number;
  delay_status: string;
  risk_level: string;
  created_by?: number;
  company_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkforceDTO {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  skills?: string;
  is_active: boolean;
  company_id: number;
  project_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectDocumentDTO {
  id: number;
  project_id?: number;
  company_id?: number;
  file_name: string;
  source_path?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DelayPredictionDTO {
  id: number;
  project_id?: number;
  company_id?: number;
  features_json: Record<string, any>;
  delay_risk: number;
  will_delay: boolean;
  model_version: string;
  created_at?: string;
}

export interface SupplierQuoteDTO {
  id: number;
  supplier: string;
  material: string;
  location: string;
  price_ngn: number;
  unit: string;
  reliability_score?: number;
  forecast_price_ngn?: number;
  source_url?: string;
  scraped_at?: string;
}

export interface WeatherLogDTO {
  id: number;
  city: string;
  temperature_c: number;
  rainfall_mm: number;
  wind_speed_kmh: number;
  humidity_pct: number;
  condition: string;
  fetched_at?: string;
}

export interface SafetyFindingDTO {
  id: number;
  project_id?: number;
  log_text: string;
  findings_json: Record<string, any>;
  overall_risk_level: string;
  model_version: string;
  created_at?: string;
  company_id?: number;
}

// Offline Mobile-Specific Sync Schemas
export interface MobileTaskDTO {
  id: string; // UUID locally
  project_id: string; // parent project uuid
  name: string;
  description?: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface MobileInspectionDTO {
  id: string; // UUID locally
  project_id: string;
  title: string;
  inspector: string;
  score: number;
  notes?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  created_at: string;
}

export interface MobileUploadDTO {
  id: string; // UUID locally
  project_id: string;
  file_name: string;
  file_uri: string;
  file_type: string;
  is_uploaded: boolean;
  created_at: string;
}

export interface SyncQueueItem {
  id?: number;
  client_uuid: string;
  table_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  payload: string; // Serialized JSON object
  is_dirty: number; // 1 = dirty, 0 = synced
  created_at?: string;
}
