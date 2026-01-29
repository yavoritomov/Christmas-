import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API, useAuth } from '../App';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Snowflake, SignOut, CalendarBlank, Clock, MapPin, Phone, Check, Play, NavigationArrow, Warning, Spinner } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CrewPortalPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState({});
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  // Get current GPS location
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setCurrentLocation(loc);
          setLocationError(null);
          resolve(loc);
        },
        (error) => {
          let message = 'Unable to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
            default:
              message = 'Unknown location error';
          }
          setLocationError(message);
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }, []);

  // Request location permission on mount
  useEffect(() => {
    getCurrentLocation().catch(console.error);
  }, [getCurrentLocation]);

  // Live location tracking (optional)
  useEffect(() => {
    if (!trackingEnabled || !token) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setCurrentLocation(loc);
        
        // Send location update to server
        try {
          await axios.post(`${API}/crew-portal/update-location`, loc, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          console.error('Failed to update location:', error);
        }
      },
      (error) => console.error('Watch position error:', error),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingEnabled, token]);

  const fetchSchedule = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleCheckIn = async (installationId) => {
    setLocationLoading(prev => ({ ...prev, [installationId]: 'checkin' }));
    try {
      const location = await getCurrentLocation();
      await axios.post(`${API}/crew-portal/check-in/${installationId}`, location, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Checked in successfully!');
      fetchSchedule();
    } catch (error) {
      toast.error(error.message || 'Failed to check in');
    } finally {
      setLocationLoading(prev => ({ ...prev, [installationId]: null }));
    }
  };

  const handleCheckOut = async (installationId) => {
    setLocationLoading(prev => ({ ...prev, [installationId]: 'checkout' }));
    try {
      const location = await getCurrentLocation();
      await axios.post(`${API}/crew-portal/check-out/${installationId}`, location, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Job completed! Great work!');
      fetchSchedule();
    } catch (error) {
      toast.error(error.message || 'Failed to check out');
    } finally {
      setLocationLoading(prev => ({ ...prev, [installationId]: null }));
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

      {/* Location Status Bar */}
      <div className={`px-4 py-2 text-sm ${locationError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {locationError ? (
              <>
                <Warning size={16} />
                <span>{locationError}</span>
              </>
            ) : currentLocation ? (
              <>
                <NavigationArrow size={16} />
                <span>GPS Active • Accuracy: {currentLocation.accuracy?.toFixed(0)}m</span>
              </>
            ) : (
              <>
                <NavigationArrow size={16} className="animate-pulse" />
                <span>Getting location...</span>
              </>
            )}
          </div>
          {locationError && (
            <Button variant="ghost" size="sm" onClick={() => getCurrentLocation().catch(() => {})}>
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Live Tracking Toggle */}
      <div className="max-w-2xl mx-auto px-4 py-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={trackingEnabled}
            onChange={(e) => setTrackingEnabled(e.target.checked)}
            className="w-5 h-5 rounded text-primary"
          />
          <span className="text-sm text-slate-600">Enable live location tracking</span>
        </label>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
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

                        {/* Check-in/Check-out timestamps */}
                        {job.check_in_time && (
                          <div className="mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-xs text-emerald-600 font-medium">
                              Checked in: {format(new Date(job.check_in_time), 'h:mm a')}
                            </p>
                          </div>
                        )}

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
                              onClick={() => handleCheckIn(job.id)}
                              disabled={locationLoading[job.id] === 'checkin' || !!locationError}
                              className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600"
                              data-testid={`checkin-${job.id}`}
                            >
                              {locationLoading[job.id] === 'checkin' ? (
                                <>
                                  <span className="animate-spin">⏳</span> Getting Location...
                                </>
                              ) : (
                                <>
                                  <NavigationArrow size={18} /> Check In
                                </>
                              )}
                            </Button>
                          )}
                          {job.status === 'in_progress' && (
                            <Button 
                              onClick={() => handleCheckOut(job.id)}
                              disabled={locationLoading[job.id] === 'checkout' || !!locationError}
                              className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                              data-testid={`checkout-${job.id}`}
                            >
                              {locationLoading[job.id] === 'checkout' ? (
                                <>
                                  <span className="animate-spin">⏳</span> Getting Location...
                                </>
                              ) : (
                                <>
                                  <Check size={18} /> Check Out & Complete
                                </>
                              )}
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
