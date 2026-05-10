import React from 'react';
import { View, Text } from 'react-native';

// This component is temporarily disabled.
export function StockChart({ symbol }: { symbol: string }) {
  return (
    <View>
      <Text>Chart for {symbol} is temporarily unavailable.</Text>
    </View>
  );
}
