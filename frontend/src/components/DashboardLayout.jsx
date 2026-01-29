import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, useCity } from '../App';
import {
  House,
  Users,
  FileText,
  Receipt,
  UsersThree,
  CalendarBlank,
  Gear,
  SignOut,
  List,
  X,
  CaretDown,
  Snowflake,
  Warning,
  NavigationArrow
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Button } from '../components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: House },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Unpaid', href: '/invoices/unpaid', icon: Warning },
  { name: 'Crews', href: '/crews', icon: UsersThree },
  { name: 'Schedule', href: '/schedule', icon: CalendarBlank },
  { name: 'Tracking', href: '/tracking', icon: NavigationArrow },
  { name: 'Settings', href: '/settings', icon: Gear },
];

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { cities, selectedCity, setSelectedCity } = useCity();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Snowflake size={24} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-primary text-lg leading-tight">Festive Lights</h1>
              <p className="text-xs text-slate-500">CRM System</p>
            </div>
            <button 
              className="lg:hidden ml-auto p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* City Selector */}
          <div className="px-4 py-3 border-b border-slate-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="city-selector">
                  <span className="truncate">{selectedCity?.name || 'All Cities'}</span>
                  <CaretDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={() => setSelectedCity(null)}>
                  All Cities
                </DropdownMenuItem>
                {cities.map(city => (
                  <DropdownMenuItem 
                    key={city.id} 
                    onClick={() => setSelectedCity(city)}
                  >
                    {city.name}, {city.state}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-primary text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                `}
                onClick={() => setSidebarOpen(false)}
                data-testid={`nav-${item.name.toLowerCase()}`}
              >
                <item.icon size={20} weight={item.href === '/' ? 'fill' : 'regular'} />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <span className="text-secondary font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-slate-600"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <SignOut size={18} />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-4 lg:px-8 flex items-center gap-4">
          <button 
            className="lg:hidden p-2 -ml-2"
            onClick={() => setSidebarOpen(true)}
            data-testid="mobile-menu-btn"
          >
            <List size={24} className="text-slate-700" />
          </button>
          
          <div className="flex-1">
            {selectedCity && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent rounded-full text-sm">
                <span className="text-primary font-medium">{selectedCity.name}</span>
                <button 
                  onClick={() => setSelectedCity(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
