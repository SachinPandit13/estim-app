import { apiClient } from '@/lib/api-client';
import type { FrameInferenceRequest, FrameInferenceResponse, DetectionEvent } from '@/types/api';

export const detectionService = {
  /**
   * Run real-time safety inference and tracking on a video/webcam frame.
   */
  async inferFrame(payload: FrameInferenceRequest): Promise<FrameInferenceResponse> {
    return apiClient<FrameInferenceResponse>('/detections/infer', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Fetch recent detection events.
   */
  async listDetections(
    cameraId?: string,
    eventType?: string,
    limit = 50,
  ): Promise<DetectionEvent[]> {
    const params = new URLSearchParams();
    if (cameraId) params.append('camera_id', cameraId);
    if (eventType) params.append('event_type', eventType);
    params.append('limit', limit.toString());
    return apiClient<DetectionEvent[]>(`/detections?${params.toString()}`);
  },
};
