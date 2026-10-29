export type Role = 'admin' | 'supervisor' | 'member';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';
export type CameraStatus = 'online' | 'offline' | 'error';
export type CameraSourceType = 'rtsp' | 'ip' | 'webcam' | 'usb';

export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  email: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
  password?: string;
}

export interface Camera {
  id: string;
  name: string;
  description?: string | null;
  source_type: string;
  stream_url?: string | null;
  dvr_channel?: number | null;
  location?: string | null;
  is_enabled: boolean;
  status: CameraStatus;
  last_connected_at?: string | null;
  last_error?: string | null;
  config?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CameraCreateInput {
  name: string;
  description?: string;
  source_type?: string;
  stream_url?: string;
  rtsp_username?: string;
  rtsp_password?: string;
  dvr_channel?: number;
  location?: string;
  is_enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface CameraTestResult {
  reachable: boolean;
  status: string;
  message: string;
  latency_ms?: number | null;
}

export interface Zone {
  id: string;
  camera_id: string;
  name: string;
  description?: string | null;
  roi_polygon?: number[][] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ZoneCreateInput {
  camera_id: string;
  name: string;
  description?: string;
  roi_polygon?: number[][];
  is_active?: boolean;
}

export interface DetectionEvent {
  id: string;
  camera_id?: string | null;
  zone_id?: string | null;
  event_type: string;
  confidence: number;
  bounding_box?: Record<string, unknown> | null;
  snapshot_url?: string | null;
  video_clip_url?: string | null;
  metadata_json?: Record<string, unknown> | null;
  detected_at: string;
  created_at: string;
}

export interface SafetyIncident {
  id: string;
  incident_type: string;
  severity: IncidentSeverity;
  camera_id?: string | null;
  zone_id?: string | null;
  status: IncidentStatus;
  first_detected_at: string;
  last_detected_at: string;
  detection_count: number;
  evidence_snapshot?: string | null;
  assigned_to_id?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  incident_id?: string | null;
  camera_id?: string | null;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface DashboardSummary {
  total_cameras: number;
  online_cameras: number;
  open_incidents_today: number;
  critical_incidents_today: number;
  violations_by_type: Record<string, number>;
}

export interface DbPoolStatus {
  status: string;
  pool_info?: Record<string, unknown>;
  message: string;
}

export interface TrackedObject {
  track_id: number;
  class_name: string;
  confidence: number;
  bbox: number[]; // [x_min, y_min, x_max, y_max] normalized 0.0 - 1.0
  has_helmet: boolean;
  has_vest: boolean;
  is_fallen: boolean;
  violation_type?: string | null;
  current_zone_name?: string | null;
  status: 'compliant' | 'warning' | 'violation';
}

export interface FrameInferenceRequest {
  camera_id: string;
  image_base64?: string;
  trigger_incidents?: boolean;
  simulated_detections?: Array<{
    bbox?: number[];
    confidence?: number;
    has_helmet?: boolean;
    has_vest?: boolean;
    is_fallen?: boolean;
  }>;
  environmental_hazards?: string[];
}

export interface FrameInferenceResponse {
  camera_id: string;
  timestamp: string;
  tracked_workers: TrackedObject[];
  violations_detected: string[];
  hazards_detected?: string[];
  incident_created: boolean;
  incident_id?: string | null;
  zone_alerts: string[];
}
