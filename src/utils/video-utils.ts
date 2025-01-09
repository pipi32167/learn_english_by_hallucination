import path from "path";
import fs from "fs";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import { randomInt } from "./random";

interface Cell {
  x: number;
  y: number;
}

interface GridData {
  allowedCells: Cell[];
  cellWidth: number;
  cellHeight: number;
}

async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const duration = data.format.duration || 0;
        resolve(duration);
      }
    });
  });
}

async function addTextToImage(
  imagePath: string,
  word: string,
  outputImagePath: string,
  x: number,
  y: number
): Promise<void> {
  const image = sharp(imagePath);

  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Image metadata is missing width or height");
  }

  const width = metadata.width;
  const height = metadata.height;

  const fontSize = Math.floor(Math.random() * 30) + 50;
  const fontFamily = "Arial, sans-serif";
  const fontWeight = "bold";
  const fillColor = "yellow";

  const tempSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="0" font-family="${fontFamily}" font-size="${fontSize}px" font-weight="${fontWeight}">${word}</text>
    </svg>`
  );

  const textImage = sharp(tempSvg, { density: 72 });
  const textMetadata = await textImage.metadata();

  if (!textMetadata.width || !textMetadata.height) {
    throw new Error("Text metadata is missing width or height");
  }

  const textWidth = textMetadata.width;
  const textHeight = textMetadata.height;

  let adjustedX = x - textWidth / 2;
  let adjustedY = y + textHeight / 2 + randomInt(-20, 20);

  const padding = 10;
  if (adjustedX < 0) adjustedX = 0 + padding;
  if (adjustedY < textHeight) adjustedY = textHeight + padding;
  if (adjustedX + textWidth > width) adjustedX = width - textWidth - padding;
  if (adjustedY > height) adjustedY = height - padding;

  const finalSvg = Buffer.from(
    `<svg width="${width}" height="${height}">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
          <feOffset in="blur" dx="10" dy="10" result="offsetBlur"/>
          <feMerge>
            <feMergeNode in="offsetBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <style>
        .text { font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; fill: ${fillColor}; filter: url(#shadow); }
      </style>
      <text x="${adjustedX}" y="${adjustedY}" class="text">${word}</text>
    </svg>`
  );

  const finalTextImage = sharp(finalSvg, { density: 72 }).png();

  await image
    .composite([{ input: await finalTextImage.toBuffer(), top: 0, left: 0 }])
    .toFile(outputImagePath);
}


export async function createVideo(
  word: string,
  imagePath: string,
  audioPath: string,
  outputVideoPath: string
): Promise<void> {
  const adjustedAudioPath = path.join(
    path.dirname(outputVideoPath),
    `${word}_adjusted.mp3`
  );
  console.log(`Adjusting audio speed to 1.5x`, audioPath, adjustedAudioPath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(audioPath)
      .audioFilters("atempo=1.5")
      .save(adjustedAudioPath)
      .on("end", () => {
        console.log(`Adjusted audio saved to ${adjustedAudioPath}`);
        resolve();
      })
      .on("error", reject);
  });

  console.log(`Getting audio duration`);

  const duration = await getAudioDuration(adjustedAudioPath);
  console.log(`Audio duration: ${duration} seconds`);

  const outputDir = path.join(path.dirname(outputVideoPath), "frames");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const { allowedCells, cellWidth, cellHeight } =
    await getAllowedCellsFakeRandom(imagePath);

  const count = Math.round(10 / duration);

  console.log(`Placing text ${count} times`);
  for (let i = 0; i < count; i++) {
    const { x: cellX, y: cellY } = allowedCells.shift()!;
    console.log(`Placing text at cell (${cellX}, ${cellY})`);

    const x = cellX * cellWidth + Math.floor(cellWidth / 2);
    const y = cellY * cellHeight + Math.floor(cellHeight / 2);

    const outputImagePath = path.join(outputDir, `frame_${i}.jpg`);
    await addTextToImage(imagePath, word, outputImagePath, x, y);
    console.log(`Image with text saved to ${outputImagePath}`);
    imagePath = outputImagePath;
  }

  const loopedAudioPath = path.join(
    path.dirname(outputVideoPath),
    `${word}_looped.mp3`
  );

  await new Promise<void>((resolve, reject) => {
    ffmpeg(adjustedAudioPath)
      .inputOptions("-stream_loop", "-1")
      .duration(10)
      .save(loopedAudioPath)
      .on("end", () => {
        console.log(`Looped audio saved to ${loopedAudioPath}`);
        resolve();
      })
      .on("error", reject);
  });

  await new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(path.join(outputDir, "frame_%d.jpg"))
      .inputOptions("-framerate", `${1 / duration}`)
      .input(loopedAudioPath)
      .outputOptions("-c:v", "libx264", "-pix_fmt", "yuv420p")
      .save(outputVideoPath)
      .on("end", () => {
        console.log(`Video saved to ${outputVideoPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error(`Error creating video: ${err.message}`);
        reject(err);
      });
  });
}

async function getAllowedCellsFakeRandom(imagePath: string): Promise<GridData> {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("Image metadata is missing width or height");
  }

  const width = metadata.width;
  const height = metadata.height;

  const gridSize = 6;
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);

  const allowedCells: Cell[] = [
    [0, 2],
    [0, 3],
    [1, 4],
    [3, 5],
    [4, 4],
    [5, 3],
    [5, 2],
    [4, 1],
    [2, 0],
    [1, 1],
    [0, 0],
    [5, 5],
    [0, 5],
    [5, 0],
  ]
    .map(([x, y]) => ({ x, y: gridSize - y - 1 }))
    .sort(() => Math.random() - 0.5);

  return { allowedCells, cellWidth, cellHeight };
}
