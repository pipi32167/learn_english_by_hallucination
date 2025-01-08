import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import getAudioDurationInSeconds from 'get-audio-duration';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { word } = req.query;

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }

  const audioPath = path.join(process.cwd(), 'public', 'audios', `${word}.mp3`);

  try {
    await fs.access(audioPath);
    const duration = await getAudioDurationInSeconds(audioPath);

    res.status(200).json({
      url: `/audios/${word}.mp3`,
      duration
    });
  } catch (error) {
    res.status(404).json({ error: 'Audio not found for the given word' });
  }
}