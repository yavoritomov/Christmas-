import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Plus, MagnifyingGlass, DotsThree, Eye, FilePdf, PaperPlaneTilt, Trash, WhatsappLogo, Receipt, ArrowRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function QuotesPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState(null);

  const fetchQuotes = async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/quotes${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setQuotes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotes(); }, [token, selectedCity]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this quote?')) return;
    try {
      await axios.delete(`${API}/quotes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Quote deleted');
      fetchQuotes();
    } catch (error) {
      toast.error('Failed to delete quote');
    }
  };

  const handleConvertToInvoice = async (id, quoteNumber) => {
    if (!window.confirm(`Convert ${quoteNumber} to an invoice? The quote will be archived.`)) return;
    setConverting(id);
    try {
      const response = await axios.post(`${API}/quotes/${id}/convert-to-invoice`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      toast.success(`Quote converted to Invoice ${response.data.invoice_number}`);
      // Navigate to the new invoice
      navigate(`/invoices/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to convert quote');
      setConverting(null);
    }
  };

  const handleDownloadPdf = async (id, number) => {
    try {
      const response = await axios.get(`${API}/quotes/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote_${number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async (id) => {
    try {
      await axios.post(`${API}/email/send-quote/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Quote sent via email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleSendWhatsApp = async (id) => {
    try {
      await axios.post(`${API}/messaging/whatsapp/${id}?message_type=quote`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.info('WhatsApp integration requires setup');
    } catch (error) {
      toast.error('Failed to send via WhatsApp');
    }
  };

  const filteredQuotes = quotes.filter(q => 
    q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="quotes-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-500">{filteredQuotes.length} quotes found</p>
        </div>
        <Button onClick={() => navigate('/quotes/new')} className="rounded-full gap-2" data-testid="new-quote-btn">
          <Plus size={18} /> New Quote
        </Button>
      </div>

      <Card className="border-slate-100">
        <CardHeader className="pb-4">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="search-quotes" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No quotes found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotes.map(quote => (
                  <TableRow key={quote.id} className="table-row-hover">
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.customer_name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{quote.created_at?.slice(0,10)}</TableCell>
                    <TableCell className="text-right font-semibold">${quote.total?.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[quote.status] || statusColors.draft}`}>
                        {quote.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => handleConvertToInvoice(quote.id, quote.quote_number)}
                          disabled={converting === quote.id}
                          data-testid={`convert-quote-${quote.id}`}
                        >
                          {converting === quote.id ? (
                            'Converting...'
                          ) : (
                            <>
                              <Receipt size={14} />
                              <ArrowRight size={12} />
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><DotsThree size={20} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/quotes/${quote.id}/edit`)}>
                              <Eye size={16} className="mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleConvertToInvoice(quote.id, quote.quote_number)}>
                              <Receipt size={16} className="mr-2" /> Convert to Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPdf(quote.id, quote.quote_number)}>
                              <FilePdf size={16} className="mr-2" /> Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendEmail(quote.id)}>
                              <PaperPlaneTilt size={16} className="mr-2" /> Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSendWhatsApp(quote.id)}>
                              <WhatsappLogo size={16} className="mr-2" /> WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(quote.id)} className="text-destructive">
                              <Trash size={16} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
