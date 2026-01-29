import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, MagnifyingGlass, Phone, Envelope, MapPin } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function CustomersPage() {
  const { token } = useAuth();
  const { cities, selectedCity } = useCity();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', city_id: '', notes: '', viber_number: '', whatsapp_number: ''
  });

  const fetchCustomers = async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/customers${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers(); }, [token, selectedCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Customer created successfully');
      setDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', address: '', city_id: '', notes: '', viber_number: '', whatsapp_number: '' });
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in" data-testid="customers-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500">{filteredCustomers.length} customers found</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2" data-testid="add-customer-btn">
              <Plus size={18} /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Add New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Name *</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required data-testid="customer-name" />
                </div>
                <div>
                  <Label>Phone *</Label>
                  <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required data-testid="customer-phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} data-testid="customer-email" />
                </div>
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required data-testid="customer-address" />
                </div>
                <div className="col-span-2">
                  <Label>City *</Label>
                  <Select value={formData.city_id} onValueChange={v => setFormData({...formData, city_id: v})} required>
                    <SelectTrigger data-testid="customer-city"><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}, {c.state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <Input value={formData.whatsapp_number} onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} placeholder="+1234567890" />
                </div>
                <div>
                  <Label>Viber</Label>
                  <Input value={formData.viber_number} onChange={e => setFormData({...formData, viber_number: e.target.value})} placeholder="+1234567890" />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" data-testid="save-customer-btn">Save Customer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-slate-100">
        <CardHeader className="pb-4">
          <div className="relative">
            <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="search-customers" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No customers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead className="hidden lg:table-cell">City</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map(customer => (
                  <TableRow key={customer.id} className="table-row-hover">
                    <TableCell>
                      <Link to={`/customers/${customer.id}`} className="hover:text-primary">
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-slate-500 flex items-center gap-1 md:hidden">
                          <Phone size={12} /> {customer.phone}
                        </p>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="flex items-center gap-1 text-sm"><Phone size={14} className="text-slate-400" /> {customer.phone}</p>
                        {customer.email && <p className="flex items-center gap-1 text-sm text-slate-500"><Envelope size={14} /> {customer.email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                        <MapPin size={14} /> {customer.city_name || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {customer.total_orders || 0}
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
