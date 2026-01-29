import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { NavigationArrow, MapPin, Clock, User, ArrowsClockwise, Circle } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function CrewTrackingPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const [crewLocations, setCrewLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const response = await axios.get(`${API}/tracking/crew-locations${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrewLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch crew locations:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCity]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLocations]);

  const statusConfig = {
    checked_in: { label: 'On Site', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
    en_route: { label: 'En Route', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    idle: { label: 'Available', color: 'bg-slate-400', textColor: 'text-slate-600', bgColor: 'bg-slate-50' }
  };

  const openInMaps = (lat, lng) => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  const activeCrews = crewLocations.filter(c => c.status === 'checked_in');
  const idleCrews = crewLocations.filter(c => c.status !== 'checked_in');

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crew-tracking-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
            <NavigationArrow size={32} className="text-primary" />
            Crew Tracking
          </h1>
          <p className="text-slate-500">
            {crewLocations.length} crews tracked • {activeCrews.length} on site
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            Auto-refresh
          </label>
          <Button variant="outline" onClick={fetchLocations} className="gap-2">
            <ArrowsClockwise size={18} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Circle size={24} weight="fill" className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-emerald-600">On Site</p>
                <p className="text-2xl font-heading font-bold text-emerald-700">{activeCrews.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Circle size={24} weight="fill" className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Available</p>
                <p className="text-2xl font-heading font-bold text-slate-700">{idleCrews.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <User size={24} className="text-slate-500" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Crews</p>
                <p className="text-2xl font-heading font-bold text-slate-700">{crewLocations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Crews */}
      {activeCrews.length > 0 && (
        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Circle size={16} weight="fill" className="text-emerald-500" />
              Crews On Site
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeCrews.map(crew => {
                const config = statusConfig[crew.status];
                return (
                  <div
                    key={crew.crew_id}
                    className={`p-4 rounded-xl border-2 ${config.bgColor} border-emerald-200`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: crew.crew_color }}
                        >
                          {crew.crew_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{crew.crew_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.color} text-white`}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInMaps(crew.latitude, crew.longitude)}
                        title="Open in Google Maps"
                      >
                        <MapPin size={18} className="text-slate-500" />
                      </Button>
                    </div>

                    {crew.customer_name && (
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-slate-700">{crew.customer_name}</p>
                        <p className="text-slate-500 flex items-center gap-1">
                          <MapPin size={14} /> {crew.address}
                        </p>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-emerald-200 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(crew.timestamp), { addSuffix: true })}
                      </span>
                      {crew.accuracy && (
                        <span>±{crew.accuracy.toFixed(0)}m</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Crews */}
      {idleCrews.length > 0 && (
        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Circle size={16} weight="fill" className="text-slate-400" />
              Available Crews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {idleCrews.map(crew => (
                <div
                  key={crew.crew_id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: crew.crew_color }}
                    >
                      {crew.crew_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{crew.crew_name}</p>
                      <p className="text-xs text-slate-500">
                        Last seen {formatDistanceToNow(new Date(crew.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openInMaps(crew.latitude, crew.longitude)}
                    >
                      <MapPin size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && crewLocations.length === 0 && (
        <Card className="border-slate-100">
          <CardContent className="py-12 text-center">
            <NavigationArrow size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-2">No crew locations available</p>
            <p className="text-sm text-slate-400">
              Crew locations will appear here once they check in to their jobs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
