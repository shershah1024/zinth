// app/api/convert-pdf-to-base64/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fromBuffer } from 'pdf2pic';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get('file') as unknown as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create a temporary directory
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-conversion-'));

        const options = {
            density: 300,
            saveFilename: "output",
            savePath: tempDir,
            format: "png",
            width: 2000,
            height: 2000
        };

        const convert = fromBuffer(buffer, options);
        const pages = await convert.bulk(-1);

        const base64Images: string[] = [];

        for (const page of pages) {
            if (typeof page.path === 'string') {
                const imagePath = page.path;
                const imageBuffer = await fs.readFile(imagePath);
                const base64 = imageBuffer.toString('base64');
                base64Images.push(base64);
                
                // Clean up temporary file
                await fs.unlink(imagePath);
            }
        }

        // Remove temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });

        return NextResponse.json({ base64Images });
    } catch (error) {
        console.error('Error processing PDF:', error);
        return NextResponse.json({ error: 'Error processing PDF' }, { status: 500 });
    }
}