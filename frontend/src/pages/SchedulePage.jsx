import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CaretLeft, CaretRight, Plus, CalendarBlank, Clock, MapPin, User, Phone } from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function SchedulePage() {
  const { token } = useAuth();
  const { cities, selectedCity } = useCity();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [installations, setInstallations] = useState([]);
  const [crews, setCrews] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '', city_id: '', crew_ids: [], scheduled_date: '', scheduled_time: '',
    estimated_hours: 2, address: '', notes: '', installation_type: 'installation'
  });

  const fetchData = async () => {
    try {
      const cityParam = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const [instRes, crewsRes, custRes] = await Promise.all([
        axios.get(`${API}/installations${cityParam}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/crews${cityParam}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/customers${cityParam}`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setInstallations(instRes.data);
      setCrews(crewsRes.data);
      setCustomers(custRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [token, selectedCity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.city_id || formData.crew_ids.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      await axios.post(`${API}/installations`, formData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Installation scheduled');
      setDialogOpen(false);
      setFormData({
        customer_id: '', city_id: '', crew_ids: [], scheduled_date: '', scheduled_time: '',
        estimated_hours: 2, address: '', notes: '', installation_type: 'installation'
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to schedule installation');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`${API}/installations/${id}/status?status=${status}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Status updated to ${status}`);
      fetchData();
      setSelectedInstallation(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    if (formData.customer_id) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) {
        setFormData(f => ({ ...f, city_id: customer.city_id, address: customer.address }));
      }
    }
  }, [formData.customer_id, customers]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getInstallationsForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return installations.filter(i => i.scheduled_date === dateStr);
  };

  const statusColors = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-amber-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-slate-400'
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="schedule-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900">Installation Schedule</h1>
          <p className="text-slate-500">{installations.length} installations scheduled</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full gap-2" data-testid="schedule-installation-btn">
              <Plus size={18} /> Schedule Installation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Schedule Installation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customer_id} onValueChange={v => setFormData(f => ({ ...f, customer_id: v }))}>
                    <SelectTrigger data-testid="inst-customer"><SelectValue placeholder="Select customer" /></SelectTrigger>
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
                  <Label>Type</Label>
                  <Select value={formData.installation_type} onValueChange={v => setFormData(f => ({ ...f, installation_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="installation">Installation</SelectItem>
                      <SelectItem value="removal">Removal</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={formData.scheduled_date} onChange={e => setFormData(f => ({ ...f, scheduled_date: e.target.value }))} required data-testid="inst-date" />
                </div>
                <div>
                  <Label>Time</Label>
                  <Input type="time" value={formData.scheduled_time} onChange={e => setFormData(f => ({ ...f, scheduled_time: e.target.value }))} />
                </div>
                <div>
                  <Label>Est. Hours</Label>
                  <Input type="number" min="0.5" step="0.5" value={formData.estimated_hours} onChange={e => setFormData(f => ({ ...f, estimated_hours: parseFloat(e.target.value) || 2 }))} />
                </div>
                <div className="col-span-2">
                  <Label>Assign Crews *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {crews.map(crew => (
                      <button
                        key={crew.id}
                        type="button"
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          formData.crew_ids.includes(crew.id)
                            ? 'text-white shadow-md scale-105'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        style={formData.crew_ids.includes(crew.id) ? { backgroundColor: crew.color } : {}}
                        onClick={() => setFormData(f => ({
                          ...f,
                          crew_ids: f.crew_ids.includes(crew.id)
                            ? f.crew_ids.filter(id => id !== crew.id)
                            : [...f.crew_ids, crew.id]
                        }))}
                      >
                        {crew.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>Address *</Label>
                  <Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} required />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
              </div>
              <Button type="submit" className="w-full rounded-full" data-testid="save-installation-btn">Schedule</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Header */}
      <Card className="border-slate-100">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <CaretLeft size={20} />
            </Button>
            <h2 className="text-xl font-heading font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <CaretRight size={20} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-slate-500 py-2">{day}</div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] bg-slate-50 rounded-lg" />
            ))}
            
            {/* Day cells */}
            {daysInMonth.map(day => {
              const dayInstallations = getInstallationsForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[100px] p-2 rounded-lg border ${
                    isToday ? 'border-primary bg-primary/5' : 'border-slate-100 bg-white'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-slate-600'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayInstallations.slice(0, 3).map(inst => (
                      <button
                        key={inst.id}
                        onClick={() => setSelectedInstallation(inst)}
                        className={`w-full text-left text-xs p-1 rounded text-white truncate ${statusColors[inst.status]}`}
                      >
                        {inst.scheduled_time && `${inst.scheduled_time} `}{inst.customer_name}
                      </button>
                    ))}
                    {dayInstallations.length > 3 && (
                      <div className="text-xs text-slate-500">+{dayInstallations.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Installation Detail Modal */}
      <Dialog open={!!selectedInstallation} onOpenChange={() => setSelectedInstallation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Installation Details</DialogTitle>
          </DialogHeader>
          {selectedInstallation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${statusColors[selectedInstallation.status]}`} />
                <span className="capitalize font-medium">{selectedInstallation.status}</span>
                <span className="text-slate-500">• {selectedInstallation.installation_type}</span>
              </div>
              
              <div className="space-y-3">
                <p className="flex items-center gap-2"><User size={16} className="text-slate-400" /> {selectedInstallation.customer_name}</p>
                <p className="flex items-center gap-2"><Phone size={16} className="text-slate-400" /> {selectedInstallation.customer_phone}</p>
                <p className="flex items-center gap-2"><CalendarBlank size={16} className="text-slate-400" /> {selectedInstallation.scheduled_date} {selectedInstallation.scheduled_time && `at ${selectedInstallation.scheduled_time}`}</p>
                <p className="flex items-center gap-2"><Clock size={16} className="text-slate-400" /> {selectedInstallation.estimated_hours} hours</p>
                <p className="flex items-center gap-2"><MapPin size={16} className="text-slate-400" /> {selectedInstallation.address}</p>
              </div>

              {selectedInstallation.crews && selectedInstallation.crews.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Assigned Crews</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedInstallation.crews.map(crew => (
                      <span key={crew.id} className="px-2 py-1 rounded-full text-xs text-white" style={{ backgroundColor: crew.color }}>
                        {crew.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedInstallation.notes && (
                <div>
                  <p className="text-sm text-slate-500">Notes</p>
                  <p className="text-slate-700">{selectedInstallation.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                {selectedInstallation.status === 'scheduled' && (
                  <Button onClick={() => handleStatusUpdate(selectedInstallation.id, 'in_progress')} className="flex-1 bg-amber-500 hover:bg-amber-600">
                    Start Work
                  </Button>
                )}
                {selectedInstallation.status === 'in_progress' && (
                  <Button onClick={() => handleStatusUpdate(selectedInstallation.id, 'completed')} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                    Complete
                  </Button>
                )}
                {['scheduled', 'in_progress'].includes(selectedInstallation.status) && (
                  <Button variant="outline" onClick={() => handleStatusUpdate(selectedInstallation.id, 'cancelled')}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
