import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const BASE_URL = 'http://10.10.100.24:5001/api'; // remplace par ton IP locale

export const uploadAudioToWhisper = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) throw new Error("Fichier audio introuvable");

    const extension = uri.split('.').pop();
    const mimeMap = {
      mp4: 'audio/mp4',
      m4a: 'audio/m4a',
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
    };
    const fileType = mimeMap[extension] || 'audio/m4a';

    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: `audio.${extension}`,
      type: fileType,
    });

    const response = await axios.post(`${BASE_URL}/whisper/transcribe`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.transcription;
  } catch (error) {
    console.error('Erreur upload Whisper :', error);
    throw error;
  }
};
export const askChatbot = async (userId, message) => {
    try {
      const response = await axios.post(`${BASE_URL}/chatbot/ask`, {
        userId,
        message,
      });
      return response.data.reply;
    } catch (error) {
      console.error('Erreur envoi chatbot :', error);
      throw error;
    }
  };