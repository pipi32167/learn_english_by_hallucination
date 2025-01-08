import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { word } = req.body;

    if (!word) {
      return res.status(400).json({ error: 'Word is required' });
    }

    const imagePath = path.join(process.cwd(), 'public', 'images', `${word}.png`);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    try {
      const imageBuffer = await sharp(imagePath).toBuffer();
      const imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

      return res.status(200).json({ imageUrl });
    } catch (error) {
      return res.status(500).json({ error: 'Error processing image' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}