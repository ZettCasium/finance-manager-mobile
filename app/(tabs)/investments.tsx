import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Investment } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatCurrency = (amount: number) => {
  return 'Rp ' + amount.toLocaleString('id-ID');
};

const InvestmentCard = ({ item, onDelete }: { item: Investment; onDelete: (id: string) => void }) => {
  const totalValue = item.quantity * item.currentPrice;
  const gainLoss = (item.currentPrice - item.buyPrice) * item.quantity;
  const isGain = gainLoss >= 0;

  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText style={styles.symbol}>{item.symbol} • {item.type}</ThemedText>
        </View>
        <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardBody}>
        <View>
          <ThemedText style={styles.label}>Quantity: {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}</ThemedText>
          <ThemedText style={styles.label}>Value: {formatCurrency(totalValue)}</ThemedText>
        </View>
        <ThemedText style={[styles.gainLoss, isGain ? styles.gain : styles.loss]}>
          {isGain ? '+' : ''}{formatCurrency(gainLoss)}
        </ThemedText>
      </View>
    </ThemedView>
  );
};

export default function InvestmentsScreen() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    type: 'stock',
    buyPrice: '',
    totalInvested: '',
    currentPrice: '',
  });

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_session');
      if (!userId) throw new Error('User not authenticated');

      const { data, error: dbError } = await supabase
        .from('ff_investments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);

      if (data) {
        const mappedData: Investment[] = data.map(inv => ({
          id: inv.id,
          name: inv.name,
          symbol: inv.symbol,
          type: inv.type,
          quantity: Number(inv.quantity),
          buyPrice: Number(inv.buy_price),
          currentPrice: Number(inv.current_price || 0),
          date: inv.date
        }));
        setInvestments(mappedData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.symbol || !formData.buyPrice || !formData.totalInvested) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      const userId = await AsyncStorage.getItem('user_session');
      if (!userId) throw new Error('User not authenticated');

      const buyPrice = parseFloat(formData.buyPrice);
      const totalAmount = parseFloat(formData.totalInvested);
      const quantity = totalAmount / buyPrice;
      const currentPrice = formData.currentPrice ? parseFloat(formData.currentPrice) : buyPrice;

      const { error: insertError } = await supabase
        .from('ff_investments')
        .insert([{
          user_id: userId,
          name: formData.name,
          symbol: formData.symbol.toUpperCase(),
          type: formData.type,
          quantity: quantity,
          buy_price: buyPrice,
          current_price: currentPrice,
          date: new Date().toISOString().split('T')[0],
        }]);

      if (insertError) throw insertError;

      setIsAdding(false);
      setFormData({ name: '', symbol: '', type: 'stock', buyPrice: '', totalInvested: '', currentPrice: '' });
      fetchInvestments();
    } catch (err: any) {
      Alert.alert('Error Saving', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to remove this asset?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error: delError } = await supabase
              .from('ff_investments')
              .delete()
              .eq('id', id);
            
            if (delError) Alert.alert('Error', delError.message);
            else fetchInvestments();
          }
        }
      ]
    );
  };

  if (loading && investments.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Portfolio</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add Asset</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={investments}
        renderItem={({ item }) => <InvestmentCard item={item} onDelete={handleDelete} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText>No assets found.</ThemedText>
          </View>
        }
      />

      <Modal visible={isAdding} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Add New Asset</ThemedText>
              <TouchableOpacity onPress={() => setIsAdding(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Asset Name (e.g. Bitcoin)"
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Symbol (e.g. BTC)"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              value={formData.symbol}
              onChangeText={(text) => setFormData({ ...formData, symbol: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Buy Price (Avg)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.buyPrice}
              onChangeText={(text) => setFormData({ ...formData, buyPrice: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Total Invested (IDR)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.totalInvested}
              onChangeText={(text) => setFormData({ ...formData, totalInvested: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Current Price (Optional)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.currentPrice}
              onChangeText={(text) => setFormData({ ...formData, currentPrice: text })}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Add to Portfolio</Text>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
  },
  addButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  symbol: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    opacity: 0.7,
  },
  gainLoss: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gain: {
    color: '#059669',
  },
  loss: {
    color: '#ef4444',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
