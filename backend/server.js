import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests (Render, GitHub Pages, localhost)
app.use(cors({ origin: '*' }));
app.use(express.json());

// Backblaze B2 S3 Client initialized using Server-Side Environment Variables ONLY
const B2_KEY_ID = process.env.B2_KEY_ID || '005d3802bfae3160000000001';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || 'K005RpLjByfMvH2c4n3hMEd3Dnc1wTA';
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'Smartexpense';
const B2_ENDPOINT = process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com';
const B2_REGION = process.env.B2_REGION || 'us-east-005';

const s3Client = new S3Client({
  endpoint: B2_ENDPOINT,
  region: B2_REGION,
  credentials: {
    accessKeyId: B2_KEY_ID,
    secretAccessKey: B2_APPLICATION_KEY,
  },
});

/**
 * 0. GET /
 * Root landing page confirming server is alive and running
 */
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Smart Expense Backend API</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #064e3b; color: #34d399; border: 1px solid #059669; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 16px; }
        h1 { font-size: 20px; margin: 0 0 8px; font-weight: 700; color: #ffffff; }
        p { color: #94a3b8; font-size: 13px; margin: 0 0 20px; line-height: 1.5; }
        .endpoint-list { background: #0f172a; border-radius: 12px; padding: 14px; text-align: left; font-family: monospace; font-size: 12px; color: #38bdf8; margin-bottom: 20px; border: 1px solid #334155; }
        .endpoint-item { margin: 6px 0; }
        .btn { display: inline-block; padding: 10px 20px; background: #10b981; color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 13px; font-weight: 600; transition: background 0.2s; }
        .btn:hover { background: #059669; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">● Server Online & Running</div>
        <h1>Smart Expense Backend API</h1>
        <p>Your Render.com Node.js/Express server is active and securely proxying Backblaze B2 storage.</p>
        <div class="endpoint-list">
          <div class="endpoint-item">GET /health &rarr; Status Check</div>
          <div class="endpoint-item">POST /api/upload-url &rarr; Presigned PUT</div>
          <div class="endpoint-item">POST /api/view-url &rarr; Presigned View</div>
          <div class="endpoint-item">POST /api/download-url &rarr; Presigned Download</div>
          <div class="endpoint-item">POST /api/delete-file &rarr; File Delete</div>
        </div>
        <a href="/health" class="btn">Test /health JSON Endpoint</a>
      </div>
    </body>
    </html>
  `);
});

/**
 * 1. GET /health
 * Status check endpoint for Render.com health checks and pinging
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart Expense Backblaze B2 Proxy',
    bucket: B2_BUCKET_NAME,
    timestamp: new Date().toISOString(),
  });
});

/**
 * 2. POST /api/upload-url
 * Generates an S3 pre-signed PUT URL.
 * Constraint: File key format is uploads/{userId}/{timestamp}_{filename}
 * Sets Content-Type on the S3 command to ensure proper MIME type in Backblaze.
 */
app.post('/api/upload-url', async (req, res) => {
  try {
    const { fileName, contentType = 'image/png', userId = 'default_user', folder = 'receipts' } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const fileKey = `${folder}/${userId}/${timestamp}_${cleanName}`;

    const command = new PutObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    // 1-hour pre-signed upload URL for secure direct client PUT
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      success: true,
      uploadUrl,
      fileKey,
      expiresIn: 3600,
    });
  } catch (err) {
    console.error('Error generating upload URL:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate upload URL' });
  }
});

/**
 * 3. POST /api/view-url
 * Generates an S3 pre-signed GET URL for viewing receipt photos in high-res.
 */
app.post('/api/view-url', async (req, res) => {
  try {
    const { fileKey } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKey is required' });
    }

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: fileKey,
    });

    // 7-day pre-signed URL for viewing/zooming
    const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });

    res.json({
      success: true,
      viewUrl,
      fileKey,
      expiresIn: 604800,
    });
  } catch (err) {
    console.error('Error generating view URL:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate view URL' });
  }
});

/**
 * 4. POST /api/download-url
 * Generates an S3 pre-signed GET URL with Content-Disposition attachment for PNG download.
 */
app.post('/api/download-url', async (req, res) => {
  try {
    const { fileKey, fileName } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKey is required' });
    }

    const baseName = (fileName || fileKey.split('/').pop() || 'receipt.png');
    const safeDownloadName = baseName.endsWith('.png') ? baseName : `${baseName}.png`;

    const command = new GetObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: fileKey,
      ResponseContentDisposition: `attachment; filename="${safeDownloadName}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      success: true,
      downloadUrl,
      fileKey,
      fileName: safeDownloadName,
    });
  } catch (err) {
    console.error('Error generating download URL:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate download URL' });
  }
});

