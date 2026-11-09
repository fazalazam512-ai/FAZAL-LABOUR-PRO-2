import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { b2Service } from './src/server/b2Service.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Parse JSON payloads up to 25MB for image receipt uploads & full backups
  app.use(express.json({ limit: '25mb' }));

  // ==========================================
  // Backblaze B2 API Endpoints
  // ==========================================

  // Check Backblaze B2 Connection Status & Health
  // 1. Health check endpoint for Render.com and dev testing
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'Smart Expense Backblaze B2 Proxy',
      bucket: 'Smartexpense',
      timestamp: new Date().toISOString(),
    });
  });

  // 2. POST /api/upload-url: Presigned upload URL
  app.post('/api/upload-url', async (req, res) => {
    try {
      const { fileName, contentType = 'image/png', userId = 'default_user' } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
      }
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const fileKey = `uploads/${userId}/${timestamp}_${cleanName}`;

      const uploadUrl = await b2Service.getUploadUrlDirect(fileKey, contentType);
      res.json({
        success: true,
        uploadUrl,
        fileKey,
        expiresIn: 3600,
      });
    } catch (err: any) {
      console.error('Error in /api/upload-url:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate upload URL' });
    }
  });

  // 3. POST /api/view-url: Presigned view URL
  app.post('/api/view-url', async (req, res) => {
    try {
      const { fileKey } = req.body;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }
      const viewUrl = await b2Service.getDownloadUrl(fileKey, 604800);
      res.json({
        success: true,
        viewUrl,
        fileKey,
        expiresIn: 604800,
      });
    } catch (err: any) {
      console.error('Error in /api/view-url:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate view URL' });
    }
  });

  // 4. POST /api/download-url: Presigned download URL
  app.post('/api/download-url', async (req, res) => {
    try {
      const { fileKey, fileName } = req.body;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }
      const safeName = (fileName || fileKey.split('/').pop() || 'receipt.png');
      const downloadUrl = await b2Service.getDownloadUrl(fileKey, 3600);
      res.json({
        success: true,
        downloadUrl,
        fileKey,
        fileName: safeName.endsWith('.png') ? safeName : `${safeName}.png`,
      });
    } catch (err: any) {
      console.error('Error in /api/download-url:', err);
      res.status(500).json({ error: err?.message || 'Failed to generate download URL' });
    }
  });

  // 5. POST /api/delete-file
  app.post('/api/delete-file', async (req, res) => {
    try {
      const { fileKey, userId } = req.body;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }
      if (userId && !fileKey.startsWith(`uploads/${userId}/`) && !fileKey.startsWith(`receipts/${userId}/`)) {
        return res.status(403).json({ error: 'Unauthorized to delete this file' });
      }
      await b2Service.deleteFile(fileKey);
      res.json({
        success: true,
        message: 'File deleted successfully from Backblaze B2',
        fileKey,
      });
    } catch (err: any) {
      console.error('Error in /api/delete-file:', err);
      res.status(500).json({ error: err?.message || 'Failed to delete file' });
    }
  });

  app.get('/api/b2/status', async (_req, res) => {
    try {
      const status = await b2Service.verifyConnection();
      res.json({
        success: status.connected,
        ...status,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        connected: false,
        error: err?.message || 'Error verifying Backblaze B2 connection',
      });
    }
  });

  // Upload File (Receipts, Images, Documents) to Backblaze B2
  app.post('/api/b2/upload', async (req, res) => {
    try {
      const { data, fileName, contentType, folder = 'receipts' } = req.body;

      if (!data) {
        return res.status(400).json({ success: false, error: 'File data is required' });
      }

      // Handle Base64 Data URL or raw base64 string
      let buffer: Buffer;
      let detectedContentType = contentType || 'application/octet-stream';

      if (typeof data === 'string' && data.startsWith('data:')) {
        const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          detectedContentType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(data, 'base64');
        }
      } else if (typeof data === 'string') {
        buffer = Buffer.from(data, 'base64');
      } else {
        buffer = Buffer.from(data);
      }

      const safeName = (fileName || `receipt_${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${folder}/${Date.now()}_${safeName}`;

      const uploadResult = await b2Service.uploadFile({
        fileName: uniqueFileName,
        buffer,
        contentType: detectedContentType,
      });

      res.json({
        success: true,
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        url: uploadResult.downloadUrl,
        size: uploadResult.contentLength,
      });
    } catch (err: any) {
      console.error('Error in /api/b2/upload:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to upload file to Backblaze B2',
      });
    }
  });

  // View receipt file inline in browser
  app.get('/api/b2/view', async (req, res) => {
    try {
      const file = req.query.file as string;
      if (!file) {
        return res.status(400).send('File parameter is required');
      }

      const { buffer, contentType } = await b2Service.downloadFileBuffer(file);
      res.setHeader('Content-Type', contentType || 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buffer);
    } catch (err: any) {
      console.error('Error viewing file:', err);
      res.status(404).send('File not found in Backblaze B2');
    }
  });

  // Download receipt file as clean attachment with specified filename
  app.get('/api/b2/download', async (req, res) => {
    try {
      const file = req.query.file as string;
      const downloadName = (req.query.name as string) || path.basename(file || 'receipt.png');
      const safeName = downloadName.endsWith('.png') ? downloadName : `${downloadName}.png`;

      if (!file) {
        return res.status(400).send('File parameter is required');
      }

      const { buffer, contentType } = await b2Service.downloadFileBuffer(file);
      res.setHeader('Content-Type', contentType || 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      res.send(buffer);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      res.status(404).send('File not found in Backblaze B2');
    }
  });

  // Upload Full Data Backup to Backblaze B2
  app.post('/api/b2/backup', async (req, res) => {
    try {
      const { payload, userId = 'default_user' } = req.body;

      if (!payload) {
        return res.status(400).json({ success: false, error: 'Backup payload is required' });
      }

      const jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
      const buffer = Buffer.from(jsonStr, 'utf-8');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-');

      // 1. Save timestamped archive
      const archivePath = `backups/${userId}/${nowStr}_backup.json`;
      await b2Service.uploadFile({
        fileName: archivePath,
        buffer,
        contentType: 'application/json',
      });

      // 2. Save latest pointer
      const latestPath = `backups/${userId}/latest.json`;
      const latestResult = await b2Service.uploadFile({
        fileName: latestPath,
        buffer,
        contentType: 'application/json',
      });

      res.json({
        success: true,
        message: 'Application data backed up successfully to Backblaze B2',
        fileName: archivePath,
        url: latestResult.downloadUrl,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in /api/b2/backup:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to backup data to Backblaze B2',
      });
    }
  });

  // Fetch Latest Cloud Backup from Backblaze B2
  app.get('/api/b2/backup/latest', async (req, res) => {
    try {
      const userId = (req.query.userId as string) || 'default_user';
      const latestPath = `backups/${userId}/latest.json`;

      const content = await b2Service.downloadFileText(latestPath);
      res.json({
        success: true,
        data: JSON.parse(content),
      });
    } catch (err: any) {
      console.error('Error in /api/b2/backup/latest:', err);
      res.status(404).json({
        success: false,
        error: err?.message || 'No cloud backup found on Backblaze B2',
      });
    }
  });

  // List Files in Backblaze B2
  app.get('/api/b2/files', async (req, res) => {
    try {
      const prefix = (req.query.prefix as string) || '';
      const limit = parseInt((req.query.limit as string) || '100', 10);
      const files = await b2Service.listFiles(prefix, limit);
      res.json({
        success: true,
        files,
      });
    } catch (err: any) {
      console.error('Error in /api/b2/files:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to list files from Backblaze B2',
      });
    }
  });

  // ==========================================
  // Administrative Operations (Admin Dashboard)
  // ==========================================

  // Admin stats endpoint
  app.get('/api/admin/overview', async (_req, res) => {
    try {
      const b2Status = await b2Service.verifyConnection();
      const files = await b2Service.listFiles('', 100);
      const totalBytes = files.reduce((acc, f) => acc + (f.contentLength || 0), 0);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        storage: {
          connected: b2Status.connected,
          bucketName: b2Status.bucketName,
          bucketId: b2Status.bucketId,
          endpoint: b2Status.endpoint,
          fileCount: files.length,
          totalBytes,
          recentFiles: files.slice(0, 10),
        },
        services: {
          auth: 'Firebase Auth (Identity Platform)',
          database: 'Google Cloud Firestore',
          storage: 'Backblaze B2 Private Cloud (S3 Compatible)',
          server: 'Node.js Express Proxy',
        },
      });
    } catch (err: any) {
      console.error('Error in /api/admin/overview:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to load admin overview' });
    }
  });

  // Admin List Discovered Users from Storage & Backups
  app.get('/api/admin/users', async (_req, res) => {
    try {
      const files = await b2Service.listFiles('', 1000);
      const userMap: Record<string, {
        id: string;
        name: string;
        email: string;
        currency: string;
        defaultMonthlyBudget: number;
        theme: string;
        storageBytes: number;
        receiptCount: number;
        backupCount: number;
        latestFileTimestamp?: number;
        transactionCount: number;
        totalSpending: number;
        source: string;
      }> = {};

      for (const f of files) {
        const parts = (f.fileName || '').split('/');
        // Pattern: receipts/<userId>/filename OR backups/<userId>/filename OR uploads/<userId>/filename
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

          userMap[userId].storageBytes += f.contentLength || 0;
          if (folder === 'receipts' || folder === 'uploads') {
            userMap[userId].receiptCount += 1;
          } else if (folder === 'backups') {
            userMap[userId].backupCount += 1;
          }
          if (f.uploadTimestamp && (!userMap[userId].latestFileTimestamp || f.uploadTimestamp > userMap[userId].latestFileTimestamp!)) {
            userMap[userId].latestFileTimestamp = f.uploadTimestamp;
          }
        }
      }

      // Try reading backups to enrich with real transaction count and profile
      for (const userId of Object.keys(userMap)) {
        try {
          const latestPath = `backups/${userId}/latest.json`;
          const content = await b2Service.downloadFileText(latestPath);
          const data = JSON.parse(content);
          if (data) {
            if (data.profile?.name) userMap[userId].name = data.profile.name;
            if (data.profile?.email) userMap[userId].email = data.profile.email;
            if (data.profile?.currency) userMap[userId].currency = data.profile.currency;
            if (data.profile?.defaultMonthlyBudget) userMap[userId].defaultMonthlyBudget = data.profile.defaultMonthlyBudget;
            if (Array.isArray(data.transactions)) {
              userMap[userId].transactionCount = data.transactions.length;
              userMap[userId].totalSpending = data.transactions.reduce((sum: number, tx: any) => {
                return tx.type === 'expense' && typeof tx.amount === 'number' ? sum + tx.amount : sum;
              }, 0);
            }
          }
        } catch {
          // Backup text not present or failed to parse, keep storage stats
        }
      }

      res.json({
        success: true,
        users: Object.values(userMap),
      });
    } catch (err: any) {
      console.error('Error in /api/admin/users:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to list storage users' });
    }
  });


  // Admin Delete File from Backblaze
  app.post('/api/admin/delete-file', async (req, res) => {
    try {
      const { fileName } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: 'fileName is required' });
      }
      await b2Service.deleteFile(fileName);
      res.json({ success: true, message: `File ${fileName} deleted from Backblaze B2` });
    } catch (err: any) {
      console.error('Error in /api/admin/delete-file:', err);
      res.status(500).json({ error: err?.message || 'Failed to delete file from storage' });
    }
  });

  // ==========================================
  // Vite Frontend Middleware / Static Hosting
  // ==========================================
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Expense Tracker server running on http://0.0.0.0:${PORT} [Backblaze B2: Smartexpense]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
