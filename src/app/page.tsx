"use client";
import React, { useState } from 'react';

const Home: React.FC = () => {
  const [word, setWord] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const handleRollWord = async () => {
    const response = await fetch('/api/roll-word');
    const data = await response.json();
    setWord(data.word);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
      setImageUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const handleFetchImage = async () => {
    if (word) {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word }),
      });
      const data = await response.json();
      setImageUrl(data.imageUrl);
      setImage(null);
    }
  };

  const handleFetchAudio = async () => {
    if (word) {
      const response = await fetch(`/api/get-audio?word=${word}`);
      const data = await response.json();
      setAudioUrl(data.url);
    }
  };

  const handleGenerate = async () => {
    if (word && (image || imageUrl) && audioUrl) {
      const formData = new FormData();

      if (image) {
        formData.append('image', image, `${word}.png`);
      } else {
        const imageBlob = await fetch(imageUrl).then(response => response.blob());
        formData.append('image', imageBlob, `${word}.png`);
      }

      const audioBlob = await fetch(audioUrl).then(response => response.blob());
      formData.append('word', word);
      formData.append('audio', audioBlob, `${word}.mp3`);

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      const videoBlob = new Blob([Uint8Array.from(atob(data.video), c => c.charCodeAt(0))], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);
      setVideoUrl(videoUrl);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Word and Image Generator</h1>
      {imageUrl && <img src={imageUrl} alt="Generated" style={{ marginTop: '20px', maxWidth: '100%', marginBottom: '20px' }} />}
      {audioUrl && <audio controls src={audioUrl} style={{ marginTop: '20px', width: '100%', marginBottom: '20px' }} />}
      {videoUrl && <video controls src={videoUrl} style={{ marginTop: '20px', width: '100%', marginBottom: '20px' }} />}
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="Enter a word"
        style={{ padding: '10px', marginBottom: '10px', width: '100%', fontSize: '16px', boxSizing: 'border-box' }}
      />
      <button onClick={handleRollWord} style={{ padding: '10px 20px', marginBottom: '10px', fontSize: '16px', cursor: 'pointer', width: '100%' }}>Roll a Word</button>
      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginBottom: '10px', width: '100%' }} />
      <button onClick={handleFetchImage} style={{ padding: '10px 20px', marginBottom: '10px', fontSize: '16px', cursor: 'pointer', width: '100%' }}>Fetch Image</button>
      <button onClick={handleFetchAudio} style={{ padding: '10px 20px', marginBottom: '10px', fontSize: '16px', cursor: 'pointer', width: '100%' }}>Fetch Audio</button>
      <button onClick={handleGenerate} style={{ padding: '10px 20px', marginBottom: '10px', fontSize: '16px', cursor: 'pointer', width: '100%' }}>Generate</button>
    </div>
  );
};

export default Home;