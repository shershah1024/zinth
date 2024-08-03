import { fetchWithTimeout, handleFetchErrors } from './whatsappUtils';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Supabase environment variables are not set');
  throw new Error('Supabase environment variables are not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

interface MediaInfo {
  messaging_product: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: string;
  id: string;
}

async function getMediaInfo(mediaId: string): Promise<MediaInfo> {
  const url = `https://graph.facebook.com/v20.0/${mediaId}`;
  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    });
    await handleFetchErrors(response);
    const data: MediaInfo = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting media info:', error);
    throw error;
  }
}

async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  try {
    const response = await fetchWithTimeout(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    });
    await handleFetchErrors(response);
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

async function saveTempFile(buffer: Buffer, filename: string): Promise<string> {
  const tempDir = os.tmpdir();
  const filePath = path.join(tempDir, filename);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

async function uploadFileToSupabase(filePath: string, contentType: string): Promise<{ path: string; publicUrl: string }> {
  try {
    const fileContent = await fs.readFile(filePath);
    const fileName = `${Date.now()}_${path.basename(filePath)}`;

    const { data, error } = await supabase.storage
      .from('all_file')
      .upload(fileName, fileContent, {
        contentType: contentType,
      });

    if (error) {
      throw new Error(`Error uploading file: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from upload');
    }

    const { data: publicUrlData } = supabase.storage
      .from('all_file')
      .getPublicUrl(data.path);

    if (!publicUrlData) {
      throw new Error('Error generating public URL: No data returned');
    }

    return { 
      path: data.path,
      publicUrl: publicUrlData.publicUrl
    };
  } finally {
    // Clean up the temporary file
    await fs.unlink(filePath).catch(console.error);
  }
}

export async function downloadAndUploadMedia(mediaId: string): Promise<{ path: string; publicUrl: string }> {
  try {
    const mediaInfo = await getMediaInfo(mediaId);
    const binaryData = await downloadMedia(mediaInfo.url);

    const filename = `media_${Date.now()}.${mediaInfo.mime_type.split('/')[1]}`;
    const tempFilePath = await saveTempFile(binaryData, filename);

    const result = await uploadFileToSupabase(tempFilePath, mediaInfo.mime_type);

    console.log(`Media downloaded and uploaded to Supabase: ${result.path}`);

    return result;
  } catch (error) {
    console.error('Error downloading and uploading media:', error);
    throw error;
  }
}