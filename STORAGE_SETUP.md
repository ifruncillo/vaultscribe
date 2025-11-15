# Cloud Storage Configuration Guide

VaultScribe supports multiple storage backends for customer-controlled, zero-knowledge architecture.

## Supported Backends

- **Local** - Store recordings on the server filesystem (default)
- **AWS S3** - Store recordings in customer's S3 bucket
- **Azure Blob Storage** - Store recordings in customer's Azure storage account

## Quick Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure your storage backend
3. Restart the API server

## Configuration Options

### Local Storage (Default)

No configuration needed. Files are stored in the `/uploads` directory.

```env
STORAGE_BACKEND=local
```

**Pros:**
- No setup required
- Fast development
- No cloud costs

**Cons:**
- Not suitable for production
- No redundancy
- Limited by server storage

---

### AWS S3 Storage

Store recordings in customer-controlled S3 buckets with presigned URLs.

#### Required Environment Variables:

```env
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-vaultscribe-bucket
UPLOAD_URL_EXPIRATION=3600
```

#### Setup Instructions:

1. **Create an S3 bucket:**
   ```bash
   aws s3 mb s3://your-vaultscribe-bucket --region us-east-1
   ```

2. **Create an IAM user** with programmatic access

3. **Attach this IAM policy** to the user:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject"
         ],
         "Resource": "arn:aws:s3:::your-vaultscribe-bucket/*"
       }
     ]
   }
   ```

4. **Enable encryption** (recommended):
   - Go to bucket properties
   - Enable "Default encryption" with SSE-S3 or SSE-KMS

5. **Configure CORS** (if needed for direct browser uploads):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["PUT", "POST"],
       "AllowedOrigins": ["https://your-app.com"],
       "ExposeHeaders": []
     }
   ]
   ```

**Pros:**
- Customer controls data
- Highly durable (99.999999999%)
- Encryption at rest
- Access logging available

**Cons:**
- Requires AWS account
- Monthly storage costs

---

### Azure Blob Storage

Store recordings in customer's Azure Storage account with SAS tokens.

#### Required Environment Variables:

```env
STORAGE_BACKEND=azure
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account
AZURE_STORAGE_ACCOUNT_KEY=your_storage_key
AZURE_CONTAINER_NAME=vaultscribe-recordings
UPLOAD_URL_EXPIRATION=3600
```

#### Setup Instructions:

1. **Create a storage account:**
   ```bash
   az storage account create \
     --name yourstorageaccount \
     --resource-group your-resource-group \
     --location eastus \
     --sku Standard_LRS \
     --encryption-services blob
   ```

2. **Create a container:**
   ```bash
   az storage container create \
     --name vaultscribe-recordings \
     --account-name yourstorageaccount
   ```

3. **Get the access key:**
   ```bash
   az storage account keys list \
     --account-name yourstorageaccount \
     --query '[0].value' \
     --output tsv
   ```

4. **Enable encryption** (if not already enabled):
   - Azure Storage uses encryption by default
   - Optionally configure customer-managed keys

5. **Configure CORS** (if needed):
   ```bash
   az storage cors add \
     --methods PUT POST \
     --origins https://your-app.com \
     --allowed-headers "*" \
     --exposed-headers "" \
     --max-age 3600 \
     --services b \
     --account-name yourstorageaccount
   ```

**Pros:**
- Customer controls data
- Enterprise-grade security
- Encryption by default
- Compliance certifications

**Cons:**
- Requires Azure account
- Monthly storage costs

---

## Security Best Practices

### 1. Use Environment Variables
Never commit `.env` files to version control. Use secrets management in production.

### 2. Least Privilege Access
- IAM users should only have permissions for the specific bucket
- Azure storage accounts should use limited access keys

### 3. Enable Encryption
- S3: Enable default encryption (SSE-S3 or SSE-KMS)
- Azure: Encryption is enabled by default

### 4. Set Appropriate Expiration
The `UPLOAD_URL_EXPIRATION` controls how long presigned URLs are valid:
- Shorter = more secure (recommend 1-2 hours)
- Longer = better UX for slow uploads
- Default: 3600 seconds (1 hour)

### 5. Monitor Access
- Enable S3 access logging
- Enable Azure Storage Analytics
- Review access patterns regularly

### 6. Network Security
- Use VPC endpoints (AWS) or private endpoints (Azure) if possible
- Enable bucket/container versioning for recovery
- Configure lifecycle policies to auto-delete old files

---

## Testing Your Configuration

### Check Storage Info:
```bash
curl http://localhost:8000/api/storage/info
```

### Create a Session:
```bash
curl -X POST http://localhost:8000/api/session \
  -H "Content-Type: application/json" \
  -d '{"matter_code": "TEST-001"}'
```

You should receive a `upload_url` in the response:
- **Local**: `/api/session/{id}/upload`
- **S3**: `https://your-bucket.s3.amazonaws.com/...?presigned-params`
- **Azure**: `https://youracccount.blob.core.windows.net/...?sas-token`

---

## Troubleshooting

### "AWS credentials not found"
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Check that the IAM user has programmatic access enabled

### "Azure storage authentication failed"
- Verify `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` are correct
- Ensure the storage account key hasn't been rotated

### "Presigned URL expired"
- Increase `UPLOAD_URL_EXPIRATION` in your `.env`
- Check server time is synchronized (NTP)

### "Access denied" errors
- Review IAM/RBAC permissions
- Check bucket/container policies
- Verify CORS settings if uploading from browser

---

## Migration Between Backends

To switch storage backends:

1. Update `.env` with new backend configuration
2. Restart the API server
3. Existing sessions will continue using old URLs
4. New sessions will use the new backend

**Note:** Historical recordings remain in the old storage location. Plan data migration separately if needed.

---

## Production Recommendations

1. **Use separate buckets/containers per environment** (dev, staging, prod)
2. **Enable versioning** for data recovery
3. **Set up lifecycle policies** to archive old recordings
4. **Monitor costs** with AWS Cost Explorer or Azure Cost Management
5. **Implement backup strategies** for critical data
6. **Use customer-managed encryption keys** for enhanced security
7. **Enable audit logging** for compliance requirements

---

## Cost Estimation

### AWS S3
- Storage: ~$0.023/GB/month (Standard)
- PUT requests: $0.005 per 1,000
- GET requests: $0.0004 per 1,000

### Azure Blob Storage
- Storage: ~$0.018/GB/month (Hot tier)
- Write operations: $0.05 per 10,000
- Read operations: $0.004 per 10,000

**Example:** 100 hours of recordings/month (~10GB compressed audio)
- AWS S3: ~$0.25/month
- Azure: ~$0.20/month

---

For support, see the main [README.md](README.md) or consult cloud provider documentation.
