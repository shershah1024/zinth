// utils/whatsappMediaUtils.ts

import { fetchWithTimeout, handleFetchErrors } from './whatsappUtils';

interface MediaInfo {
  messaging_product: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: string;
  id: string;
}

export async function getMediaUrl(mediaId: string): Promise<string> {
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
    return data.url;
  } catch (error) {
    console.error('Error getting media URL:', error);
    throw error;
  }
}

export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
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

export async function downloadAndPrepareMedia(mediaId: string, mimeType: string, originalFilename?: string): Promise<{ buffer: Buffer; filename: string }> {
  try {
    const mediaUrl = await getMediaUrl(mediaId);
    const buffer = await downloadMedia(mediaUrl);
    let filename = originalFilename || `media_${Date.now()}`;
    
    // If the filename doesn't have an extension, add one based on the MIME type
    if (!filename.includes('.')) {
      const extension = mimeType.split('/')[1];
      filename += `.${extension}`;
    }
    
    return { buffer, filename };
  } catch (error) {
    console.error('Error downloading and preparing media:', error);
    throw error;
  }
}

export async function uploadMedia(phoneNumberId: string, buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/media`;
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: mimeType }), filename);
  formData.append('type', mimeType);
  formData.append('messaging_product', 'whatsapp');

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
      body: formData,
    });

    await handleFetchErrors(response);

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}