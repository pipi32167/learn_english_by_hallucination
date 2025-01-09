import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import getAudioDurationInSeconds from 'get-audio-duration';
import { getWordAudioFromYoudao } from '@/utils/audio-utils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { word } = req.query;

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ error: 'Word is required' });
  }


  try {

    const audioBuffer = await getWordAudioFromYoudao(word);
    const audioPath = path.join('/tmp', 'audios', `${word}.mp3`);
    if (!fs.existsSync(path.dirname(audioPath))) {
      await fs.promises.mkdir(path.dirname(audioPath), { recursive: true });
    }
    await fs.promises.writeFile(audioPath, audioBuffer);
    // await fs.access(audioPath);
    const duration = await getAudioDurationInSeconds(audioPath);
    // read audio file as base64
    const audioBase64 = audioBuffer.toString('base64');
    res.status(200).json({
      url: `data:audio/mp3;base64,${audioBase64}`,
      duration
    });
  } catch (error) {
    res.status(404).json({ error: `Audio not found for the given word: ${error}` });
  }
}