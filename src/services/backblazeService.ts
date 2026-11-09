/**
 * Backblaze B2 Client Service (via Render.com Backend Proxy)
 * ZERO SECRET KEYS IN FRONTEND.
 * All Backblaze credentials stay 100% server-side on Render.com backend environment variables.
 */

export interface B2Status {
  connected: boolean;
  bucketName: string;
  endpoint?: string;
  error?: string;
}

export interface B2UploadResult {
  success: boolean;
  fileId?: string;
  fileName: string;
  url: string;
  size?: number;
  error?: string;
}

export interface B2CloudFile {
  fileId: string;
  fileName: string;
  contentLength: number;
  uploadTimestamp: number;
  downloadUrl: string;
}

// Connected to your live Render.com Web Service
const RENDER_API_BASE = (
  import.meta.env.VITE_RENDER_API_URL || 'https://smart-expense-0d1h.onrender.com'
).replace(/\/$/, '');

class BackblazeService {
  public bucketName = 'Smartexpense';
  public endpoint = 's3.us-east-005.backblazeb2.com';

  /**
   * Health check to verify Render backend and Backblaze B2 connectivity
   */
  async checkConnection(): Promise<B2Status> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        return {
          connected: data.status === 'ok',
          bucketName: data.bucket || this.bucketName,
          endpoint: this.endpoint,
        };
      }
      return {
        connected: false,
        bucketName: this.bucketName,
        error: `Backend responded with HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        connected: false,
        bucketName: this.bucketName,
        error: err?.message || 'Could not reach backend proxy server',
      };
    }
  }

  /**
   * Secure Receipt Upload:
   * 1. Requests a secure pre-signed PUT URL from Render backend
   * 2. Uploads binary data directly to Backblaze B2 using the pre-signed URL
   * 3. Requests pre-signed view URL for high-resolution preview and zoom
   * ZERO secret keys are ever exposed to the client!
   */
  async uploadReceipt(file: File, userId: string = 'default_user'): Promise<B2UploadResult> {
    try {
      const contentType = file.type || 'image/png';

      // 1. Ask backend for presigned upload URL
      const urlResponse = await fetch(`${RENDER_API_BASE}/api/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType,
          userId,
          folder: 'receipts',
        }),
      });

      if (!urlResponse.ok) {
        const errText = await urlResponse.text();
        throw new Error(`Failed to get upload URL: ${errText}`);
      }

      const { uploadUrl, fileKey } = await urlResponse.json();

      // 2. Upload directly to Backblaze B2 using the presigned PUT URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload to storage failed (${uploadResponse.status})`);
      }

      // 3. Request presigned view URL for previewing and zoom modal
      const viewResponse = await fetch(`${RENDER_API_BASE}/api/view-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey }),
      });

      let viewUrl = uploadUrl.split('?')[0]; // fallback
      if (viewResponse.ok) {
        const viewData = await viewResponse.json();
        viewUrl = viewData.viewUrl || viewUrl;
      }

      return {
        success: true,
        fileName: fileKey,
        url: viewUrl,
        size: file.size,
      };
    } catch (err: any) {
      console.error('Secure receipt upload error:', err);
      return {
        success: false,
        fileName: file.name,
        url: '',
        error: err?.message || 'Failed to upload receipt',
      };
    }
  }

  /**
   * Get presigned view URL for high-res preview and zoom
   */
  async getViewUrl(fileKey: string): Promise<string> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/view-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.viewUrl;
      }
      return '';
    } catch (err) {
      console.error('Error fetching view URL:', err);
      return '';
    }
  }

  /**
   * Get presigned download URL with Content-Disposition attachment for PNG format
   */
  async getDownloadUrl(fileKey: string, fileName?: string): Promise<string> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/download-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey, fileName }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.downloadUrl;
      }
      return '';
    } catch (err) {
      console.error('Error fetching download URL:', err);
      return '';
    }
  }

  /**
   * Delete file from Backblaze B2
   */
  async deleteFile(fileKey: string, userId?: string): Promise<boolean> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/delete-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileKey, userId }),
      });
      return res.ok;
    } catch (err) {
      console.error('Error deleting file:', err);
      return false;
    }
  }

  /**
   * Backup application state to Backblaze via backend
   */
  async backupData(payload: any, userId: string = 'default_user'): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/b2/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload, userId }),
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, error: `Backup failed (${res.status})` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to backup' };
    }
  }

  /**
   * Fetch latest cloud backup from Backblaze via backend
   */
  async fetchLatestBackup(userId: string = 'default_user'): Promise<any | null> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/b2/backup/latest?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * List files from backend
   */
  async listFiles(): Promise<B2CloudFile[]> {
    try {
      const res = await fetch(`${RENDER_API_BASE}/api/b2/files`);
      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const backblazeService = new BackblazeService();
