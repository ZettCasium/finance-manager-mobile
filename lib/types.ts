export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Investment {
  id: string;
  name: string;
  symbol: string;
  type: 'stock' | 'crypto' | 'stake';
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  date: string;
}
