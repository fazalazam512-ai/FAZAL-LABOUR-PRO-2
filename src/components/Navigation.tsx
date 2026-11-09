import React, { useState } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CreditCard,
  FileBarChart2,
  Home,
  Landmark,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Plus,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sun,
  WalletCards,
  X,
} from 'lucide-react';
import { ViewTab, UserProfile, CurrencyCode } from '../types';
import { SUPPORTED_CURRENCIES } from '../constants/currencies';

interface NavigationProps {
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  onOpenAddModal: () => void;
  profile?: UserProfile;
  onToggleTheme: () => void;
  isDark: boolean;
  onSelectCurrency: (currency: CurrencyCode) => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

type NavigationItem = {
  tab: ViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      { tab: 'dashboard', label: 'Overview', icon: Home },
      { tab: 'transactions', label: 'Transactions', icon: ReceiptText },
      { tab: 'budget', label: 'Budget', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'Plan & track',
    items: [
      { tab: 'savings', label: 'Savings goals', icon: PiggyBank },
      { tab: 'credit_debit', label: 'Credit & debit', icon: ArrowLeftRight },
      { tab: 'loans', label: 'Loans', icon: Landmark },
    ],
  },
  {
    label: 'Review',
    items: [
      { tab: 'calendar', label: 'Calendar', icon: CalendarDays },
      { tab: 'reports', label: 'Reports', icon: FileBarChart2 },
      { tab: 'settings', label: 'Settings & categories', icon: Settings2 },
      { tab: 'admin', label: 'Admin Console', icon: ShieldCheck },
    ],
  },
];

const mobileMoreItems: NavigationItem[] = [
  { tab: 'savings', label: 'Savings goals', icon: PiggyBank },
  { tab: 'credit_debit', label: 'Credit & debit', icon: CreditCard },
  { tab: 'loans', label: 'Loans', icon: Landmark },
  { tab: 'calendar', label: 'Calendar', icon: CalendarDays },
  { tab: 'reports', label: 'Reports', icon: FileBarChart2 },
  { tab: 'settings', label: 'Settings & categories', icon: Settings2 },
  { tab: 'admin', label: 'Admin Console', icon: ShieldCheck },
];

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  profile,
  onToggleTheme,
  isDark,
  onSelectCurrency,
  userEmail,
  onLogout,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const displayName = profile?.name || (userEmail ? userEmail.split('@')[0] : 'Your account');
  const initials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  const mobileMoreActive = mobileMoreItems.some((item) => item.tab === activeTab);
  const showHeaderAdd = activeTab !== 'dashboard' && activeTab !== 'transactions';

  const chooseTab = (tab: ViewTab) => {
    setActiveTab(tab);
    setShowMoreMenu(false);
  };

  return (
    <>
      <header id="app-header" className="app-topbar">
        <button className="app-brand" onClick={() => chooseTab('dashboard')} aria-label="Smart Expense overview">
          <span className="app-brand-mark" aria-hidden="true"><WalletCards /></span>
          <span className="app-brand-copy">
            <strong>Smart Expense</strong>
            <small>PERSONAL LEDGER</small>
          </span>
        </button>

        <div className="app-topbar-right">
          <span className="topbar-greeting">{displayName}</span>
          <label className="sr-only" htmlFor="header-currency-selector">Display currency</label>
          <select
            id="header-currency-selector"
            value={profile?.defaultCurrency || profile?.currency || 'PKR'}
            onChange={(event) => onSelectCurrency(event.target.value as CurrencyCode)}
            className="currency-select"
            title="Change display currency"
          >
            {Object.values(SUPPORTED_CURRENCIES).map((currency) => (
              <option key={currency.code} value={currency.code}>{currency.code} · {currency.symbol}</option>
            ))}
          </select>
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="icon-control"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun /> : <Moon />}
          </button>
          {showHeaderAdd && (
            <button
              id="header-add-transaction-btn"
              onClick={onOpenAddModal}
              className="button-3d desktop-header-add"
            >
              <Plus aria-hidden="true" />
              <span>New transaction</span>
            </button>
          )}
        </div>
      </header>

