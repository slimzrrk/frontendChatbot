import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';

  // 🔐 Sécurise l'affichage même si message.text est un objet
  const content = typeof message.text === 'string'
    ? message.text
    : typeof message.text?.text === 'string'
    ? message.text.text
    : JSON.stringify(message.text);

  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.bot]}>
      <Text style={styles.text}>{content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 16,
    maxWidth: '75%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: '#d0f0c0',
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: '#e1e1e1',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default ChatMessage;
