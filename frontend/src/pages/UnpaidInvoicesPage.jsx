import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { PaperPlaneTilt, Warning, CurrencyDollar } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function UnpaidInvoicesPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const fetchInvoices = async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/invoices/unpaid${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch unpaid invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [token, selectedCity]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === invoices.length) {
      setSelected([]);
    } else {
      setSelected(invoices.map(i => i.id));
    }
  };

  const handleSendReminders = async () => {
    if (selected.length === 0) {
      toast.error('Select at least one invoice');
      return;
    }
    setSending(true);
    try {
      await axios.post(`${API}/email/send-bulk-reminders`, selected, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Payment reminders sent to ${selected.length} customers`);
      setSelected([]);
    } catch (error) {
      toast.error('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
    overdue: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="unpaid-invoices-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
            <Warning size={32} className="text-amber-500" />
            Unpaid Invoices
          </h1>
          <p className="text-slate-500">{invoices.length} invoices with outstanding balance</p>
        </div>
        <Button 
          onClick={handleSendReminders} 
          disabled={selected.length === 0 || sending}
          className="rounded-full gap-2"
          data-testid="send-reminders-btn"
        >
          <PaperPlaneTilt size={18} />
          {sending ? 'Sending...' : `Send Reminders (${selected.length})`}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <CurrencyDollar size={24} className="text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700">Total Outstanding</p>
                <p className="text-2xl font-heading font-bold text-amber-900">
                  ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-lg font-medium">No unpaid invoices</p>
              <p className="text-sm">All invoices have been paid!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selected.length === invoices.length && invoices.length > 0}
                      onCheckedChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => (
                  <TableRow 
                    key={invoice.id} 
                    className="table-row-hover cursor-pointer"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox 
                        checked={selected.includes(invoice.id)}
                        onCheckedChange={() => toggleSelect(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-slate-500">{invoice.customer_email || '-'}</TableCell>
                    <TableCell className="text-right">${invoice.total?.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      ${invoice.balance_due?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
