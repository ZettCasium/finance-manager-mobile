import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { View, StyleSheet } from 'react-native';

export default function ExploreScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Investments</ThemedText>
      <ThemedText>This feature is temporarily under maintenance.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
