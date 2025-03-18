import React from 'react';
import { SafeAreaView } from 'react-native';
import ChatScreen from './screens/ChatScreen';

const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ChatScreen />
    </SafeAreaView>
  );
};

export default App;
