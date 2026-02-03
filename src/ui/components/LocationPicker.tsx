import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng as LeafletLatLng } from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Loader2, Mountain, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PRESET_LOCATIONS, type LatLng } from '@/services/terrainLoader';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LocationPickerProps {
  onSelect: (location: LatLng, name: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Component to handle map click events
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (latlng: LeafletLatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export function LocationPicker({ onSelect, onCancel, isLoading }: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');
  const [showPresets, setShowPresets] = useState(false);

  const handleMapClick = useCallback((latlng: LeafletLatLng) => {
    setSelectedLocation({ lat: latlng.lat, lng: latlng.lng });
    setLocationName(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}`);
    setManualLat(latlng.lat.toFixed(6));
    setManualLng(latlng.lng.toFixed(6));
  }, []);

  const handlePresetSelect = useCallback((name: string, location: LatLng) => {
    setSelectedLocation(location);
    setLocationName(name);
    setManualLat(location.lat.toFixed(6));
    setManualLng(location.lng.toFixed(6));
    setShowPresets(false);
  }, []);

  const handleManualInput = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setSelectedLocation({ lat, lng });
      setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }, [manualLat, manualLng]);

  const handleConfirm = useCallback(() => {
    if (selectedLocation) {
      onSelect(selectedLocation, locationName);
    }
  }, [selectedLocation, locationName, onSelect]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[800px] max-h-[90vh] overflow-hidden"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Select Real Terrain</h2>
              <p className="text-xs text-gray-400">Click the map or enter coordinates</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Map */}
        <div className="h-[400px] relative">
          <MapContainer
            center={[40, 0]}
            zoom={2}
            className="h-full w-full"
            style={{ background: '#1f2937' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onLocationSelect={handleMapClick} />
            {selectedLocation && (
              <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
            )}
          </MapContainer>
          
          {/* Preset Locations Dropdown */}
          <div className="absolute top-3 left-3 z-[1000]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              className="bg-gray-900/90 hover:bg-gray-800 border border-gray-700"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Presets
            </Button>
            
            <AnimatePresence>
              {showPresets && (
                <motion.div
                  className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {Object.entries(PRESET_LOCATIONS).map(([name, location]) => (
                    <button
                      key={name}
                      onClick={() => handlePresetSelect(name, location)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Coordinate Input */}
        <div className="p-4 border-t border-gray-800 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Latitude</label>
              <Input
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                onBlur={handleManualInput}
                placeholder="e.g., 36.0544"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">Longitude</label>
              <Input
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                onBlur={handleManualInput}
                placeholder="e.g., -112.1401"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={handleManualInput}
                className="bg-gray-800 border-gray-700"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 border border-gray-700">
              <div>
                <div className="text-sm font-medium">{locationName}</div>
                <div className="text-xs text-gray-400">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              </div>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Terrain...
                  </>
                ) : (
                  <>
                    <Mountain className="w-4 h-4 mr-2" />
                    Load Terrain
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
