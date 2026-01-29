import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Plus, MagnifyingGlass, DotsThree, Eye, FilePdf, PaperPlaneTilt, Trash, CreditCard } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchInvoices = async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/invoices${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [token, selectedCity]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try {
      await axios.delete(`${API}/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (error) {
      toast.error('Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async (id, number) => {
    try {
      const response = await axios.get(`${API}/invoices/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="invoices-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500">{filteredInvoices.length} invoices found</p>
        </div>
        <Button onClick={() => navigate('/invoices/new')} className="rounded-full gap-2" data-testid="new-invoice-btn">
          <Plus size={18} /> New Invoice
        </Button>
      </div>

      <Card className="border-slate-100">
        <CardHeader className="pb-4">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="search-invoices" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No invoices found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map(invoice => (
                  <TableRow key={invoice.id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/invoices/${invoice.id}`)}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{invoice.created_at?.slice(0,10)}</TableCell>
                    <TableCell className="text-right font-semibold">${invoice.total?.toFixed(2)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
                      <span className={invoice.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        ${invoice.balance_due?.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status] || statusColors.pending}`}>
                        {invoice.status}
                      </span>
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm"><DotsThree size={20} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/invoices/${invoice.id}`)}>
                            <Eye size={16} className="mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id, invoice.invoice_number)}>
                            <FilePdf size={16} className="mr-2" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(invoice.id)} className="text-destructive">
                            <Trash size={16} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
