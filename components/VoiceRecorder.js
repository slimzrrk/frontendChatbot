import React, { useState } from 'react';
import { View, Button, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { uploadAudioToWhisper } from '../services/api';

const VoiceRecorder = ({ onTranscription }) => {
  const [recording, setRecording] = useState(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    const { recording } = await Audio.Recording.createAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });

    setRecording(recording);
  };

  const stopRecording = async () => {
    setLoading(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("🟢 URI audio :", uri);

    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log("📦 Fichier audio :", fileInfo);

    if (!fileInfo.exists || fileInfo.size === 0) {
      console.error("❌ Fichier audio vide ou inexistant.");
      setLoading(false);
      return;
    }

    setRecording(null);

    try {
      const transcription = await uploadAudioToWhisper(uri);
      setLoading(false);
      onTranscription(transcription);
    } catch (error) {
      console.error("❌ Transcription échouée :", error);
      setLoading(false);
    }
  };

  return (
    <View>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title={recording ? 'Arrêter' : 'Parler'} onPress={recording ? stopRecording : startRecording} />
      )}
    </View>
  );
};

export default VoiceRecorder;
