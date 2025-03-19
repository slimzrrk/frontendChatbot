import React, { useState, useEffect, useRef } from 'react';
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
  const flatListRef = useRef();

  useEffect(() => {
    const welcome = "👋 أهلاً بك في تطبيق أبجيم! أنا هنا لمساعدتك، اسألني أي شيء تحب تعلمه.";
    typeBotMessage(welcome);
  }, []);

  const typeBotMessage = (text) => {
    const words = text.split(' ');
    let current = '';
    let index = 0;

    const typeNext = () => {
      if (index < words.length) {
        current += words[index++] + ' ';
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages.length && newMessages.at(-1)?.typing) {
            newMessages[newMessages.length - 1].text = current.trim();
            return [...newMessages];
          }
          return [...prev, { sender: 'bot', text: current.trim(), typing: true }];
        });
        setTimeout(typeNext, 150);
      } else {
        setMessages(prev => {
          const updated = [...prev];
          if (updated.at(-1)?.typing) updated[updated.length - 1].typing = false;
          return updated;
        });
      }
    };

    typeNext();
  };

  const addMessage = (sender, text) => {
    setMessages(prev => [...prev, { sender, text }]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('🎤 Erreur démarrage enregistrement:', err);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists || fileInfo.size === 0) {
        console.error('❌ Fichier audio vide ou introuvable');
        return;
      }

      setRecording(null);
      const transcription = await uploadAudioToWhisper(uri);
      addMessage('user', transcription);

      const reply = await askChatbot(userId, transcription);
      typeBotMessage(reply);
    } catch (err) {
      console.error('🛑 Erreur arrêt enregistrement:', err);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    const msg = textInput.trim();
    setTextInput('');
    addMessage('user', msg);

    try {
      const reply = await askChatbot(userId, msg);
      typeBotMessage(reply);
    } catch (err) {
      console.error('❌ Erreur GPT texte :', err.message);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.recording]}
          onPress={textInput.trim() ? handleTextSubmit : (isRecording ? stopRecording : startRecording)}
        >
          <Ionicons name={textInput.trim() ? 'send' : isRecording ? 'stop' : 'mic'} size={22} color="#fff" />
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: { backgroundColor: 'red' },
});

export default ChatScreen;
