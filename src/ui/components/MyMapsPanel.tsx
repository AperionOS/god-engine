import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, FolderOpen, Trash2, Loader2, MapPin, Clock, Users, 
  Download, RefreshCw, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { listMaps, deleteMap, SavedMapMeta } from '@/services/mapPersistence';

interface MyMapsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadMap: (mapId: string) => Promise<void>;
}

export function MyMapsPanel({ isOpen, onClose, onLoadMap }: MyMapsPanelProps) {
  const [maps, setMaps] = useState<SavedMapMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMapId, setLoadingMapId] = useState<string | null>(null);
  const [deletingMapId, setDeletingMapId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const fetchMaps = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listMaps();
      setMaps(response.maps);
      setLimit(response.limit);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load maps');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMaps();
    }
  }, [isOpen]);

  const handleLoad = async (mapId: string) => {
    setLoadingMapId(mapId);
    try {
      await onLoadMap(mapId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map');
    } finally {
      setLoadingMapId(null);
    }
  };

  const handleDelete = async (mapId: string, mapName: string) => {
    if (!confirm(`Delete "${mapName}"? This cannot be undone.`)) {
      return;
    }

    setDeletingMapId(mapId);
    try {
      await deleteMap(mapId);
      setMaps(maps.filter((m) => m.id !== mapId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete map');
    } finally {
      setDeletingMapId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">My Maps</h2>
                <Badge variant="secondary" className="text-xs">
                  {maps.length}/{limit}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={fetchMaps}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 mx-4 mt-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading && maps.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : maps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <FolderOpen className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No saved maps yet</p>
                  <p className="text-xs mt-1">Save your world to see it here</p>
                </div>
              ) : (
                maps.map((map) => (
                  <motion.div
                    key={map.id}
                    layout
                    className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{map.name}</h3>
                        {map.locationName && (
                          <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {map.locationName.split(',')[0]}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] ml-2">
                        Seed: {map.seed}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Tick {map.tick}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {map.population}
                      </span>
                      <span className="text-gray-500">
                        {formatDate(map.createdAt)}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-500"
                        onClick={() => handleLoad(map.id)}
                        disabled={loadingMapId === map.id}
                      >
                        {loadingMapId === map.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Download className="h-3 w-3 mr-1" />
                            Load
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 border-red-800 hover:bg-red-900/20"
                        onClick={() => handleDelete(map.id, map.name)}
                        disabled={deletingMapId === map.id}
                      >
                        {deletingMapId === map.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-800 text-[10px] text-gray-500 text-center">
              Maps are saved to your Cloudflare account
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
