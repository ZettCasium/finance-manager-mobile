import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, Modal, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatCurrency = (amount: number) => {
  return 'Rp ' + amount.toLocaleString('id-ID');
};

const TransactionCard = ({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) => {
  const isIncome = item.type === 'income';
  return (
    <ThemedView style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="subtitle">{item.description}</ThemedText>
          <ThemedText style={styles.category}>{item.category} • {new Date(item.date).toLocaleDateString('id-ID')}</ThemedText>
        </View>
        <View style={styles.rightAction}>
          <ThemedText style={[styles.amount, isIncome ? styles.income : styles.expense]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </ThemedText>
          <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
  );
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: '',
    type: 'expense',
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('user_session');
      if (!userId) throw new Error('User not authenticated');

      const { data, error: dbError } = await supabase
        .from('ff_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (dbError) throw new Error(dbError.message);
      if (data) {
        setTransactions(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSubmit = async () => {
    try {
      if (!formData.amount || !formData.description || !formData.category) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }

      const userId = await AsyncStorage.getItem('user_session');
      if (!userId) throw new Error('User not authenticated');

      const { error: insertError } = await supabase
        .from('ff_transactions')
        .insert([{
          user_id: userId,
          amount: parseFloat(formData.amount),
          description: formData.description,
          category: formData.category,
          type: formData.type,
          date: new Date().toISOString().split('T')[0],
        }]);

      if (insertError) throw insertError;

      setIsAdding(false);
      setFormData({ amount: '', description: '', category: '', type: 'expense' });
      fetchTransactions();
    } catch (err: any) {
      Alert.alert('Error Saving', err.message);
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            const { error: delError } = await supabase
              .from('ff_transactions')
              .delete()
              .eq('id', id);
            
            if (delError) Alert.alert('Error', delError.message);
            else fetchTransactions();
          }
        }
      ]
    );
  };

  if (loading && transactions.length === 0) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Transactions</ThemedText>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        renderItem={({ item }) => <TransactionCard item={item} onDelete={handleDelete} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText>No transactions found.</ThemedText>
          </View>
        }
      />

      <Modal visible={isAdding} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ThemedView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Add Transaction</ThemedText>
              <TouchableOpacity onPress={() => setIsAdding(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeToggle}>
              <TouchableOpacity 
                style={[styles.typeButton, formData.type === 'expense' && styles.typeButtonExpense]} 
                onPress={() => setFormData({...formData, type: 'expense'})}
              >
                <Text style={[styles.typeButtonText, formData.type === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeButton, formData.type === 'income' && styles.typeButtonIncome]} 
                onPress={() => setFormData({...formData, type: 'income'})}
              >
                <Text style={[styles.typeButtonText, formData.type === 'income' && styles.typeButtonTextActive]}>Income</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Amount (IDR)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (e.g. Lunch)"
              placeholderTextColor="#999"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Category (e.g. Food)"
              placeholderTextColor="#999"
              value={formData.category}
              onChangeText={(text) => setFormData({ ...formData, category: text })}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Save Transaction</Text>
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
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  income: {
    color: '#059669',
  },
  expense: {
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
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonExpense: {
    backgroundColor: '#fee2e2',
  },
  typeButtonIncome: {
    backgroundColor: '#d1fae5',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#111827',
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
