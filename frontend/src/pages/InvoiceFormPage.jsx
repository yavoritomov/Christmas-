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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ArrowLeft, Plus, Trash, FilePdf, PaperPlaneTilt, CreditCard, Money, Check, FloppyDisk, PencilSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { cities } = useCity();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_method: 'cash', reference: '', notes: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer') || '',
    city_id: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '',
    due_date: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const custRes = await axios.get(`${API}/customers`, { headers: { Authorization: `Bearer ${token}` } });
        setCustomers(custRes.data);

        if (id) {
          const [invRes, paymentsRes] = await Promise.all([
            axios.get(`${API}/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/payments?invoice_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setInvoice(invRes.data);
          setPayments(paymentsRes.data);
          setFormData({
            customer_id: invRes.data.customer_id,
            city_id: invRes.data.city_id,
            items: invRes.data.items,
            notes: invRes.data.notes || '',
            due_date: invRes.data.due_date || ''
          });
          setPaymentForm(f => ({ ...f, amount: invRes.data.balance_due }));
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
      if (id && isEditing) {
        // Update existing invoice
        await axios.put(`${API}/invoices/${id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Invoice updated successfully');
        setIsEditing(false);
        // Refresh invoice data
        const [invRes, paymentsRes] = await Promise.all([
          axios.get(`${API}/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/payments?invoice_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setInvoice(invRes.data);
        setPayments(paymentsRes.data);
        setFormData({
          customer_id: invRes.data.customer_id,
          city_id: invRes.data.city_id,
          items: invRes.data.items,
          notes: invRes.data.notes || '',
          due_date: invRes.data.due_date || ''
        });
      } else {
        // Create new invoice
        const response = await axios.post(`${API}/invoices`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Invoice created successfully');
        navigate(`/invoices/${response.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/payments`, { invoice_id: id, ...paymentForm }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Payment recorded');
      setPaymentDialogOpen(false);
      // Refresh
      const [invRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/invoices/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/payments?invoice_id=${id}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setInvoice(invRes.data);
      setPayments(paymentsRes.data);
      setPaymentForm({ amount: invRes.data.balance_due, payment_method: 'cash', reference: '', notes: '' });
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleStripePayment = async () => {
    try {
      const origin = window.location.origin;
      const response = await axios.post(`${API}/payments/stripe/create-session?invoice_id=${id}&origin_url=${origin}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to initiate Stripe payment');
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const response = await axios.get(`${API}/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Failed to download PDF');
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    overdue: 'bg-red-100 text-red-700'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="invoice-form-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')} className="gap-2">
            <ArrowLeft size={18} /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900">
              {id ? `Invoice ${invoice?.invoice_number || ''}` : 'New Invoice'}
            </h1>
            {invoice && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                {invoice.status}
              </span>
            )}
          </div>
        </div>
        {invoice && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleDownloadPdf} className="gap-2">
              <FilePdf size={18} /> PDF
            </Button>
            {invoice.balance_due > 0 && (
              <>
                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2"><Money size={18} /> Record Payment</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddPayment} className="space-y-4">
                      <div>
                        <Label>Amount</Label>
                        <Input type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} required />
                      </div>
                      <div>
                        <Label>Method</Label>
                        <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(f => ({ ...f, payment_method: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="card">Card (Manual)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Reference</Label>
                        <Input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="Check # or reference" />
                      </div>
                      <Button type="submit" className="w-full rounded-full">Record Payment</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                <Button onClick={handleStripePayment} className="gap-2 bg-[#635bff] hover:bg-[#5048d9]">
                  <CreditCard size={18} /> Pay with Stripe
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {id ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-100">
            <CardHeader>
              <CardTitle className="font-heading">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoice?.items.map((item, i) => (
                  <div key={i} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-slate-500">{item.quantity} × ${item.unit_price.toFixed(2)}</p>
                    </div>
                    <p className="font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-100">
              <CardHeader>
                <CardTitle className="font-heading">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between"><span className="text-slate-600">Customer</span><span className="font-medium">{invoice?.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">City</span><span>{invoice?.city_name}</span></div>
                {invoice?.due_date && <div className="flex justify-between"><span className="text-slate-600">Due Date</span><span>{invoice?.due_date}</span></div>}
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between"><span>Subtotal</span><span>${invoice?.subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-bold mt-2"><span>Total</span><span>${invoice?.total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-emerald-600 mt-1"><span>Paid</span><span>${invoice?.amount_paid.toFixed(2)}</span></div>
                  <div className={`flex justify-between font-bold mt-1 ${invoice?.balance_due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    <span>Balance Due</span><span>${invoice?.balance_due.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {payments.length > 0 && (
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle className="font-heading">Payments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <div>
                          <p className="font-medium text-emerald-700">${p.amount.toFixed(2)}</p>
                          <p className="text-sm text-slate-500 capitalize">{p.payment_method} • {p.created_at?.slice(0,10)}</p>
                        </div>
                        <Check size={20} className="text-emerald-600" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
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
                    <Select value={formData.customer_id} onValueChange={v => setFormData(f => ({ ...f, customer_id: v }))}>
                      <SelectTrigger data-testid="invoice-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
                      <SelectContent>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Select value={formData.city_id} onValueChange={v => setFormData(f => ({ ...f, city_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>
                        {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Due Date</Label>
                    <Input type="date" value={formData.due_date} onChange={e => setFormData(f => ({ ...f, due_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-100">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-heading font-bold text-slate-900 pt-3 border-t"><span>Total</span><span>${total.toFixed(2)}</span></div>
                  <Button type="submit" className="w-full rounded-full mt-4" disabled={loading} data-testid="save-invoice-btn">
                    {loading ? 'Creating...' : 'Create Invoice'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
