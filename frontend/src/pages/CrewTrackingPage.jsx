import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API, useAuth, useCity } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { NavigationArrow, MapPin, Clock, User, ArrowsClockwise, Circle, List, MapTrifold, House, Phone } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const createCrewIcon = (color, status) => {
  const isActive = status === 'checked_in';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        ${isActive ? 'animation: pulse 2s infinite;' : ''}
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

const createJobIcon = (status) => {
  const colors = {
    scheduled: '#3b82f6',
    in_progress: '#f59e0b',
    completed: '#22c55e'
  };
  const color = colors[status] || '#6b7280';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to fit map bounds
const FitBounds = ({ positions }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  
  return null;
};

export default function CrewTrackingPage() {
  const { token } = useAuth();
  const { selectedCity } = useCity();
  const [crewLocations, setCrewLocations] = useState([]);
  const [todaysJobs, setTodaysJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [showJobs, setShowJobs] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const params = selectedCity ? `?city_id=${selectedCity.id}` : '';
      const [locationsRes, jobsRes] = await Promise.all([
        axios.get(`${API}/tracking/crew-locations${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/tracking/todays-schedule${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setCrewLocations(locationsRes.data);
      setTodaysJobs(jobsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [token, selectedCity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const statusConfig = {
    checked_in: { label: 'On Site', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgColor: 'bg-emerald-50' },
    en_route: { label: 'En Route', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    idle: { label: 'Available', color: 'bg-slate-400', textColor: 'text-slate-600', bgColor: 'bg-slate-50' }
  };

  const jobStatusConfig = {
    scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
    in_progress: { label: 'In Progress', color: 'bg-amber-500' },
    completed: { label: 'Completed', color: 'bg-emerald-500' }
  };

  const openInMaps = (lat, lng) => {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
  };

  const openAddressInMaps = (address) => {
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, '_blank');
  };

  const activeCrews = crewLocations.filter(c => c.status === 'checked_in');
  const idleCrews = crewLocations.filter(c => c.status !== 'checked_in');

  // Get all positions for map bounds
  const allPositions = [
    ...crewLocations.map(c => [c.latitude, c.longitude]),
    ...todaysJobs.filter(j => j.check_in_location).map(j => [j.check_in_location.latitude, j.check_in_location.longitude])
  ];

  // Default center (Denver, CO) if no positions
  const defaultCenter = [39.7392, -104.9903];
  const mapCenter = allPositions.length > 0 ? allPositions[0] : defaultCenter;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crew-tracking-page">
      {/* Add CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-slate-900 flex items-center gap-3">
            <NavigationArrow size={32} className="text-primary" />
            Crew Tracking
          </h1>
          <p className="text-slate-500">
            {crewLocations.length} crews tracked • {activeCrews.length} on site • {todaysJobs.length} jobs today
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="rounded-none gap-1"
              data-testid="view-map-btn"
            >
              <MapTrifold size={16} /> Map
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none gap-1"
              data-testid="view-list-btn"
            >
              <List size={16} /> List
            </Button>
          </div>
          
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
            Auto-refresh
          </label>
          <Button variant="outline" onClick={fetchData} className="gap-2">
            <ArrowsClockwise size={18} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <House size={24} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Jobs Today</p>
                <p className="text-2xl font-heading font-bold text-blue-700">{todaysJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock size={24} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-amber-600">In Progress</p>
                <p className="text-2xl font-heading font-bold text-amber-700">
                  {todaysJobs.filter(j => j.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <Card className="border-slate-100 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading flex items-center gap-2">
                <MapTrifold size={20} />
                Live Map
              </CardTitle>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showJobs}
                  onChange={(e) => setShowJobs(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
                Show today's job locations
              </label>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <p className="text-slate-500">Loading map...</p>
                </div>
              ) : (
                <MapContainer
                  center={mapCenter}
                  zoom={11}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {allPositions.length > 0 && <FitBounds positions={allPositions} />}
                  
                  {/* Crew Markers */}
                  {crewLocations.map(crew => (
                    <Marker
                      key={crew.crew_id}
                      position={[crew.latitude, crew.longitude]}
                      icon={createCrewIcon(crew.crew_color, crew.status)}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: crew.crew_color }}
                            >
                              {crew.crew_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold">{crew.crew_name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[crew.status]?.color} text-white`}>
                                {statusConfig[crew.status]?.label}
                              </span>
                            </div>
                          </div>
                          {crew.customer_name && (
                            <p className="text-sm text-slate-600 mb-1">
                              <strong>Job:</strong> {crew.customer_name}
                            </p>
                          )}
                          {crew.address && (
                            <p className="text-sm text-slate-500 mb-2">{crew.address}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            Updated {formatDistanceToNow(new Date(crew.timestamp), { addSuffix: true })}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2"
                            onClick={() => openInMaps(crew.latitude, crew.longitude)}
                          >
                            Open in Google Maps
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Today's Job Markers */}
                  {showJobs && todaysJobs.filter(j => j.check_in_location).map(job => (
                    <Marker
                      key={job.id}
                      position={[job.check_in_location.latitude, job.check_in_location.longitude]}
                      icon={createJobIcon(job.status)}
                    >
                      <Popup>
                        <div className="min-w-[200px]">
                          <p className="font-semibold mb-1">{job.customer_name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${jobStatusConfig[job.status]?.color} text-white`}>
                            {jobStatusConfig[job.status]?.label}
                          </span>
                          <p className="text-sm text-slate-500 mt-2">{job.address}</p>
                          {job.scheduled_time && (
                            <p className="text-sm text-slate-600">
                              <strong>Time:</strong> {job.scheduled_time} ({job.estimated_hours}h)
                            </p>
                          )}
                          {job.crews?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-500">Assigned:</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {job.crews.map(c => (
                                  <span
                                    key={c.id}
                                    className="text-xs px-2 py-0.5 rounded-full text-white"
                                    style={{ backgroundColor: c.color }}
                                  >
                                    {c.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>
            
            {/* Map Legend */}
            <div className="p-4 bg-slate-50 border-t flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow flex items-center justify-center">
                  <User size={12} weight="fill" className="text-white" />
                </div>
                <span>Crew (On Site)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-400 border-2 border-white shadow flex items-center justify-center">
                  <User size={12} weight="fill" className="text-white" />
                </div>
                <span>Crew (Available)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-500 border-2 border-white shadow flex items-center justify-center">
                  <House size={12} weight="fill" className="text-white" />
                </div>
                <span>Scheduled Job</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500 border-2 border-white shadow flex items-center justify-center">
                  <House size={12} weight="fill" className="text-white" />
                </div>
                <span>In Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Jobs Section */}
      {viewMode === 'map' && todaysJobs.length > 0 && (
        <Card className="border-slate-100">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <House size={20} />
              Today's Schedule ({format(new Date(), 'EEEE, MMM d')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todaysJobs.map(job => (
                <div
                  key={job.id}
                  className={`p-4 rounded-xl border-2 ${
                    job.status === 'in_progress' ? 'border-amber-200 bg-amber-50' :
                    job.status === 'completed' ? 'border-emerald-200 bg-emerald-50' :
                    'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{job.customer_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white ${jobStatusConfig[job.status]?.color}`}>
                        {jobStatusConfig[job.status]?.label}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-white/50 rounded capitalize">
                      {job.installation_type}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-sm text-slate-600 mb-3">
                    {job.scheduled_time && (
                      <p className="flex items-center gap-1">
                        <Clock size={14} /> {job.scheduled_time} ({job.estimated_hours}h)
                      </p>
                    )}
                    <p className="flex items-center gap-1">
                      <MapPin size={14} /> {job.address}
                    </p>
                    {job.customer_phone && (
                      <p className="flex items-center gap-1">
                        <Phone size={14} /> 
                        <a href={`tel:${job.customer_phone}`} className="text-primary hover:underline">
                          {job.customer_phone}
                        </a>
                      </p>
                    )}
                  </div>

                  {job.crews?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {job.crews.map(c => (
                        <span
                          key={c.id}
                          className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1"
                    onClick={() => openAddressInMaps(job.address)}
                  >
                    <MapPin size={14} /> Directions
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View - Active Crews */}
      {viewMode === 'list' && activeCrews.length > 0 && (
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

      {/* List View - Available Crews */}
      {viewMode === 'list' && idleCrews.length > 0 && (
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
      {!loading && crewLocations.length === 0 && todaysJobs.length === 0 && (
        <Card className="border-slate-100">
          <CardContent className="py-12 text-center">
            <NavigationArrow size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-2">No crew locations or jobs available</p>
            <p className="text-sm text-slate-400">
              Crew locations will appear here once they check in to their jobs
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
