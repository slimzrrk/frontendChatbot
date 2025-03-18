import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { askChatbot, uploadAudioToWhisper } from '../services/api';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import ChatMessage from '../components/ChatMessage';
import * as FileSystem from 'expo-file-system';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const userId = 'child_001';

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
  };

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

      const transcription = await uploadAudioToWhisper(uri);
      addMessage('user', transcription);

      const reply = await askChatbot(userId, transcription);
      addMessage('bot', reply);
    } catch (err) {
      console.error('Erreur arrêt enregistrement:', err);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    const message = textInput.trim();
    setTextInput('');
    addMessage('user', message);

    try {
      const reply = await askChatbot(userId, message);
      addMessage('bot', reply);
    } catch (err) {
      console.error("❌ Erreur GPT texte :", err.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="اكتب سؤالك هنا..."
          value={textInput}
          onChangeText={setTextInput}
          returnKeyType="send"
          onSubmitEditing={handleTextSubmit}
        />

        {textInput.trim() === '' ? (
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.recording]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleTextSubmit}
          >
            <Ionicons name="send" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  micButton: {
    backgroundColor: '#6490ab',
    padding: 12,
    marginLeft: 10,
    borderRadius: 50,
  },
  recording: {
    backgroundColor: 'red',
  },
  sendButton: {
    backgroundColor: '#6490ab',
    padding: 12,
    marginLeft: 10,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
