import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { formatIDR } from '@/core/formatters/currency';
import { Transaction, Bill, Investment } from '@/core/entities';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';
import { SupabaseBudgetRepository } from '@/features/budgets/infrastructure/SupabaseBudgetRepository';
import { SupabaseBillRepository } from '@/features/bills/infrastructure/SupabaseBillRepository';
import { GetBudgetProgress, BudgetProgress } from '@/features/budgets/use-cases/GetBudgetProgress';
import { ProcessBills } from '@/features/bills/use-cases/ProcessBills';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabase';

const transactionRepository = new SupabaseTransactionRepository();
const budgetRepository = new SupabaseBudgetRepository();
const billRepository = new SupabaseBillRepository();
const getBudgetProgress = new GetBudgetProgress(budgetRepository, transactionRepository);
const processBills = new ProcessBills(billRepository, transactionRepository);

export default function DashboardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetProgress, setBudgetProgress] = useState<BudgetProgress[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Process recurring transactions
      await processBills.execute(user.id);

      // 2. Fetch fresh data
      const [transData, budgets, billsData] = await Promise.all([
        transactionRepository.getTransactions(user.id),
        getBudgetProgress.execute(user.id, currentMonthStr),
        billRepository.getBills(user.id),
      ]);

      const { data: investData } = await supabase
        .from('ff_investments')
        .select('*')
        .eq('user_id', user.id);

      const mappedInvestments: Investment[] = (investData || []).map(inv => ({
        id: inv.id,
        name: inv.name,
        symbol: inv.symbol,
        type: inv.type,
        quantity: Number(inv.quantity),
        buyPrice: Number(inv.buy_price),
        currentPrice: Number(inv.current_price || 0),
        date: inv.date
      }));

      setTransactions(transData);
      setBudgetProgress(budgets);
      setBills(billsData);
      setInvestments(mappedInvestments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentMonthStr]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const stats = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const balance = totalIncome - totalExpenses;

    const currentInvestValue = investments.reduce((acc, inv) => acc + (inv.currentPrice * inv.quantity), 0);
    const totalInvested = investments.reduce((acc, inv) => acc + (inv.buyPrice * inv.quantity), 0);
    const investGainLoss = currentInvestValue - totalInvested;

    const unpaidBills = bills.filter(b => b.active && b.lastGeneratedMonth !== currentMonthStr);
    const totalUpcomingBills = unpaidBills.reduce((acc, b) => acc + b.amount, 0);

    return {
      balance,
      totalIncome,
      totalExpenses,
      currentInvestValue,
      investGainLoss,
      totalUpcomingBills,
      unpaidBillsCount: unpaidBills.length,
      netWorth: balance + currentInvestValue,
    };
  }, [transactions, investments, bills, currentMonthStr]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#09090b' : '#fafafa' }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? '#09090b' : '#fafafa' }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#059669" />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, { color: isDark ? '#a1a1aa' : '#71717a' }]}>Welcome back,</Text>
          <Text style={[styles.nameText, { color: isDark ? '#fafafa' : '#18181b' }]}>
            {user?.email?.split('@')[0] || 'User'}
          </Text>
        </View>
        <View style={[styles.netWorthBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ecfdf5' }]}>
          <Ionicons name="wallet-outline" size={16} color="#059669" />
          <Text style={[styles.netWorthText, { color: isDark ? '#34d399' : '#047857' }]}>
            {formatIDR(stats.netWorth)}
          </Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
          <Text style={[styles.cardLabel, { color: isDark ? '#a1a1aa' : '#71717a' }]}>Cash Balance</Text>
          <Text style={[styles.cardValue, { color: stats.balance >= 0 ? (isDark ? '#fafafa' : '#18181b') : '#e11d48' }]}>
            {formatIDR(stats.balance)}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons name="arrow-down-outline" size={12} color="#059669" />
              <Text style={[styles.footerText, { color: '#059669' }]}>{formatIDR(stats.totalIncome)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Ionicons name="arrow-up-outline" size={12} color="#e11d48" />
              <Text style={[styles.footerText, { color: '#e11d48' }]}>{formatIDR(stats.totalExpenses)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
          <Text style={[styles.cardLabel, { color: isDark ? '#a1a1aa' : '#71717a' }]}>Investment Value</Text>
          <Text style={[styles.cardValue, { color: isDark ? '#fafafa' : '#18181b' }]}>
            {formatIDR(stats.currentInvestValue)}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Ionicons 
                name={stats.investGainLoss >= 0 ? "trending-up-outline" : "trending-down-outline"} 
                size={12} 
                color={stats.investGainLoss >= 0 ? "#059669" : "#e11d48"} 
              />
              <Text style={[styles.footerText, { color: stats.investGainLoss >= 0 ? "#059669" : "#e11d48" }]}>
                {stats.investGainLoss >= 0 ? '+' : ''}{formatIDR(stats.investGainLoss)}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
          <Text style={[styles.cardLabel, { color: isDark ? '#a1a1aa' : '#71717a' }]}>Upcoming Bills</Text>
          <Text style={[styles.cardValue, { color: stats.totalUpcomingBills > 0 ? '#d97706' : (isDark ? '#fafafa' : '#18181b') }]}>
            {formatIDR(stats.totalUpcomingBills)}
          </Text>
          <Text style={[styles.footerText, { color: isDark ? '#a1a1aa' : '#71717a', marginTop: 8 }]}>
            {stats.unpaidBillsCount} unpaid bills remaining
          </Text>
        </View>
      </View>

      {/* Budget Summary */}
      {budgetProgress.length > 0 && (
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fafafa' : '#18181b' }]}>Budget Summary</Text>
            <Ionicons name="chevron-forward" size={20} color="#059669" />
          </View>
          <View style={styles.budgetList}>
            {budgetProgress.slice(0, 4).map((p) => {
              const isOver = p.percentage >= 100;
              const isWarning = p.percentage >= 80;
              const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
              
              return (
                <View key={p.category} style={styles.budgetItem}>
                  <View style={styles.budgetRow}>
                    <Text style={[styles.categoryText, { color: isDark ? '#d4d4d8' : '#3f3f46' }]}>{p.category}</Text>
                    <Text style={[styles.percentageText, { color: barColor }]}>
                      {p.percentage.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#27272a' : '#f4f4f5' }]}>
                    <View 
                      style={[styles.progressBarFill, { backgroundColor: barColor, width: `${Math.min(p.percentage, 100)}%` }]} 
                    />
                  </View>
                  <View style={styles.budgetRow}>
                    <Text style={styles.spentText}>{formatIDR(p.spentAmount)}</Text>
                    <Text style={styles.spentText}>Limit: {formatIDR(p.budgetAmount)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Activity */}
      <View style={[styles.sectionCard, { backgroundColor: isDark ? '#18181b' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fafafa' : '#18181b' }]}>Recent Activity</Text>
          <Ionicons name="chevron-forward" size={20} color="#059669" />
        </View>
        <View style={styles.activityList}>
          {transactions.slice(0, 5).map((t) => (
            <View key={t.id} style={[styles.activityItem, { borderBottomColor: isDark ? '#27272a' : '#f4f4f5' }]}>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityDesc, { color: isDark ? '#fafafa' : '#18181b' }]} numberOfLines={1}>
                  {t.description}
                </Text>
                <Text style={styles.activityDate}>{t.date}</Text>
              </View>
              <Text style={[styles.activityAmount, { color: t.type === 'income' ? '#059669' : (isDark ? '#fafafa' : '#18181b') }]}>
                {t.type === 'income' ? '+' : '-'}{formatIDR(t.amount)}
              </Text>
            </View>
          ))}
          {transactions.length === 0 && (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
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
    marginTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  netWorthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  netWorthText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  budgetList: {
    gap: 20,
  },
  budgetItem: {
    gap: 8,
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  spentText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#a1a1aa',
  },
  activityList: {
    gap: 0,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityInfo: {
    flex: 1,
    marginRight: 10,
  },
  activityDesc: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#a1a1aa',
    paddingVertical: 20,
  },
});