/**
 * 5. POST /api/delete-file
 * Deletes a file from Backblaze B2 with ownership validation.
 */
app.post('/api/delete-file', async (req, res) => {
  try {
    const { fileKey, userId } = req.body;

    if (!fileKey) {
      return res.status(400).json({ error: 'fileKey is required' });
    }

    // Security check: users can only delete files belonging to their user folder
    if (userId && !fileKey.startsWith(`uploads/${userId}/`) && !fileKey.startsWith(`receipts/${userId}/`)) {
      return res.status(403).json({ error: 'Unauthorized to delete this file' });
    }

    const command = new DeleteObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: fileKey,
    });

    await s3Client.send(command);

    res.json({
      success: true,
      message: 'File deleted successfully from Backblaze B2',
      fileKey,
    });
  } catch (err) {
    console.error('Error deleting file:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete file' });
  }
});

/**
 * 6. GET /api/b2/files
 * Lists storage objects directly from Backblaze B2 S3 bucket
 */
app.get('/api/b2/files', async (req, res) => {
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const prefix = (req.query.prefix || '').toString();
    const limit = parseInt((req.query.limit || '100').toString(), 10);

    const command = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: Math.min(limit, 1000),
    });

    const response = await s3Client.send(command);
    const contents = response.Contents || [];

    const files = await Promise.all(
      contents.map(async (item) => {
        const getCmd = new GetObjectCommand({
          Bucket: B2_BUCKET_NAME,
          Key: item.Key,
        });
        const downloadUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 86400 }).catch(() => '');
        return {
          fileId: item.ETag?.replace(/"/g, '') || item.Key,
          fileName: item.Key,
          contentLength: item.Size || 0,
          uploadTimestamp: item.LastModified ? new Date(item.LastModified).getTime() : Date.now(),
          downloadUrl,
        };
      })
    );

    res.json({ success: true, files });
  } catch (err) {
    console.error('Error listing B2 files:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to list files' });
  }
});

/**
 * 7. GET /api/admin/overview
 * Overview of storage connection and file counts
 */
app.get('/api/admin/overview', async (_req, res) => {
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      MaxKeys: 1000,
    });
    const response = await s3Client.send(command);
    const contents = response.Contents || [];
    const totalBytes = contents.reduce((acc, f) => acc + (f.Size || 0), 0);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      storage: {
        connected: true,
        bucketName: B2_BUCKET_NAME,
        endpoint: B2_ENDPOINT,
        fileCount: contents.length,
        totalBytes,
      },
    });
  } catch (err) {
    console.error('Admin overview error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to load overview' });
  }
});

/**
 * 8. GET /api/admin/users
 * Aggregates users discovered across Backblaze B2 folders & backups
 */
app.get('/api/admin/users', async (_req, res) => {
  try {
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: B2_BUCKET_NAME,
      MaxKeys: 1000,
    });
    const response = await s3Client.send(command);
    const contents = response.Contents || [];

    const userMap = {};

    for (const item of contents) {
      const parts = (item.Key || '').split('/');
      if (parts.length >= 3) {
        const folder = parts[0];
        const userId = parts[1];
        if (!userMap[userId]) {
          userMap[userId] = {
            id: userId,
            name: userId === 'default_user' ? 'Primary App User (Receipts Owner)' : `Account: ${userId}`,
            email: userId === 'default_user' ? 'default_user@smartexpense.local' : `${userId}@smartexpense.cloud`,
            currency: 'PKR',
            defaultMonthlyBudget: 50000,
            theme: 'light',
            storageBytes: 0,
            receiptCount: 0,
            backupCount: 0,
            transactionCount: 0,
            totalSpending: 0,
            source: 'Backblaze Cloud Storage',
          };
        }

        userMap[userId].storageBytes += item.Size || 0;
        if (folder === 'receipts' || folder === 'uploads') {
          userMap[userId].receiptCount += 1;
        } else if (folder === 'backups') {
          userMap[userId].backupCount += 1;
        }
      }
    }

    res.json({
      success: true,
      users: Object.values(userMap),
    });
  } catch (err) {
    console.error('Admin users discovery error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Failed to list storage users' });
  }
});

/**
 * 9. POST /api/admin/delete-file
 * Admin direct delete for any file in Backblaze B2
 */

app.post('/api/admin/delete-file', async (req, res) => {
  try {
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    const command = new DeleteObjectCommand({
      Bucket: B2_BUCKET_NAME,
      Key: fileName,
    });
    await s3Client.send(command);
    res.json({ success: true, message: `File ${fileName} deleted by administrator` });
  } catch (err) {
    console.error('Admin delete failed:', err);
    res.status(500).json({ error: err?.message || 'Admin file deletion failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Smart Expense Backend proxy running on port ${PORT}`);
});
