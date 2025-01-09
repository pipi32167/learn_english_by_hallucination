
export async function getWordAudioFromYoudao(word: string) {
  const response = await fetch(
    `http://dict.youdao.com/dictvoice?type=0&audio=${word}`
  );
  const audioBuffer = await response.arrayBuffer();
  return Buffer.from(audioBuffer);
}