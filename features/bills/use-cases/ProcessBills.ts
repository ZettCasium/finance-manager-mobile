import { Transaction } from '@/core/entities';
import { SupabaseBillRepository } from '../infrastructure/SupabaseBillRepository';
import { SupabaseTransactionRepository } from '@/features/transactions/infrastructure/SupabaseTransactionRepository';

export class ProcessBills {
  constructor(
    private billRepository: SupabaseBillRepository,
    private transactionRepository: SupabaseTransactionRepository
  ) {}

  async execute(userId: string): Promise<Transaction[]> {
    const bills = await this.billRepository.getBills(userId);
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
    const generatedTransactions: Transaction[] = [];

    for (const bill of bills) {
      if (!bill.active) continue;

      // 1. Check if bill has expired
      if (bill.endDate) {
        const endDate = new Date(bill.endDate);
        if (now > endDate) {
          // Auto-deactivate expired bills
          await this.billRepository.updateBill(bill.id, { active: false });
          continue;
        }
      }

      // 2. Check if transaction should be generated for this month
      const hasBeenGenerated = bill.lastGeneratedMonth === currentMonth;
      const isDayToGenerate = now.getDate() >= bill.billing_day;

      if (!hasBeenGenerated && isDayToGenerate) {
        const year = now.getFullYear();
        const month = now.getMonth();
        
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        const safeDay = Math.min(bill.billing_day, lastDayOfMonth);
        
        const transactionDate = `${currentMonth}-${String(safeDay).padStart(2, '0')}`;
        
        const newTransaction = await this.transactionRepository.addTransaction(userId, {
          amount: bill.amount,
          description: `[Recur] ${bill.name}`,
          category: bill.category,
          type: 'expense',
          date: transactionDate
        });

        await this.billRepository.updateBill(bill.id, {
          lastGeneratedMonth: currentMonth
        });

        generatedTransactions.push(newTransaction);
      }
    }

    return generatedTransactions;
  }
}
