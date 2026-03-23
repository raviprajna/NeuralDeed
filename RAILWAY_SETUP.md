# Railway Deployment Setup

## Issue: PDF Files Not Persisting (404 Errors)

PDFs upload successfully but return 404 errors after container restarts. This is because Railway's filesystem is ephemeral - files are lost on every restart/redeploy.

## Solution: Add Railway Volume for Persistent Storage

### ⚠️ IMPORTANT: This is the ONLY fix needed - no code changes required!

### Steps to Fix (5 minutes):

1. **Go to Railway Dashboard**
   - Open your project: https://railway.app
   - Click on your NeuralDeed service

2. **Add a Volume**
   - Click "Settings" tab
   - Scroll down to "Volumes" section
   - Click "+ New Volume" button
   - Configure:
     - **Mount Path**: `/app/uploads` (EXACTLY THIS)
     - **Name**: uploads (or any name)
     - Click "Add Volume"

3. **That's it!**
   - Railway will automatically redeploy your service
   - The `/app/uploads` directory is now persistent
   - Uploaded PDFs will survive restarts

### Verification Steps:

After adding the volume:

1. Upload a PDF document through the UI
2. Refresh your browser
3. The PDF should load successfully (no 404)
4. Check Railway logs - you should see: `Saved to local disk`

### How It Works:

- Without volume: `/app/uploads` is ephemeral, wiped on restart
- With volume: `/app/uploads` is mounted persistent storage
- Railway includes 1GB volume free on all plans
- No environment variables needed
- No code changes needed

### Alternative: Use Cloudflare R2 (Scalable Option)

If you prefer cloud storage instead of Railway volumes:

1. **Set Environment Variables in Railway**:
   ```
   USE_R2=true
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=neuraldeed-documents
   ```

2. **Install boto3** (already in dependencies)

3. **Redeploy** - files will be stored in Cloudflare R2

## Current Configuration

- **Storage Mode**: Local filesystem (uploads/)
- **R2 Enabled**: Only if `USE_R2=true`
- **Upload Directory**: `/app/uploads` (relative path in code)
- **Max File Size**: 25MB

## Verification

After adding volume:
1. Upload a PDF
2. Refresh the page
3. PDF should still be accessible
4. Check Railway logs for "Saved to local disk" messages

## Notes

- Railway volumes are persistent across deployments
- Files remain even when container restarts
- 1GB free tier volume included
- No code changes needed - just Railway configuration
