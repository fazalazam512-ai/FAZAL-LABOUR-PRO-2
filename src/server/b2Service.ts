import crypto from 'crypto';

interface B2AuthData {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  expiresAt: number;
}

export class BackblazeB2Service {
  private keyId: string;
  private applicationKey: string;
  public bucketName: string;
  public bucketId: string;
  public endpoint: string;

  private authCache: B2AuthData | null = null;

  constructor(config?: {
    keyId?: string;
    applicationKey?: string;
    bucketName?: string;
    bucketId?: string;
    endpoint?: string;
  }) {
    this.keyId = config?.keyId || process.env.B2_KEY_ID || 'd3802bfae316';
    this.applicationKey = config?.applicationKey || process.env.B2_APPLICATION_KEY || '0053e1824a22958ee62b44f19e04184e9eca4bd14b';
    this.bucketName = config?.bucketName || process.env.B2_BUCKET_NAME || 'Smartexpense';
    this.bucketId = config?.bucketId || process.env.B2_BUCKET_ID || '0dd37800427b1ffaae130116';
    this.endpoint = config?.endpoint || process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';
  }

  /**
   * Authorize account with Backblaze B2 and cache auth token
   */
  async authorize(): Promise<B2AuthData> {
    const now = Date.now();
    if (this.authCache && this.authCache.expiresAt > now + 60000) {
      return this.authCache;
    }

    const credentials = Buffer.from(`${this.keyId}:${this.applicationKey}`).toString('base64');
    const response = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Backblaze B2 authorization failed (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    this.authCache = {
      accountId: data.accountId,
      authorizationToken: data.authorizationToken,
      apiUrl: data.apiInfo.storageApi.apiUrl,
      downloadUrl: data.apiInfo.storageApi.downloadUrl,
      // Tokens are valid for 24 hours, expire cached token after 20 hours
      expiresAt: now + 20 * 60 * 60 * 1000,
    };

    return this.authCache;
  }

  /**
   * Verify credentials and bucket connectivity
   */
  async verifyConnection(): Promise<{
    connected: boolean;
    bucketName: string;
    bucketId: string;
    endpoint: string;
    fileCount?: number;
    error?: string;
  }> {
    try {
      const auth = await this.authorize();
      const listRes = await fetch(
        `${auth.apiUrl}/b2api/v3/b2_list_file_names?bucketId=${this.bucketId}&maxFileCount=10`,
        {
          headers: {
            Authorization: auth.authorizationToken,
          },
        }
      );

      if (!listRes.ok) {
        const errText = await listRes.text();
        return {
          connected: false,
          bucketName: this.bucketName,
          bucketId: this.bucketId,
          endpoint: this.endpoint,
          error: `Failed to list files: ${errText}`,
        };
      }

      const listData = await listRes.json();
      return {
        connected: true,
        bucketName: this.bucketName,
        bucketId: this.bucketId,
        endpoint: this.endpoint,
        fileCount: listData.files?.length ?? 0,
      };
    } catch (err: any) {
      return {
        connected: false,
        bucketName: this.bucketName,
        bucketId: this.bucketId,
        endpoint: this.endpoint,
        error: err?.message || 'Connection failed',
      };
    }
  }

  /**
   * Upload buffer to Backblaze B2 and return download URL
   */
  async uploadFile(params: {
    fileName: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{
    fileId: string;
    fileName: string;
    downloadUrl: string;
    contentLength: number;
  }> {
    const auth = await this.authorize();

    // 1. Get an upload URL for the bucket
    const getUploadUrlRes = await fetch(
      `${auth.apiUrl}/b2api/v3/b2_get_upload_url?bucketId=${this.bucketId}`,
      {
        headers: {
          Authorization: auth.authorizationToken,
        },
      }
    );

    if (!getUploadUrlRes.ok) {
      const errText = await getUploadUrlRes.text();
      throw new Error(`Failed to get B2 upload URL: ${errText}`);
    }

    const uploadUrlData = await getUploadUrlRes.json();
    const sha1 = crypto.createHash('sha1').update(params.buffer).digest('hex');

    // 2. Upload the file payload
    const uploadRes = await fetch(uploadUrlData.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadUrlData.authorizationToken,
        'X-Bz-File-Name': encodeURIComponent(params.fileName).replace(/%2F/g, '/'),
        'Content-Type': params.contentType,
        'Content-Length': params.buffer.length.toString(),
        'X-Bz-Content-Sha1': sha1,
      },
      body: new Uint8Array(params.buffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to upload file to B2: ${errText}`);
    }

    const uploadedData = await uploadRes.json();

    // 3. Generate a download URL with authorization token for 7 days (604800 seconds)
    const signedDownloadUrl = await this.getDownloadUrl(params.fileName, 604800);

    return {
      fileId: uploadedData.fileId,
      fileName: uploadedData.fileName,
      downloadUrl: signedDownloadUrl,
      contentLength: uploadedData.contentLength,
    };
  }

  /**
   * Get authorized download URL for a file in private bucket
   */
  async getDownloadUrl(fileName: string, validDurationInSeconds: number = 604800): Promise<string> {
    const auth = await this.authorize();

    // Authorize download for the prefix or file
    const authRes = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_download_authorization`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: this.bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds,
      }),
    });

    if (!authRes.ok) {
      // Fallback to direct URL if authorization token creation fails
      return `${auth.downloadUrl}/file/${this.bucketName}/${fileName}`;
    }

    const authData = await authRes.json();
    return `${auth.downloadUrl}/file/${this.bucketName}/${fileName}?Authorization=${authData.authorizationToken}`;
  }

