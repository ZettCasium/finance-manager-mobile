import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MOCK_TRANSACTIONS } from '@/lib/mock-data';
import { Transaction } from '@/lib/types';
import { useColorScheme } from 'react-native';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';

const totalIncome = MOCK_TRANSACTIONS
  .filter(t => t.type === 'income')
  .reduce((acc, curr) => acc + curr.amount, 0);

const totalExpenses = MOCK_TRANSACTIONS
  .filter(t => t.type === 'expense')
  .reduce((acc, curr) => acc + curr.amount, 0);

const balance = totalIncome - totalExpenses;

const recentTransactions = [...MOCK_TRANSACTIONS]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 5);

export default function DashboardScreen() {
  const colorScheme = useColorScheme() || 'light';
  const styles = getStyles(colorScheme);

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIconContainer}>
        <Text style={styles.transactionIcon}>{item.type === 'income' ? '↓' : '↑'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.transactionDescription}>{item.description}</ThemedText>
        <ThemedText style={styles.transactionCategory}>{item.category} • {item.date}</ThemedText>
      </View>
      <ThemedText style={item.type === 'income' ? styles.incomeAmount : styles.expenseAmount}>
        {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
      </ThemedText>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">Welcome back, John!</ThemedText>
          <ThemedText type="subtitle">Here's your financial overview.</ThemedText>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Total Balance</ThemedText>
            <ThemedText style={styles.balanceAmount}>${balance.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Monthly Income</ThemedText>
            <ThemedText style={[styles.summaryAmount, styles.incomeAmount]}>
              +${totalIncome.toLocaleString()}
            </ThemedText>
          </View>
          <View style={styles.summaryCard}>
            <ThemedText style={styles.summaryLabel}>Monthly Expenses</ThemedText>
            <ThemedText style={[styles.summaryAmount, styles.expenseAmount]}>
              -${totalExpenses.toLocaleString()}
            </ThemedText>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.recentActivityContainer}>
          <View style={styles.recentActivityHeader}>
            <ThemedText type="subtitle" style={{fontWeight: 'bold'}}>Recent Activity</ThemedText>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.transactionListContainer}>
            <FlatList
              data={recentTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={item => item.id}
              scrollEnabled={false} // Disable inner scroll
            />
          </View>
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const getStyles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors[colorScheme].background,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  summaryContainer: {
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: Colors[colorScheme].card,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors[colorScheme].text,
    opacity: 0.7,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
    color: Colors[colorScheme].text,
  },
  incomeAmount: {
    color: '#10b981', // emerald-500
  },
  expenseAmount: {
    color: '#ef4444', // rose-500
  },
  recentActivityContainer: {
    // No specific styles needed
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#059669', // emerald-600
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionListContainer: {
    backgroundColor: Colors[colorScheme].card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors[colorScheme].border,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors[colorScheme].border,
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: Colors[colorScheme].background,
  },
  transactionIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors[colorScheme].text,
  },
  transactionDescription: {
    fontWeight: 'bold',
  },
  transactionCategory: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});
