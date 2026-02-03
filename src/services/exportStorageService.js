const fs = require('fs');
const path = require('path');

let S3Client;
let PutObjectCommand;
let ListObjectsV2Command;
let DeleteObjectsCommand;
let GetObjectCommand;
let getSignedUrl;
let Storage;

function loadS3() {
  if (S3Client) return;
  ({ S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
}

function loadGcs() {
  if (Storage) return;
  ({ Storage } = require('@google-cloud/storage'));
}

class ExportStorageService {
  static async uploadBuffer({ provider, bucket, key, contentType, data, localDir }) {
    if (provider === 'local') {
      const outputDir = localDir || path.join(process.cwd(), 'exports');
      fs.mkdirSync(outputDir, { recursive: true });
      const filePath = path.join(outputDir, key);
      fs.writeFileSync(filePath, data);
      return { location: filePath, provider: 'local' };
    }

    if (provider === 's3') {
      loadS3();
      const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }));
      return { location: `s3://${bucket}/${key}`, provider: 's3' };
    }

    if (provider === 'gcs') {
      loadGcs();
      const storage = new Storage();
      const file = storage.bucket(bucket).file(key);
      await file.save(data, { contentType, resumable: false });
      return { location: `gs://${bucket}/${key}`, provider: 'gcs' };
    }

    throw new Error(`Unsupported storage provider: ${provider}`);
  }

  static async listObjects({ provider, bucket, prefix }) {
    if (provider === 'local') {
      const dir = prefix || path.join(process.cwd(), 'exports');
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).map((name) => ({
        key: name,
        updated_at: fs.statSync(path.join(dir, name)).mtime,
      }));
    }

    if (provider === 's3') {
      loadS3();
      const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const res = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || '',
      }));
      return (res.Contents || []).map((obj) => ({
        key: obj.Key,
        updated_at: obj.LastModified,
      }));
    }

    if (provider === 'gcs') {
      loadGcs();
      const [files] = await new Storage().bucket(bucket).getFiles({ prefix: prefix || '' });
      return files.map((file) => ({
        key: file.name,
        updated_at: new Date(file.metadata.updated || file.metadata.timeCreated),
      }));
    }

    throw new Error(`Unsupported storage provider: ${provider}`);
  }

  static async deleteObjects({ provider, bucket, keys, localDir }) {
    if (!keys || keys.length === 0) return 0;

    if (provider === 'local') {
      const dir = localDir || path.join(process.cwd(), 'exports');
      let deleted = 0;
      keys.forEach((key) => {
        const filePath = path.join(dir, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted += 1;
        }
      });
      return deleted;
    }

    if (provider === 's3') {
      loadS3();
      const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      await client.send(new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((key) => ({ Key: key })) },
      }));
      return keys.length;
    }

    if (provider === 'gcs') {
      loadGcs();
      const storage = new Storage().bucket(bucket);
      let deleted = 0;
      for (const key of keys) {
        await storage.file(key).delete({ ignoreNotFound: true });
        deleted += 1;
      }
      return deleted;
    }

    throw new Error(`Unsupported storage provider: ${provider}`);
  }

  static async getDownloadUrl({ provider, bucket, key, expiresIn = 3600, publicBaseUrl = null }) {
    if (publicBaseUrl) {
      const normalizedBase = publicBaseUrl.replace(/\/$/, '');
      return `${normalizedBase}/${key}`;
    }

    if (provider === 's3') {
      loadS3();
      const client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn });
    }

    if (provider === 'gcs') {
      loadGcs();
      const [url] = await new Storage().bucket(bucket).file(key).getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });
      return url;
    }

    if (provider === 'local') {
      return null;
    }

    throw new Error(`Unsupported storage provider: ${provider}`);
  }
}

module.exports = ExportStorageService;
