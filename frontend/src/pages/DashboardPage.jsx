import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Users,
  FileText,
  Receipt,
  UsersThree,
  CalendarBlank,
  TrendUp,
  CurrencyDollar,
  Warning,
  ArrowRight
} from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, icon: Icon, color, href, subtitle }) => (
  <Link to={href || '#'} className="block">
    <Card className="card-hover border-slate-100 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full ${color} opacity-10 group-hover:opacity-20 transition-opacity`} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-heading font-bold text-slate-900">{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
            <Icon size={24} className={color.replace('bg-', 'text-')} weight="duotone" />
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default function DashboardPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentInstallations, setRecentInstallations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cityParam = selectedCity ? `?city_id=${selectedCity.id}` : '';
        
        const [statsRes, installationsRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats${cityParam}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API}/installations${cityParam}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setStats(statsRes.data);
        setRecentInstallations(installationsRes.data.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, selectedCity]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Customers', value: stats?.total_customers || 0 },
    { name: 'Quotes', value: stats?.total_quotes || 0 },
    { name: 'Invoices', value: stats?.total_invoices || 0 },
    { name: 'Scheduled', value: stats?.total_scheduled || 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          {selectedCity ? `Showing data for ${selectedCity.name}` : 'Overview of all cities'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats?.total_customers || 0}
          icon={Users}
          color="bg-primary"
          href="/customers"
        />
        <StatCard
          title="Active Quotes"
          value={stats?.pending_quotes || 0}
          icon={FileText}
          color="bg-secondary"
          href="/quotes"
          subtitle={`${stats?.total_quotes || 0} total`}
        />
        <StatCard
          title="Unpaid Invoices"
          value={stats?.unpaid_invoices || 0}
          icon={Warning}
          color="bg-amber-500"
          href="/invoices/unpaid"
        />
        <StatCard
          title="Scheduled Today"
          value={stats?.scheduled_today || 0}
          icon={CalendarBlank}
          color="bg-emerald-500"
          href="/schedule"
          subtitle={`${stats?.total_scheduled || 0} total scheduled`}
        />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <TrendUp size={20} className="text-emerald-500" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-emerald-600">
              ${(stats?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500 mt-1">From paid invoices</p>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <CurrencyDollar size={20} className="text-amber-500" />
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-heading font-bold text-amber-600">
              ${(stats?.outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-500 mt-1">Pending payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="value" fill="hsl(195, 60%, 24%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Installations */}
        <Card className="border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-heading">Upcoming Installations</CardTitle>
            <Link to="/schedule">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentInstallations.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No scheduled installations</p>
            ) : (
              <div className="space-y-3">
                {recentInstallations.map((installation) => (
                  <div 
                    key={installation.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <CalendarBlank size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{installation.customer_name}</p>
                      <p className="text-sm text-slate-500">{installation.scheduled_date} {installation.scheduled_time && `at ${installation.scheduled_time}`}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      installation.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      installation.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                      installation.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {installation.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
