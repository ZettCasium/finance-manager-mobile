import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { formatIDR, formatNumberInput, parseNumberInput } from '@/core/formatters/currency';
import { Transaction, TransactionType } from '@/core/entities';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/features/transactions/domain/types';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { GetUserTransactions } from '@/features/transactions/use-cases/GetUserTransactions';
import { AddTransaction } from '@/features/transactions/use-cases/AddTransaction';
import { DeleteTransaction } from '@/features/transactions/use-cases/DeleteTransaction';
import { useColorScheme } from '@/hooks/use-color-scheme';

const repository = new SupabaseTransactionRepository();
const getUserTransactions = new GetUserTransactions(repository);
const addTransactionUseCase = new AddTransaction(repository);
const deleteTransactionUseCase = new DeleteTransaction(repository);

export default function TransactionsScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [amountDisplay, setAmountDisplay] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserTransactions.execute(user.id);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddTransaction = async () => {
    const rawAmount = parseNumberInput(amountDisplay);
    if (!rawAmount || !user) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setIsSaving(true);
    try {
      const newTransaction = await addTransactionUseCase.execute(user.id, {
        amount: parseFloat(rawAmount),
        description,
        category,
        type,
        date,
      });
      setTransactions([newTransaction, ...transactions]);
      setIsAdding(false);
      resetForm();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    Alert.alert('Delete', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransactionUseCase.execute(id);
            setTransactions(transactions.filter(t => t.id !== id));
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setAmountDisplay('');
    setDescription('');
    setCategory(type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={[styles.transactionItem, { borderBottomColor: isDark ? '#27272a' : '#f4f4f5' }]}>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionDesc, { color: isDark ? '#fafafa' : '#18181b' }]}>{item.description}</Text>
        <View style={styles.transactionMeta}>
          <Text style={styles.transactionCategory}>{item.category}</Text>
          <Text style={styles.transactionDate}>{item.date}</Text>
        </View>
      </View>
      <View style={styles.transactionAction}>
        <Text style={[styles.transactionAmount, { color: item.type === 'income' ? '#059669' : (isDark ? '#fafafa' : '#18181b') }]}>
          {item.type === 'income' ? '+' : '-'}{formatIDR(item.amount)}
        </Text>
        <TouchableOpacity onPress={() => handleDeleteTransaction(item.id)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#09090b' : '#fafafa' }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#09090b' : '#fafafa' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#fafafa' : '#18181b' }]}>Transactions</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAdding(true)}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No transactions found</Text>}
      />

      <Modal visible={isAdding} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContent, { backgroundColor: isDark ? '#18181b' : '#ffffff' }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fafafa' : '#18181b' }]}>New Transaction</Text>
              <TouchableOpacity onPress={() => setIsAdding(false)}>
                <Ionicons name="close" size={24} color={isDark ? '#a1a1aa' : '#71717a'} />
              </TouchableOpacity>
            </View>

            <View style={styles.form}>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
                  onPress={() => {
                    setType('expense');
                    setCategory(EXPENSE_CATEGORIES[0]);
                  }}
                >
                  <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
                  onPress={() => {
                    setType('income');
                    setCategory(INCOME_CATEGORIES[0]);
                  }}
                >
                  <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>Income</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? '#d4d4d8' : '#3f3f46' }]}>Amount (Rp)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#ffffff' : '#000000' }]}
                  placeholder="0"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric"
                  value={amountDisplay}
                  onChangeText={val => setAmountDisplay(formatNumberInput(val))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: isDark ? '#d4d4d8' : '#3f3f46' }]}>Description</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: isDark ? '#27272a' : '#f4f4f5', color: isDark ? '#ffffff' : '#000000' }]}
                  placeholder="What was this for?"
                  placeholderTextColor="#a1a1aa"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#059669' }]}
                onPress={handleAddTransaction}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Transaction</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 10,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  transactionCategory: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  transactionAction: {
    alignItems: 'flex-end',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#a1a1aa',
    paddingVertical: 40,
    fontSize: 16,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    gap: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
  },
  typeButtonTextActive: {
    color: '#18181b',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
