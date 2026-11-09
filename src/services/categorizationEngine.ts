import { Category } from '../types';
import { storageService } from './storageService';

interface SuggestionResult {
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  confidence: 'high' | 'medium' | 'low';
  matchedKeyword?: string;
}

// Keyword mapping dictionary based on real-world transaction patterns
const KEYWORD_RULES: {
  keywords: string[];
  categoryId: string;
  subcategory?: string;
  confidence: 'high' | 'medium';
}[] = [
  // Food & Dining
  {
    keywords: ['groceries', 'vegetable', 'vegetables', 'milk', 'bread', 'fruit', 'fruits', 'meat', 'chicken', 'supermarket', 'mart', 'hyperstar', 'carrefour', 'eggs', 'flour', 'rice', 'oil', 'ghee'],
    categoryId: 'cat_food',
    subcategory: 'Groceries',
    confidence: 'high',
  },
  {
    keywords: ['restaurant', 'dinner', 'lunch', 'breakfast', 'dining', 'bistro', 'cafe', 'treat', 'biryani', 'pizza', 'burger', 'kfc', 'mcdonald', 'subway', 'steak'],
    categoryId: 'cat_food',
    subcategory: 'Restaurants',
    confidence: 'high',
  },
  {
    keywords: ['tea', 'coffee', 'chai', 'starbucks', 'dunkin', 'snack', 'bakery', 'samosa'],
    categoryId: 'cat_food',
    subcategory: 'Tea/Coffee',
    confidence: 'high',
  },
  {
    keywords: ['food', 'meal', 'swiggy', 'zomato', 'foodpanda', 'takeaway', 'delivery'],
    categoryId: 'cat_food',
    subcategory: 'Fast Food',
    confidence: 'medium',
  },

  // Transportation
  {
    keywords: ['petrol', 'fuel', 'diesel', 'cng', 'gasoline', 'gas station', 'pso', 'shell', 'total parco'],
    categoryId: 'cat_transport',
    subcategory: 'Fuel',
    confidence: 'high',
  },
  {
    keywords: ['uber', 'careem', 'indrive', 'taxi', 'cab', 'rickshaw'],
    categoryId: 'cat_transport',
    subcategory: 'Taxi/Ride',
    confidence: 'high',
  },
  {
    keywords: ['bus', 'metro', 'train', 'subway', 'ticket', 'flight', 'airline', 'transit', 'fare'],
    categoryId: 'cat_transport',
    subcategory: 'Public Transport',
    confidence: 'high',
  },
  {
    keywords: ['car service', 'oil change', 'car wash', 'mechanic', 'tire', 'tyre', 'maintenance car', 'bike repair'],
    categoryId: 'cat_transport',
    subcategory: 'Vehicle Maintenance',
    confidence: 'high',
  },
  {
    keywords: ['toll', 'parking', 'motorway toll'],
    categoryId: 'cat_transport',
    subcategory: 'Parking',
    confidence: 'high',
  },

  // Health
  {
    keywords: ['doctor', 'clinic', 'consultation', 'physician', 'dentist', 'eye checkup', 'therapist'],
    categoryId: 'cat_health',
    subcategory: 'Doctor',
    confidence: 'high',
  },
  {
    keywords: ['medicine', 'pharmacy', 'panadol', 'drug', 'prescription', 'pills', 'vitamins', 'supplement', 'd-watson', 'servaid'],
    categoryId: 'cat_health',
    subcategory: 'Medicine',
    confidence: 'high',
  },
  {
    keywords: ['hospital', 'emergency', 'surgery', 'icu', 'opd', 'admission'],
    categoryId: 'cat_health',
    subcategory: 'Hospital',
    confidence: 'high',
  },
  {
    keywords: ['lab', 'blood test', 'x-ray', 'mri', 'medical test', 'ultrasound', 'chughtai'],
    categoryId: 'cat_health',
    subcategory: 'Medical Tests',
    confidence: 'high',
  },

  // Education
  {
    keywords: ['school', 'college', 'tuition', 'academy', 'semester', 'exam fee', 'admission fee'],
    categoryId: 'cat_education',
    subcategory: 'School/College',
    confidence: 'high',
  },
  {
    keywords: ['university', 'uni fee', 'degree', 'campus'],
    categoryId: 'cat_education',
    subcategory: 'University',
    confidence: 'high',
  },
  {
    keywords: ['udemy', 'coursera', 'course', 'tutorial', 'training', 'bootcamp', 'certification'],
    categoryId: 'cat_education',
    subcategory: 'Courses',
    confidence: 'high',
  },
  {
    keywords: ['book', 'stationery', 'notebook', 'pen', 'pencil', 'textbook', 'library'],
    categoryId: 'cat_education',
    subcategory: 'Books',
    confidence: 'high',
  },

  // Utilities
  {
    keywords: ['electricity', 'electric bill', 'power bill', 'k-electric', 'lesco', 'iesco', 'gepco', 'wapda', 'bijli'],
    categoryId: 'cat_utilities',
    subcategory: 'Electricity',
    confidence: 'high',
  },
  {
    keywords: ['gas bill', 'sui gas', 'ssgc', 'sngpl', 'lpg', 'cylinder'],
    categoryId: 'cat_utilities',
    subcategory: 'Gas',
    confidence: 'high',
  },
  {
    keywords: ['water bill', 'water tanker', 'clean water'],
    categoryId: 'cat_utilities',
    subcategory: 'Water',
    confidence: 'high',
  },
  {
    keywords: ['internet', 'wifi', 'broadband', 'fiber', 'ptcl', 'nayatel', 'stormfiber'],
    categoryId: 'cat_utilities',
    subcategory: 'Internet',
    confidence: 'high',
  },
  {
    keywords: ['mobile balance', 'recharge', 'jazz', 'telenor', 'zong', 'ufone', 'postpaid bill', 'phone bill'],
    categoryId: 'cat_utilities',
    subcategory: 'Mobile',
    confidence: 'high',
  },

  // Housing
  {
    keywords: ['rent', 'house rent', 'flat rent', 'apartment rent', 'landlord'],
    categoryId: 'cat_housing',
    subcategory: 'Rent',
    confidence: 'high',
  },
  {
    keywords: ['plumber', 'electrician', 'home repair', 'paint', 'cleaning service', 'maid'],
    categoryId: 'cat_housing',
    subcategory: 'Maintenance',
    confidence: 'high',
  },
  {
    keywords: ['furniture', 'sofa', 'bed', 'chair', 'table', 'mattress'],
    categoryId: 'cat_housing',
    subcategory: 'Furniture',
    confidence: 'high',
  },

  // Entertainment
  {
    keywords: ['netflix', 'spotify', 'prime video', 'youtube premium', 'disney', 'streaming'],
    categoryId: 'cat_entertainment',
    subcategory: 'Streaming',
    confidence: 'high',
  },
  {
    keywords: ['cinema', 'movie', 'imax', 'film ticket', 'popcorn cinema'],
    categoryId: 'cat_entertainment',
    subcategory: 'Movies',
    confidence: 'high',
  },
  {
    keywords: ['steam', 'playstation', 'ps5', 'xbox', 'game', 'nintendo'],
    categoryId: 'cat_entertainment',
    subcategory: 'Games',
    confidence: 'high',
  },

  // Shopping
  {
    keywords: ['clothes', 'shirt', 'pants', 'shoes', 'dress', 'outfit', 'khaadi', 'sapphire', 'outfitters', 'zara'],
    categoryId: 'cat_shopping',
    subcategory: 'Clothing',
    confidence: 'high',
  },
  {
    keywords: ['phone', 'laptop', 'charger', 'headphones', 'gadget', 'electronics', 'apple', 'samsung'],
    categoryId: 'cat_shopping',
    subcategory: 'Electronics',
    confidence: 'high',
  },

  // Family
  {
    keywords: ['diaper', 'baby', 'toys', 'pocket money', 'kids', 'child'],
    categoryId: 'cat_family',
    subcategory: 'Children',
    confidence: 'high',
  },
  {
    keywords: ['parents', 'mother', 'father', 'family support', 'eidi', 'gift'],
    categoryId: 'cat_family',
    subcategory: 'Family Support',
    confidence: 'high',
  },

  // Income patterns
  {
    keywords: ['salary', 'paycheck', 'payroll', 'stipend', 'wages'],
    categoryId: 'cat_salary',
    subcategory: 'Monthly Salary',
    confidence: 'high',
  },
  {
    keywords: ['freelance', 'upwork', 'fiverr', 'client invoice', 'contract payment'],
    categoryId: 'cat_freelance',
    subcategory: 'Upwork/Fiverr',
    confidence: 'high',
  },
  {
    keywords: ['profit', 'sales revenue', 'shop sale'],
    categoryId: 'cat_business',
    subcategory: 'Sales Revenue',
    confidence: 'high',
  },
  {
    keywords: ['dividend', 'stock return', 'profit share', 'crypto gain'],
    categoryId: 'cat_investment_inc',
    subcategory: 'Stock Dividends',
    confidence: 'high',
  },
];

