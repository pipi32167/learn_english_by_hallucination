import { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';

const cefrWords = [
  // Add a list of CEFR 5000 words here
  'apple', 'banana', 'cat', 'dog', 'elephant', // Example words
  // ...
];

const router = createRouter<NextApiRequest, NextApiResponse>();

router.get((req, res) => {
  const randomIndex = Math.floor(Math.random() * cefrWords.length);
  const randomWord = cefrWords[randomIndex];
  res.status(200).json({ word: randomWord });
});

export default router.handler();
