import React from 'react';
import {
  Utensils,
  Car,
  HeartPulse,
  GraduationCap,
  Zap,
  Home,
  Film,
  ShoppingBag,
  Users,
  Landmark,
  Briefcase,
  TrendingUp,
  Laptop,
  Coins,
  Building,
  Wallet,
  HelpCircle,
  Coffee,
  Plane,
  Fuel,
  Wrench,
  Book,
  Smartphone,
  Tv,
  Gamepad2,
  Shirt,
  Baby,
  CreditCard,
  PiggyBank,
  Receipt,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Car,
  HeartPulse,
  GraduationCap,
  Zap,
  Home,
  Film,
  ShoppingBag,
  Users,
  Landmark,
  Briefcase,
  TrendingUp,
  Laptop,
  Coins,
  Building,
  Wallet,
  HelpCircle,
  Coffee,
  Plane,
  Fuel,
  Wrench,
  Book,
  Smartphone,
  Tv,
  Gamepad2,
  Shirt,
  Baby,
  CreditCard,
  PiggyBank,
  Receipt,
};

interface CategoryIconProps {
  iconName: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ iconName, className = 'w-5 h-5', color }) => {
  const IconComponent = ICON_MAP[iconName] || HelpCircle;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
};
