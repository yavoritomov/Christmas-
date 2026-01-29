import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Plus, Trash, FilePdf, PaperPlaneTilt, Receipt, ArrowRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function QuoteFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { cities } = useCity();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer') || '',
    city_id: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '',
    valid_until: ''
  });
  const [quote, setQuote] = useState(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custRes = await axios.get(`${API}/customers`, { headers: { Authorization: `Bearer ${token}` } });
        setCustomers(custRes.data);

        if (id) {
          const quoteRes = await axios.get(`${API}/quotes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
          setQuote(quoteRes.data);
          setFormData({
            customer_id: quoteRes.data.customer_id,
            city_id: quoteRes.data.city_id,
            items: quoteRes.data.items,
            notes: quoteRes.data.notes || '',
            valid_until: quoteRes.data.valid_until || ''
          });
        }
      } catch (error) {
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, [id, token]);

  useEffect(() => {
    if (formData.customer_id && !formData.city_id) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) setFormData(f => ({ ...f, city_id: customer.city_id }));
    }
  }, [formData.customer_id, customers]);

  const addItem = () => setFormData(f => ({ ...f, items: [...f.items, { description: '', quantity: 1, unit_price: 0 }] }));
  
  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    setFormData(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const updateItem = (index, field, value) => {
    setFormData(f => ({
      ...f,
      items: f.items.map((item, i) => i === index ? { ...item, [field]: field === 'quantity' || field === 'unit_price' ? parseFloat(value) || 0 : value } : item)
    }));
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = subtotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.city_id) {
      toast.error('Please select customer and city');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/quotes`, formData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Quote created successfully');
      navigate(`/quotes/${response.data.id}/edit`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!quote) return;
    try {
      const response = await axios.get(`${API}/quotes/${quote.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quote_${quote.quote_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded');
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = async () => {
    if (!quote) return;
    try {
      await axios.post(`${API}/email/send-quote/${quote.id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Quote sent via email');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    if (!window.confirm(`Convert ${quote.quote_number} to an invoice? The quote will be archived.`)) return;
    setConverting(true);
    try {
      const response = await axios.post(`${API}/quotes/${quote.id}/convert-to-invoice`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      toast.success(`Quote converted to Invoice ${response.data.invoice_number}`);
      navigate(`/invoices/${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to convert quote');
      setConverting(false);
    }
  };

  const isConverted = quote?.status === 'converted';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="quote-form-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/quotes')} className="gap-2">
            <ArrowLeft size={18} /> Back
          </Button>
          <h1 className="text-2xl font-heading font-bold text-slate-900">
            {id ? `Quote ${quote?.quote_number || ''}` : 'New Quote'}
          </h1>
        </div>
        {quote && (
          <div className="flex gap-2">
            {!isConverted && (
              <Button 
                onClick={handleConvertToInvoice} 
                disabled={converting}
                className="gap-2"
                data-testid="convert-to-invoice-btn"
              >
                {converting ? 'Converting...' : (
                  <>
                    <Receipt size={18} /> Convert to Invoice <ArrowRight size={14} />
                  </>
                )}
              </Button>
            )}
            {isConverted && (
              <span className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
                Converted to Invoice
              </span>
            )}
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
              <FilePdf size={18} /> PDF
            </Button>
            <Button variant="outline" onClick={handleSendEmail} className="gap-2">
              <PaperPlaneTilt size={18} /> Email
            </Button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-100">
            <CardHeader>
              <CardTitle className="font-heading">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-slate-50 rounded-lg">
                  <div className="col-span-12 md:col-span-5">
                    <Label>Description</Label>
                    <Input value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Service or product" required />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label>Qty</Label>
                    <Input type="number" min="1" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Label>Unit Price</Label>
                    <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(index, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-2 md:col-span-2 flex items-center justify-between">
                    <span className="font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</span>
                    {formData.items.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash size={16} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addItem} className="gap-2 w-full">
                <Plus size={18} /> Add Item
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-100">
              <CardHeader>
                <CardTitle className="font-heading">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Customer *</Label>
                  <Select value={formData.customer_id} onValueChange={v => setFormData(f => ({ ...f, customer_id: v }))} disabled={!!id}>
                    <SelectTrigger data-testid="quote-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City *</Label>
                  <Select value={formData.city_id} onValueChange={v => setFormData(f => ({ ...f, city_id: v }))} disabled={!!id}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valid Until</Label>
                  <Input type="date" value={formData.valid_until} onChange={e => setFormData(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100">
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-heading font-bold text-slate-900 pt-3 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {!id && (
                  <Button type="submit" className="w-full rounded-full mt-4" disabled={loading} data-testid="save-quote-btn">
                    {loading ? 'Creating...' : 'Create Quote'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