      <aside className="app-side-nav" aria-label="Main navigation">
        <div className="side-nav-groups">
          {navigationGroups.map((group) => (
            <section className="side-nav-group" key={group.label}>
              <p className="side-nav-label">{group.label}</p>
              <nav aria-label={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const selected = activeTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      id={`nav-desktop-${item.tab}`}
                      type="button"
                      onClick={() => chooseTab(item.tab)}
                      className={`side-nav-link${selected ? ' is-active' : ''}`}
                      aria-current={selected ? 'page' : undefined}
                    >
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                      {selected && <ChevronRight className="side-nav-chevron" aria-hidden="true" />}
                    </button>
                  );
                })}
              </nav>
            </section>
          ))}
        </div>

        <div className="side-nav-footer">
          <div className="account-summary">
            <span className="account-avatar" aria-hidden="true">{initials || 'SE'}</span>
            <span className="account-copy">
              <strong>{displayName}</strong>
              {userEmail && <small>{userEmail}</small>}
            </span>
            {onLogout && (
              <button className="account-logout" onClick={onLogout} title="Sign out" aria-label="Sign out">
                <LogOut aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="side-nav-credit">By A.K.A Tech · <a href="https://wa.me/923149891182" target="_blank" rel="noopener noreferrer">Contact</a></p>
        </div>
      </aside>

      <nav className="mobile-bottom-nav" aria-label="Primary navigation">
        <button
          id="tab-mobile-home"
          type="button"
          onClick={() => chooseTab('dashboard')}
          className={`mobile-nav-item${activeTab === 'dashboard' ? ' is-active' : ''}`}
          aria-current={activeTab === 'dashboard' ? 'page' : undefined}
        >
          <Home aria-hidden="true" /><span>Home</span>
        </button>
        <button
          id="tab-mobile-transactions"
          type="button"
          onClick={() => chooseTab('transactions')}
          className={`mobile-nav-item${activeTab === 'transactions' ? ' is-active' : ''}`}
          aria-current={activeTab === 'transactions' ? 'page' : undefined}
        >
          <ReceiptText aria-hidden="true" /><span>Activity</span>
        </button>
        <button
          id="tab-mobile-add-btn"
          type="button"
          onClick={onOpenAddModal}
          className="mobile-add-button button-3d"
          aria-label="Add transaction"
        >
          <Plus aria-hidden="true" />
        </button>
        <button
          id="tab-mobile-budget"
          type="button"
          onClick={() => chooseTab('budget')}
          className={`mobile-nav-item${activeTab === 'budget' ? ' is-active' : ''}`}
          aria-current={activeTab === 'budget' ? 'page' : undefined}
        >
          <ChartNoAxesCombined aria-hidden="true" /><span>Budget</span>
        </button>
        <button
          id="tab-mobile-more"
          type="button"
          onClick={() => setShowMoreMenu(true)}
          className={`mobile-nav-item${mobileMoreActive ? ' is-active' : ''}`}
          aria-expanded={showMoreMenu}
          aria-haspopup="dialog"
        >
          <Menu aria-hidden="true" /><span>More</span>
        </button>
      </nav>

      {showMoreMenu && (
        <div className="mobile-more-backdrop" onClick={() => setShowMoreMenu(false)}>
          <section
            id="mobile-more-panel"
            className="mobile-more-panel"
            role="dialog"
            aria-modal="true"
            aria-label="More finance tools"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mobile-more-heading">
              <div>
                <span className="section-kicker">YOUR WORKSPACE</span>
                <h2>More tools</h2>
              </div>
              <button id="close-more-panel-btn" className="icon-control" onClick={() => setShowMoreMenu(false)} aria-label="Close menu">
                <X aria-hidden="true" />
              </button>
            </div>
            <div className="mobile-more-grid">
              {mobileMoreItems.map((item) => {
                const Icon = item.icon;
                const selected = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    id={`more-menu-${item.tab}`}
                    type="button"
                    onClick={() => chooseTab(item.tab)}
                    className={`mobile-more-link${selected ? ' is-active' : ''}`}
                    aria-current={selected ? 'page' : undefined}
                  >
                    <span className="mobile-more-icon"><Icon aria-hidden="true" /></span>
                    <span>{item.label}</span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className="mobile-more-account">
              <span className="account-avatar" aria-hidden="true">{initials || 'SE'}</span>
              <div className="account-copy"><strong>{displayName}</strong>{userEmail && <small>{userEmail}</small>}</div>
              {onLogout && (
                <button
                  type="button"
                  className="mobile-signout"
                  onClick={() => { setShowMoreMenu(false); onLogout(); }}
                >
                  <LogOut aria-hidden="true" /><span>Sign out</span>
                </button>
              )}
            </div>
            <p className="side-nav-credit">By A.K.A Tech · <a href="https://wa.me/923149891182" target="_blank" rel="noopener noreferrer">Contact</a></p>
          </section>
        </div>
      )}
    </>
  );
};
