import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { base64, ext } = await req.json();
    if (!base64 || !ext) {
      return NextResponse.json({ error: 'Missing base64 or extension' }, { status: 400 });
    }

    const buffer = Buffer.from(base64, 'base64');
    
    // Save to public/assets
    const assetsDir = path.join(process.cwd(), 'public', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const destName = `logo_${Date.now()}${ext}`;
    const destPath = path.join(assetsDir, destName);
    
    fs.writeFileSync(destPath, buffer);
    
    const publicUrl = `/assets/${destName}`;
    return NextResponse.json({ filePath: publicUrl });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
