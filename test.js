const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");

async function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const duration = data.format.duration;
        resolve(duration);
      }
    });
  });
}

// 在图片上随机位置显示单词
async function addTextToImage(imagePath, word, outputImagePath, x, y) {
  const image = sharp(imagePath);

  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  const fontSize = Math.floor(Math.random() * 40) + 80; // Random font size between 20 and 30
  const fontFamily = "Arial, sans-serif"; // Use a more aesthetically pleasing font family
  const fontWeight = "bold"; // Make the text bold
  const fillColor = "yellow"; // Text color

  const textImage = sharp(
    Buffer.from(
      `<svg width="${width}" height="${height}">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
            <feOffset in="blur" dx="3" dy="3" result="offsetBlur"/>
            <feMerge>
              <feMergeNode in="offsetBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <style>
          .text { font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; fill: ${fillColor}; filter: url(#shadow); }
        </style>
        <text x="${x}" y="${y}" class="text">${word}</text>
      </svg>`
    ),
    { density: 72 }
  ).png();

  await image
    .composite([{ input: await textImage.toBuffer(), top: 0, left: 0 }])
    .toFile(outputImagePath);
}

async function createVideo(word, imagePath, audioPath, outputVideoPath) {
  // Adjust audio to 1.5x speed
  const adjustedAudioPath = path.join(
    path.dirname(outputVideoPath),
    `${word}_adjusted.mp3`
  );
  await new Promise((resolve, reject) => {
    ffmpeg(audioPath)
      .audioFilters("atempo=1.5")
      .save(adjustedAudioPath)
      .on("end", () => {
        console.log(`Adjusted audio saved to ${adjustedAudioPath}`);
        resolve();
      })
      .on("error", reject);
  });

  const duration = await getAudioDuration(adjustedAudioPath);
  console.log(`Audio duration: ${duration} seconds`);

  const outputDir = path.join(path.dirname(outputVideoPath), "frames");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const { allowedCells, cellWidth, cellHeight } =
    await getAllowedCellsFakeRandom(imagePath);

  // await image.toFile(path.join(outputDir, "frame_0.jpg"));
  const count = Math.round(10 / duration);

  console.log(`Placing text ${count} times`);
  for (let i = 0; i < count; i++) {
    // Select a random cell from the allowed cells
    const { x: cellX, y: cellY } = allowedCells.shift();
    console.log(`Placing text at cell (${cellX}, ${cellY})`);

    const x = cellX * cellWidth;
    // Math.random() * Math.floor(cellWidth / 2) * randomChoice([-1, 1]) +
    // Math.floor(cellWidth / 3);
    const y =
      cellY * cellHeight +
      // Math.random() * Math.floor(cellHeight / 2) * randomChoice([-1, 1]) +
      Math.floor(cellHeight / 2);

    const outputImagePath = path.join(outputDir, `frame_${i}.jpg`);
    await addTextToImage(imagePath, word, outputImagePath, x, y);
    console.log(`Image with text saved to ${outputImagePath}`);
    imagePath = outputImagePath;
  }

  // Create a looped audio file
  const loopedAudioPath = path.join(
    path.dirname(outputVideoPath),
    `${word}_looped.mp3`
  );
  await new Promise((resolve, reject) => {
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

  // Create video from images and looped audio
  ffmpeg()
    .input(path.join(outputDir, "frame_%d.jpg"))
    // .inputOptions("-framerate", "1")
    .inputOptions("-framerate", `${1 / duration}`)
    .input(loopedAudioPath)
    .outputOptions("-c:v", "libx264", "-pix_fmt", "yuv420p")
    .save(outputVideoPath)
    .on("end", () => {
      console.log(`Video saved to ${outputVideoPath}`);
    })
    .on("error", (err) => {
      console.error(`Error creating video: ${err.message}`);
    });
}

async function getAllowedCells(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  const gridSize = 6;
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);

  // Generate a list of allowed cells
  const allowedCells = [];
  for (let i = 1; i < gridSize - 1; i++) {
    for (let j = 1; j < gridSize - 1; j++) {
      allowedCells.push({ x: i, y: j });
    }
  }

  // Shuffle the allowed cells to randomize the placement
  for (let i = allowedCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allowedCells[i], allowedCells[j]] = [allowedCells[j], allowedCells[i]];
  }

  return { allowedCells, cellWidth, cellHeight };
}

async function getAllowedCellsFakeRandom(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();

  const width = metadata.width;
  const height = metadata.height;

  const gridSize = 6;
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);

  // Generate a list of allowed cells
  const allowedCells = [
    [0, 2],
    [0, 3],
    [1, 4],
    [2, 5],
    [3, 5],
    [4, 4],
    [5, 3],
    [5, 2],
    [4, 1],
    [3, 0],
    [2, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 4],
    [4, 3],
    [4, 2],
    [3, 1],
    [2, 1],
    [2, 2],
    [2, 3],
    [3, 3],
    [3, 2],
    // ].map(([x, y]) => ({ x: gridSize - x - 1, y: gridSize - y - 1 }));
  ].map(([x, y]) => ({ x, y: gridSize - y - 1 }));
  // .sort(() => Math.random());

  // allowedCells.sort(() => Math.random() - 0.5);

  return { allowedCells, cellWidth, cellHeight };
}

async function main() {
  const word = "cat";
  const imagePath = `public/images/${word}.png`;
  const audioPath = `public/audios/${word}.mp3`;
  const outputVideoPath = `/tmp/${word}.mp4`;

  await createVideo(word, imagePath, audioPath, outputVideoPath);
}

main().catch(console.error);
