# Face Photos Storage Setup

## Issue
The frontend uploads employee face photos to Supabase Storage bucket `face-photos`, but the bucket doesn't exist yet.

## Solution

### Option 1: Create via Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name: `face-photos`
5. Set **Public bucket** to `ON` (required for `getPublicUrl()` to work)
6. Click **Create bucket**

### Option 2: Create via SQL
Run this in your Supabase SQL Editor:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'face-photos');

-- Allow public reads
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'face-photos');
```

## Verification
After creating the bucket, test the upload flow:
1. Sign up as an employee
2. Capture the 3 face photos
3. Check that they upload successfully
4. Verify the URLs are stored in the `employees.face_photo_urls` column in your Neon DB
