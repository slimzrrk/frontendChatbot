import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChatMessage from '../components/ChatMessage';
import { Audio } from 'expo-av';
import { askChatbot, uploadAudioToWhisper } from '../services/api';
import * as FileSystem from 'expo-file-system';

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const flatListRef = useRef();

  const userId = 'child_001';

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const typeMessage = (text) => {
    const words = text.split(' ');
    let current = '';
    let index = 0;

    const typeNext = () => {
      if (index < words.length) {
        current += words[index] + ' ';
        index++;
        setMessages((prev) => {
          const newMessages = [...prev];
          if (
            newMessages.length &&
            newMessages[newMessages.length - 1].sender === 'bot' &&
            newMessages[newMessages.length - 1].typing
          ) {
            newMessages[newMessages.length - 1].text = current.trim();
            return [...newMessages];
          } else {
            return [...prev, { sender: 'bot', text: current.trim(), typing: true }];
          }
        });
        setTimeout(typeNext, 100);
      } else {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.typing) {
            updated[updated.length - 1].typing = false;
          }
          return updated;
        });
        setTimeout(scrollToBottom, 100);
      }
    };

    typeNext();
  };

  const addMessage = (sender, text) => {
    setMessages((prev) => [...prev, { sender, text }]);
    setTimeout(scrollToBottom, 100);
  };

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
      },
    });

    setRecording(recording);
    setIsRecording(true);
  };

  const stopRecording = async () => {
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === 0) return;

    setRecording(null);
    const transcription = await uploadAudioToWhisper(uri);
    addMessage('user', transcription);
    const reply = await askChatbot(userId, transcription);
    typeMessage(reply);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;

    const message = textInput.trim();
    setTextInput('');
    addMessage('user', message);
    const reply = await askChatbot(userId, message);
    typeMessage(reply);
  };

  useEffect(() => {
    typeMessage("👋 أهلاً بك في تطبيق أبجيم! أنا هنا لمساعدتك، اسألني أي شيء تحب تعلمه.");
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0} // 👈 ici tu peux mettre -10, 0, ou même -20 si besoin
        >
          {/* ✅ Titre en haut */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>المحادثة مع أبجيم 🤖</Text>
          </View>

          {/* 📩 Liste des messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => <ChatMessage message={item} />}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={scrollToBottom}
            keyboardShouldPersistTaps="handled"
          />

          {/* ⌨️ Barre de saisie */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="اكتب سؤالك هنا.."
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={handleTextSubmit}
              blurOnSubmit={false}
              returnKeyType="send"
            />

            {textInput.trim() === '' ? (
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.recording]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <Ionicons name={isRecording ? 'stop' : 'mic'} size={24} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.sendButton} onPress={handleTextSubmit}>
                <Ionicons name="send" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1 },
  header: {
    backgroundColor: '#6490ab',
    padding: 14,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  messageList: {
    padding: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ccc',
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
