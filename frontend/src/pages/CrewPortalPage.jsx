import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Snowflake, SignOut, CalendarBlank, Clock, MapPin, Phone, User, Check, Play } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CrewPortalPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await axios.get(`${API}/crew-portal/my-schedule`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInstallations(response.data);
      } catch (error) {
        toast.error('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [token]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`${API}/installations/${id}/status?status=${status}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Job ${status === 'completed' ? 'completed' : 'started'}`);
      // Refresh
      const response = await axios.get(`${API}/crew-portal/my-schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInstallations(response.data);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const statusColors = {
    scheduled: 'border-blue-200 bg-blue-50',
    in_progress: 'border-amber-200 bg-amber-50'
  };

  const statusBadgeColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-amber-100 text-amber-700'
  };

  // Group by date
  const groupedByDate = installations.reduce((acc, inst) => {
    const date = inst.scheduled_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(inst);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background" data-testid="crew-portal-page">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Snowflake size={24} weight="fill" className="text-white" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-primary">Crew Portal</h1>
              <p className="text-xs text-slate-500">{user?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <SignOut size={18} /> Logout
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-heading font-bold text-slate-900">My Schedule</h2>
          <p className="text-slate-500">{installations.length} upcoming jobs</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : installations.length === 0 ? (
          <Card className="border-slate-100">
            <CardContent className="py-12 text-center">
              <CalendarBlank size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No scheduled jobs</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([date, jobs]) => (
              <div key={date}>
                <h3 className="font-heading font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CalendarBlank size={18} />
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-3">
                  {jobs.map(job => (
                    <Card 
                      key={job.id} 
                      className={`border-2 ${statusColors[job.status]}`}
                    >
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-heading font-semibold text-lg text-slate-900">{job.customer_name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadgeColors[job.status]}`}>
                              {job.status === 'scheduled' ? 'Scheduled' : 'In Progress'}
                            </span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded-full capitalize">{job.installation_type}</span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4">
                          {job.scheduled_time && (
                            <p className="flex items-center gap-2">
                              <Clock size={16} className="text-slate-400" />
                              {job.scheduled_time} ({job.estimated_hours}h)
                            </p>
                          )}
                          <p className="flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            {job.address}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone size={16} className="text-slate-400" />
                            <a href={`tel:${job.customer_phone}`} className="text-primary hover:underline">
                              {job.customer_phone}
                            </a>
                          </p>
                        </div>

                        {job.notes && (
                          <div className="mb-4 p-3 bg-white/50 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Notes</p>
                            <p className="text-sm text-slate-700">{job.notes}</p>
                          </div>
                        )}

                        {job.crews && job.crews.length > 1 && (
                          <div className="mb-4">
                            <p className="text-xs text-slate-500 mb-2">Other crew members</p>
                            <div className="flex flex-wrap gap-2">
                              {job.crews.filter(c => c.name !== user?.name).map(crew => (
                                <span key={crew.id} className="text-xs px-2 py-1 bg-white rounded-full border border-slate-200">
                                  {crew.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          {job.status === 'scheduled' && (
                            <Button 
                              onClick={() => handleStatusUpdate(job.id, 'in_progress')}
                              className="flex-1 gap-2 bg-amber-500 hover:bg-amber-600"
                            >
                              <Play size={18} /> Start Job
                            </Button>
                          )}
                          {job.status === 'in_progress' && (
                            <Button 
                              onClick={() => handleStatusUpdate(job.id, 'completed')}
                              className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600"
                            >
                              <Check size={18} /> Mark Complete
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(job.address)}`, '_blank')}
                          >
                            <MapPin size={18} />
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => window.open(`tel:${job.customer_phone}`, '_self')}
                          >
                            <Phone size={18} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
