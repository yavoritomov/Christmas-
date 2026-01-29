import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Phone, Envelope, MapPin, Pencil, Trash, WhatsappLogo } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerRes, quotesRes, invoicesRes] = await Promise.all([
          axios.get(`${API}/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/quotes/customer/${id}?include_converted=true`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/invoices`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setCustomer(customerRes.data);
        setQuotes(quotesRes.data);
        setInvoices(invoicesRes.data.filter(i => i.customer_id === id));
      } catch (error) {
        toast.error('Failed to load customer');
        navigate('/customers');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await axios.delete(`${API}/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Customer deleted');
      navigate('/customers');
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!customer) return <div className="p-8 text-center">Customer not found</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customer-detail-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/customers')} className="gap-2">
          <ArrowLeft size={18} /> Back
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading">Customer Details</CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleDelete}><Trash size={16} className="text-destructive" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-2xl font-heading font-bold text-slate-900">{customer.name}</h2>
              <span className="badge-neutral">{customer.city_name}</span>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <p className="flex items-center gap-3 text-slate-600">
                <Phone size={18} className="text-slate-400" /> {customer.phone}
              </p>
              {customer.email && (
                <p className="flex items-center gap-3 text-slate-600">
                  <Envelope size={18} className="text-slate-400" /> {customer.email}
                </p>
              )}
              <p className="flex items-center gap-3 text-slate-600">
                <MapPin size={18} className="text-slate-400" /> {customer.address}
              </p>
              {customer.whatsapp_number && (
                <p className="flex items-center gap-3 text-slate-600">
                  <WhatsappLogo size={18} className="text-green-500" /> {customer.whatsapp_number}
                </p>
              )}
            </div>
            {customer.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-slate-500">Notes</p>
                <p className="text-slate-700">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading">Quotes ({quotes.length})</CardTitle>
              <Button size="sm" onClick={() => navigate(`/quotes/new?customer=${id}`)} className="rounded-full">New Quote</Button>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No quotes yet</p>
              ) : (
                <div className="space-y-2">
                  {quotes.map(q => (
                    <div key={q.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100" onClick={() => navigate(`/quotes/${q.id}/edit`)}>
                      <div>
                        <p className="font-medium">{q.quote_number}</p>
                        <p className="text-sm text-slate-500">{q.created_at?.slice(0,10)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${q.total?.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.status === 'converted' ? 'bg-purple-100 text-purple-700' :
                          q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 
                          q.status === 'sent' ? 'bg-blue-100 text-blue-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>{q.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading">Invoices ({invoices.length})</CardTitle>
              <Button size="sm" onClick={() => navigate(`/invoices/new?customer=${id}`)} className="rounded-full">New Invoice</Button>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <div>
                        <p className="font-medium">{inv.invoice_number}</p>
                        <p className="text-sm text-slate-500">{inv.created_at?.slice(0,10)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${inv.total?.toFixed(2)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
