import fs from "fs/promises";
import { NextApiRequest, NextApiResponse } from "next";
import { createRouter } from "next-connect";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { createVideo } from "@/utils/video-utils";
import multer from 'multer';

// Define custom request interface to include files
interface NextApiRequestWithFiles extends NextApiRequest {
  files?: {
    image?: Express.Multer.File[];
    audio?: Express.Multer.File[];
  };
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
} else {
  throw new Error("ffmpegPath is null");
}

// 创建 router 时使用扩展的接口
const router = createRouter<NextApiRequestWithFiles, NextApiResponse>();

// 配置 multer
const upload = multer({
  storage: multer.memoryStorage(),
});

// 创建上传中间件
const uploadMiddleware = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// 使用中间件
router.use((req, res, next) => {
  return new Promise<void>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadMiddleware(req as any, res as any, (result: unknown) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return next();
    });
  });
});

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

    // 读取视频文件
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
