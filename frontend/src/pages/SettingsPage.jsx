import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, MapPin, Trash, Gear, Building } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { token, user } = useAuth();
  const { cities, refreshCities } = useCity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cityForm, setCityForm] = useState({ name: '', state: '', country: 'USA' });

  const handleAddCity = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/cities`, cityForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('City added');
      setDialogOpen(false);
      setCityForm({ name: '', state: '', country: 'USA' });
      refreshCities();
    } catch (error) {
      toast.error('Failed to add city');
    }
  };

  const handleDeleteCity = async (id) => {
    if (!window.confirm('Delete this city? This may affect related records.')) return;
    try {
      await axios.delete(`${API}/cities/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('City deleted');
      refreshCities();
    } catch (error) {
      toast.error('Failed to delete city');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
          <Gear size={32} className="text-primary" />
          Settings
        </h1>
        <p className="text-slate-500">Manage your CRM configuration</p>
      </div>

      {/* Profile Card */}
      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="font-heading">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-heading font-semibold text-slate-900">{user?.name}</h3>
              <p className="text-slate-500">{user?.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{user?.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cities Management */}
      <Card className="border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading flex items-center gap-2">
            <Building size={20} />
            Cities
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full gap-2" data-testid="add-city-btn">
                <Plus size={16} /> Add City
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Add City</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCity} className="space-y-4">
                <div>
                  <Label>City Name *</Label>
                  <Input 
                    value={cityForm.name} 
                    onChange={e => setCityForm({...cityForm, name: e.target.value})} 
                    placeholder="e.g., Denver"
                    required 
                    data-testid="city-name"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input 
                    value={cityForm.state} 
                    onChange={e => setCityForm({...cityForm, state: e.target.value})} 
                    placeholder="e.g., Colorado"
                    data-testid="city-state"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input 
                    value={cityForm.country} 
                    onChange={e => setCityForm({...cityForm, country: e.target.value})} 
                    data-testid="city-country"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" data-testid="save-city-btn">
                  Add City
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {cities.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No cities configured. Add your first city to get started.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cities.map(city => (
                <div 
                  key={city.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg group hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MapPin size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{city.name}</p>
                      <p className="text-sm text-slate-500">{city.state}, {city.country}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteCity(city.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash size={16} className="text-slate-400 hover:text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Integration Notes */}
      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="font-heading">Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-1">Stripe Payments</h4>
            <p className="text-sm text-slate-500">Stripe integration is active. Customers can pay invoices online via credit card or Apple Pay.</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Active</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-1">Email Notifications</h4>
            <p className="text-sm text-slate-500">Email sending is configured. Requires SendGrid API key for production use.</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">MOCKED</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-900 mb-1">WhatsApp & Viber</h4>
            <p className="text-sm text-slate-500">Messaging integrations require business API setup.</p>
            <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">MOCKED</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
