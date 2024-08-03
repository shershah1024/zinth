import { fetchWithTimeout, handleFetchErrors } from './whatsappUtils';

interface MediaInfo {
  messaging_product: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: string;
  id: string;
}

export async function getMediaInfo(mediaId: string): Promise<MediaInfo> {
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

export async function downloadMedia(mediaUrl: string): Promise<ArrayBuffer> {
  try {
    const response = await fetchWithTimeout(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      },
    });
    await handleFetchErrors(response);
    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error downloading media:', error);
    throw error;
  }
}

export async function downloadAndPrepareMedia(mediaId: string, originalFilename?: string): Promise<{ arrayBuffer: ArrayBuffer; filename: string; mimeType: string }> {
  try {
    const mediaInfo = await getMediaInfo(mediaId);
    const arrayBuffer = await downloadMedia(mediaInfo.url);

    let filename = originalFilename || `media_${Date.now()}`;
    if (!filename.includes('.')) {
      const extension = mediaInfo.mime_type.split('/')[1];
      filename += `.${extension}`;
    }

    console.log(`Media downloaded: ${filename}`);

    return { arrayBuffer, filename, mimeType: mediaInfo.mime_type };
  } catch (error) {
    console.error('Error downloading and preparing media:', error);
    throw error;
  }
}