import fs from 'fs';
import path from 'path';
import { compositeVideo } from '../video-utils';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import getAudioDurationInSeconds from 'get-audio-duration';

jest.mock('fs');
jest.mock('sharp');
jest.mock('fluent-ffmpeg');
jest.mock('get-audio-duration');

describe('compositeVideo', () => {
	const mockImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
	const mockAudio = 'data:audio/mp3;base64,SUQzAwAAAAAA';
	const word = 'test';
	const imagePath = path.join(process.cwd(), 'public', 'images', `${word}.png`);
	const audioPath = path.join(process.cwd(), 'public', 'audios', `${word}.mp3`);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should process image and audio correctly', async () => {
		(getAudioDurationInSeconds as jest.Mock).mockResolvedValue(1);
		(sharp as jest.Mock).mockReturnValue({
			toFile: jest.fn().mockResolvedValue(undefined),
		});
		(ffmpeg as jest.Mock).mockReturnValue({
			audioFilters: jest.fn().mockReturnThis(),
			save: jest.fn().mockReturnThis(),
			on: jest.fn().mockImplementation((event, callback) => {
				if (event === 'end') callback();
				return this;
			}),
		});

		await compositeVideo(mockImage, imagePath, mockAudio, audioPath, word);

		expect(sharp).toHaveBeenCalledWith(Buffer.from(mockImage.split(',')[1], 'base64'));
		expect(fs.writeFileSync).toHaveBeenCalledWith(audioPath, expect.any(Buffer));
		expect(getAudioDurationInSeconds).toHaveBeenCalledWith(audioPath);
		expect(fs.copyFileSync).toHaveBeenCalledWith(audioPath, expect.any(String));
	});
});