const LEARNED_RULES_STORAGE_KEY = 'smart_expense_tracker_learned_rules';
const LEARNED_RULES_OWNER_KEY = 'smart_expense_tracker_learned_rules_owner_uid_v1';

function getLearnedRulesStorageKey(): string {
  const uid = storageService.getActiveUserId();
  if (!uid) return LEARNED_RULES_STORAGE_KEY;

  const scopedKey = `${LEARNED_RULES_STORAGE_KEY}_${uid}`;
  try {
    const legacyRules = localStorage.getItem(LEARNED_RULES_STORAGE_KEY);
    const owner = localStorage.getItem(LEARNED_RULES_OWNER_KEY);
    if (legacyRules && (!owner || owner === uid)) {
      if (!owner) localStorage.setItem(LEARNED_RULES_OWNER_KEY, uid);
      if (!localStorage.getItem(scopedKey)) localStorage.setItem(scopedKey, legacyRules);
    }
  } catch {
    // If browser storage is unavailable, keep the existing graceful fallback.
  }
  return scopedKey;
}

// Load rules from the active account's local namespace.
export function getLearnedRules(): Record<string, { categoryId: string; subcategory?: string }> {
  try {
    const raw = localStorage.getItem(getLearnedRulesStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Learn from user manual selection/correction
export function learnCategorizationRule(inputText: string, categoryId: string, subcategory?: string): void {
  if (!inputText || inputText.trim().length < 2) return;
  try {
    const rules = getLearnedRules();
    const cleanWord = inputText.toLowerCase().trim();
    rules[cleanWord] = { categoryId, subcategory };
    localStorage.setItem(getLearnedRulesStorageKey(), JSON.stringify(rules));
  } catch (err) {
    console.warn('Could not save learned rule', err);
  }
}

/**
 * Categorize input based on description and/or merchant name
 */
export function suggestCategory(
  description: string,
  merchant?: string,
  categories: Category[] = []
): SuggestionResult | null {
  const query = `${description} ${merchant || ''}`.toLowerCase().trim();
  if (!query || query.length < 2) return null;

  // 1. Check user's learned rules first (highest priority)
  const learnedRules = getLearnedRules();
  for (const [key, rule] of Object.entries(learnedRules)) {
    if (query.includes(key.toLowerCase())) {
      const cat = categories.find((c) => c.id === rule.categoryId);
      if (cat) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          subcategory: rule.subcategory,
          confidence: 'high',
          matchedKeyword: key,
        };
      }
    }
  }

  // 2. Check predefined keyword rules
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      // Word boundary or containment check
      const regex = new RegExp(`\\b${kw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`, 'i');
      if (regex.test(query)) {
        const cat = categories.find((c) => c.id === rule.categoryId);
        if (cat) {
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            subcategory: rule.subcategory,
            confidence: rule.confidence,
            matchedKeyword: kw,
          };
        }
      }
    }
  }

  // 3. Check direct match against category names or subcategories
  for (const cat of categories) {
    if (query.includes(cat.name.toLowerCase())) {
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        confidence: 'medium',
        matchedKeyword: cat.name,
      };
    }
    for (const sub of cat.subcategories || []) {
      if (query.includes(sub.toLowerCase())) {
        return {
          categoryId: cat.id,
          categoryName: cat.name,
          subcategory: sub,
          confidence: 'high',
          matchedKeyword: sub,
        };
      }
    }
  }

  return null;
}
