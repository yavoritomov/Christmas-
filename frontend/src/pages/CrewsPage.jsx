import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Phone, Envelope, MapPin, Trash, UsersThree } from '@phosphor-icons/react';
import { toast } from 'sonner';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

export default function CrewsPage() {
  const { token } = useAuth();
  const { cities, selectedCity } = useCity();
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', city_id: '', skills: '', color: COLORS[0]
  });

  const fetchCrews = async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/crews${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setCrews(response.data);
    } catch (error) {
      toast.error('Failed to fetch crews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCrews(); }, [token, selectedCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const skillsArray = formData.skills ? formData.skills.split(',').map(s => s.trim()) : [];
      await axios.post(`${API}/crews`, { ...formData, skills: skillsArray }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Crew member added');
      setDialogOpen(false);
      setFormData({ name: '', email: '', password: '', phone: '', city_id: '', skills: '', color: COLORS[Math.floor(Math.random() * COLORS.length)] });
      fetchCrews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add crew member');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this crew member?')) return;
    try {
      await axios.delete(`${API}/crews/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Crew member deleted');
      fetchCrews();
    } catch (error) {
      toast.error('Failed to delete crew member');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crews-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
            <UsersThree size={32} className="text-primary" />
            Crew Management
          </h1>
          <p className="text-slate-500">{crews.length} crew members</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2" data-testid="add-crew-btn">
              <Plus size={18} /> Add Crew Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading">Add Crew Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required data-testid="crew-name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required data-testid="crew-email" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required data-testid="crew-password" />
                </div>
              </div>
              <div>
                <Label>Phone *</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required data-testid="crew-phone" />
              </div>
              <div>
                <Label>City *</Label>
                <Select value={formData.city_id} onValueChange={v => setFormData({...formData, city_id: v})} required>
                  <SelectTrigger data-testid="crew-city"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}, {c.state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Skills (comma separated)</Label>
                <Input value={formData.skills} onChange={e => setFormData({...formData, skills: e.target.value})} placeholder="Roofing, Lighting, Electrical" />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-transform ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({...formData, color})}
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" data-testid="save-crew-btn">Add Crew Member</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500">Loading...</div>
        ) : crews.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500">No crew members found</div>
        ) : (
          crews.map(crew => (
            <Card key={crew.id} className="border-slate-100 card-hover">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                    style={{ backgroundColor: crew.color }}
                  >
                    {crew.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-lg text-slate-900">{crew.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${crew.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {crew.status}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(crew.id)}>
                        <Trash size={16} className="text-slate-400 hover:text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {crew.phone}</p>
                      <p className="flex items-center gap-2"><Envelope size={14} className="text-slate-400" /> {crew.email}</p>
                      <p className="flex items-center gap-2"><MapPin size={14} className="text-slate-400" /> {crew.city_name}</p>
                    </div>
                    {crew.skills && crew.skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {crew.skills.map((skill, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{skill}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
