import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { askChatbot, uploadAudioToWhisper } from '../services/api';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import ChatMessage from '../components/ChatMessage';
import * as FileSystem from 'expo-file-system';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const userId = 'child_001';

  const startRecording = async () => {
    try {
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
      setIsRecording(true);
    } catch (err) {
      console.error('Erreur démarrage enregistrement:', err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('🟢 URI audio :', uri);

      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📦 Fichier audio :', fileInfo);

      if (!fileInfo.exists || fileInfo.size === 0) {
        console.error("❌ Le fichier audio est vide ou n'existe pas.");
        return;
      }

      setRecording(null);

      // 1. Transcription via Whisper
      const transcription = await uploadAudioToWhisper(uri);
      addMessage('user', transcription);

      // 2. Réponse de GPT
      const reply = await askChatbot(userId, transcription);
      addMessage('bot', reply);
    } catch (err) {
      console.error('Erreur arrêt enregistrement:', err);
    }
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.recording]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Ionicons name={isRecording ? 'stop' : 'mic'} size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  micButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#6490ab',
    padding: 20,
    borderRadius: 50,
    elevation: 5,
  },
  recording: {
    backgroundColor: 'red',
  },
});

export default ChatScreen;