  /**
   * Download file content as UTF-8 string or buffer
   */
  async downloadFileText(fileName: string): Promise<string> {
    const auth = await this.authorize();
    const signedUrl = await this.getDownloadUrl(fileName, 3600);

    const res = await fetch(signedUrl);
    if (!res.ok) {
      throw new Error(`Failed to download file ${fileName} (${res.status})`);
    }

    return await res.text();
  }

  /**
   * Download file content as raw Buffer with content-type
   */
  async downloadFileBuffer(fileName: string): Promise<{ buffer: Buffer; contentType: string }> {
    const auth = await this.authorize();
    const signedUrl = await this.getDownloadUrl(fileName, 3600);

    const res = await fetch(signedUrl);
    if (!res.ok) {
      throw new Error(`Failed to download file ${fileName} (${res.status})`);
    }

    const contentType = res.headers.get('content-type') || 'image/png';
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  }

  /**
   * List files in bucket with optional prefix
   */
  async listFiles(prefix?: string, maxFileCount: number = 50): Promise<Array<{
    fileId: string;
    fileName: string;
    contentLength: number;
    uploadTimestamp: number;
    downloadUrl: string;
  }>> {
    const auth = await this.authorize();
    const query = new URLSearchParams({
      bucketId: this.bucketId,
      maxFileCount: maxFileCount.toString(),
    });
    if (prefix) {
      query.append('prefix', prefix);
    }

    const res = await fetch(`${auth.apiUrl}/b2api/v3/b2_list_file_names?${query.toString()}`, {
      headers: {
        Authorization: auth.authorizationToken,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to list files: ${errText}`);
    }

    const data = await res.json();
    const files = data.files || [];

    // Get signed URLs
    const results = await Promise.all(
      files.map(async (f: any) => {
        const downloadUrl = await this.getDownloadUrl(f.fileName, 86400).catch(
          () => `${auth.downloadUrl}/file/${this.bucketName}/${f.fileName}`
        );
        return {
          fileId: f.fileId,
          fileName: f.fileName,
          contentLength: f.contentLength,
          uploadTimestamp: f.uploadTimestamp,
          downloadUrl,
        };
      })
    );

    return results;
  }

  /**
   * Get direct upload URL for client presigned PUT upload
   */
  async getUploadUrlDirect(_fileName: string, _contentType: string): Promise<string> {
    const auth = await this.authorize();
    const res = await fetch(`${auth.apiUrl}/b2api/v3/b2_get_upload_url`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucketId: this.bucketId,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to get upload URL: ${errText}`);
    }

    const data = await res.json();
    return data.uploadUrl;
  }

  /**
   * Delete file by fileName
   */
  async deleteFile(fileName: string): Promise<void> {
    const auth = await this.authorize();
    const listRes = await fetch(
      `${auth.apiUrl}/b2api/v3/b2_list_file_names?bucketId=${this.bucketId}&prefix=${encodeURIComponent(fileName)}&maxFileCount=1`,
      {
        headers: {
          Authorization: auth.authorizationToken,
        },
      }
    );

    if (!listRes.ok) return;
    const listData = await listRes.json();
    const file = listData.files?.[0];
    if (!file) return;

    await fetch(`${auth.apiUrl}/b2api/v3/b2_delete_file_version`, {
      method: 'POST',
      headers: {
        Authorization: auth.authorizationToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.fileName,
        fileId: file.fileId,
      }),
    });
  }
}

export const b2Service = new BackblazeB2Service();
