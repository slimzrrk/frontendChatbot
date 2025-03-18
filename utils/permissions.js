import { Audio } from 'expo-av';

export const requestAudioPermission = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
};
