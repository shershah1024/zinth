import { fetchWithTimeout, handleFetchErrors } from './whatsappUtils';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';  // Make sure to install and import node-fetch

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
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.buffer();
    console.log(`Downloaded file size: ${buffer.length} bytes`);
    return buffer;
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

async function uploadFileToSupabase(fileData: Buffer, fileName: string, contentType: string): Promise<{ path: string; publicUrl: string }> {
  try {
    console.log(`Uploading file size: ${fileData.length} bytes`);
    const { data, error } = await supabase.storage
      .from('all_file')
      .upload(fileName, fileData, {
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
  } catch (error) {
    console.error('Error in uploadFileToSupabase:', error);
    throw error;
  }
}

export async function downloadAndUploadMedia(mediaId: string): Promise<{ path: string; publicUrl: string }> {
  try {
    const mediaInfo = await getMediaInfo(mediaId);
    console.log(`Media info received. File size from API: ${mediaInfo.file_size} bytes`);
    
    const binaryData = await downloadMedia(mediaInfo.url);
    console.log(`Downloaded file size: ${binaryData.length} bytes`);

    const fileName = `media_${Date.now()}.${mediaInfo.mime_type.split('/')[1]}`;
    
    const result = await uploadFileToSupabase(binaryData, fileName, mediaInfo.mime_type);

    console.log(`Media downloaded and uploaded to Supabase: ${result.path}`);
    console.log(`Uploaded file size: ${binaryData.length} bytes`);

    return result;
  } catch (error) {
    console.error('Error downloading and uploading media:', error);
    throw error;
  }
}