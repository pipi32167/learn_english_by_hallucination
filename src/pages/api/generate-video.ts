import fs from "fs/promises";
import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { createVideo } from "@/utils/video-utils";
import multer from 'multer';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  throw new Error("ffmpegPath is null");
}

// Create a next-connect handler
const router = createRouter<NextApiRequest, NextApiResponse>();

// Configure multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
});

router.use(upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]));

router.post(async (req, res) => {
  const { word } = req.body;
  const image = req.files?.image?.[0];
  const audio = req.files?.audio?.[0];
  console.log("word", word);
  console.log("files", req.files);

  if (!word || !image || !audio) {
    return res.status(400).json({ error: "Word, image, and audio are required" });
  }

  const imagePath = path.join("/tmp", `${word}.png`);
  const audioPath = path.join("/tmp", `${word}.mp3`);

  try {
    await fs.writeFile(imagePath, image.buffer);
    await fs.writeFile(audioPath, audio.buffer);

    const videoPath = path.join("/tmp", `${word}.mp4`);
    console.log("videoPath", videoPath);

    await createVideo(word, imagePath, audioPath, videoPath);

    // read the video file
    const videoBuffer = await fs.readFile(videoPath);
    const videoBase64 = videoBuffer.toString("base64");
    res.status(200).json({ video: videoBase64 });
  } catch (error) {
    console.warn(error);
    return res.status(500).json({ error: `Error processing image or audio: ${error}` });
  }
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export default router.handler();
