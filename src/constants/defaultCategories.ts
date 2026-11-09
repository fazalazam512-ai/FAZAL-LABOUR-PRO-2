import { Category } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // EXPENSE CATEGORIES
  {
    id: 'cat_food',
    name: 'Food & Dining',
    icon: 'Utensils',
    color: '#f97316', // Orange
    type: 'expense',
    isDefault: true,
    subcategories: ['Groceries', 'Restaurants', 'Fast Food', 'Tea/Coffee', 'Other Food'],
  },
  {
    id: 'cat_transport',
    name: 'Transportation',
    icon: 'Car',
    color: '#3b82f6', // Blue
    type: 'expense',
    isDefault: true,
    subcategories: ['Fuel', 'Public Transport', 'Taxi/Ride', 'Vehicle Maintenance', 'Parking'],
  },
  {
    id: 'cat_health',
    name: 'Health & Medical',
    icon: 'HeartPulse',
    color: '#ef4444', // Red
    type: 'expense',
    isDefault: true,
    subcategories: ['Doctor', 'Medicine', 'Hospital', 'Medical Tests', 'Health Insurance'],
  },
  {
    id: 'cat_education',
    name: 'Education',
    icon: 'GraduationCap',
    color: '#8b5cf6', // Purple
    type: 'expense',
    isDefault: true,
    subcategories: ['School/College', 'University', 'Courses', 'Books', 'Stationery'],
  },
  {
    id: 'cat_utilities',
    name: 'Utilities',
    icon: 'Zap',
    color: '#eab308', // Yellow
    type: 'expense',
    isDefault: true,
    subcategories: ['Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Other Utilities'],
  },
  {
    id: 'cat_housing',
    name: 'Housing & Home',
    icon: 'Home',
    color: '#14b8a6', // Teal
    type: 'expense',
    isDefault: true,
    subcategories: ['Rent', 'Maintenance', 'Furniture', 'Home Supplies'],
  },
  {
    id: 'cat_entertainment',
    name: 'Entertainment',
    icon: 'Film',
    color: '#ec4899', // Pink
    type: 'expense',
    isDefault: true,
    subcategories: ['Movies', 'Games', 'Streaming', 'Events', 'Other Entertainment'],
  },
  {
    id: 'cat_shopping',
    name: 'Shopping',
    icon: 'ShoppingBag',
    color: '#06b6d4', // Cyan
    type: 'expense',
    isDefault: true,
    subcategories: ['Clothing', 'Electronics', 'Personal Items', 'General Shopping'],
  },
  {
    id: 'cat_family',
    name: 'Family & Personal',
    icon: 'Users',
    color: '#a855f7', // Violet
    type: 'expense',
    isDefault: true,
    subcategories: ['Children', 'Parents', 'Family Support', 'Gifts'],
  },
  {
    id: 'cat_financial',
    name: 'Financial & Fees',
    icon: 'Landmark',
    color: '#64748b', // Slate
    type: 'expense',
    isDefault: true,
    subcategories: ['Loan Repayment', 'Bank Fees', 'Credit Card', 'Investments', 'Savings'],
  },
  {
    id: 'cat_other_exp',
    name: 'Other Expense',
    icon: 'HelpCircle',
    color: '#94a3b8', // Gray
    type: 'expense',
    isDefault: true,
    subcategories: ['Miscellaneous', 'Donations', 'Emergency'],
  },

  // INCOME CATEGORIES
  {
    id: 'cat_salary',
    name: 'Salary',
    icon: 'Briefcase',
    color: '#10b981', // Emerald
    type: 'income',
    isDefault: true,
    subcategories: ['Monthly Salary', 'Bonus', 'Overtime'],
  },
  {
    id: 'cat_business',
    name: 'Business & Sales',
    icon: 'TrendingUp',
    color: '#059669', // Green
    type: 'income',
    isDefault: true,
    subcategories: ['Sales Revenue', 'Client Payment', 'Consulting'],
  },
  {
    id: 'cat_freelance',
    name: 'Freelance & Gig',
    icon: 'Laptop',
    color: '#0d9488', // Teal
    type: 'income',
    isDefault: true,
    subcategories: ['Upwork/Fiverr', 'Design', 'Development', 'Writing'],
  },
  {
    id: 'cat_investment_inc',
    name: 'Investments & Dividends',
    icon: 'Coins',
    color: '#0284c7', // Sky
    type: 'income',
    isDefault: true,
    subcategories: ['Stock Dividends', 'Crypto', 'Profit Share', 'Interest'],
  },
  {
    id: 'cat_rental_inc',
    name: 'Rental Income',
    icon: 'Building',
    color: '#6366f1', // Indigo
    type: 'income',
    isDefault: true,
    subcategories: ['Property Rent', 'Equipment Rent'],
  },
  {
    id: 'cat_other_inc',
    name: 'Other Income',
    icon: 'Wallet',
    color: '#22c55e', // Light green
    type: 'income',
    isDefault: true,
    subcategories: ['Gift', 'Tax Refund', 'Cashback', 'Other'],
  },
];
