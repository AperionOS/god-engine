/**
 * TerrainLoader - Fetches real elevation data from AWS Terrain Tiles
 * 
 * AWS Terrain Tiles use the Terrarium encoding format:
 * elevation = (red * 256 + green + blue / 256) - 32768
 * 
 * Tiles are available at: https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
 * 
 * Zoom levels:
 * - z=10: ~150m/pixel (good for large regions)
 * - z=12: ~38m/pixel (good for valleys/mountains)
 * - z=14: ~10m/pixel (detailed terrain)
 */

export interface TerrainTile {
  elevations: Float32Array;
  width: number;
  height: number;
  minElevation: number;
  maxElevation: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface LatLng {
  lat: number;
  lng: number;
}

// Convert lat/lng to tile coordinates
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

// Convert tile coordinates back to lat/lng bounds
function tileToBounds(x: number, y: number, zoom: number): TerrainTile['bounds'] {
  const n = Math.pow(2, zoom);
  const west = x / n * 360 - 180;
  const east = (x + 1) / n * 360 - 180;
  
  const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
  
  return { north, south, east, west };
}

// Decode Terrarium PNG format: elevation = (R * 256 + G + B / 256) - 32768
function decodeTerrarium(imageData: ImageData): { elevations: Float32Array; min: number; max: number } {
  const { data, width, height } = imageData;
  const elevations = new Float32Array(width * height);
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    
    const elevation = (r * 256 + g + b / 256) - 32768;
    elevations[i] = elevation;
    
    if (elevation < min) min = elevation;
    if (elevation > max) max = elevation;
  }
  
  return { elevations, min, max };
}

// Load image and get pixel data
async function loadImageData(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    
    img.onerror = () => reject(new Error(`Failed to load terrain tile: ${url}`));
    img.src = url;
  });
}

/**
 * Fetch terrain data for a given location
 * 
 * @param center - Center coordinates
 * @param zoom - Zoom level (10-14 recommended)
 * @param targetSize - Output size (will be resampled if different from tile size)
 */
export async function fetchTerrain(
  center: LatLng,
  zoom: number = 12,
  targetSize: number = 256
): Promise<TerrainTile> {
  // Get tile coordinates
  const { x, y } = latLngToTile(center.lat, center.lng, zoom);
  
  // AWS Terrain Tiles URL (Terrarium format)
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${zoom}/${x}/${y}.png`;
  
  // Load and decode
  const imageData = await loadImageData(url);
  const { elevations, min, max } = decodeTerrarium(imageData);
  
  // Resample if needed (tiles are 256x256, but we might want different sizes)
  let finalElevations = elevations;
  let finalWidth = imageData.width;
  let finalHeight = imageData.height;
  
  if (targetSize !== imageData.width) {
    const resampled = resampleElevations(elevations, imageData.width, imageData.height, targetSize, targetSize);
    finalElevations = resampled;
    finalWidth = targetSize;
    finalHeight = targetSize;
  }
  
  return {
    elevations: finalElevations,
    width: finalWidth,
    height: finalHeight,
    minElevation: min,
    maxElevation: max,
    bounds: tileToBounds(x, y, zoom),
  };
}

// Bilinear interpolation for resampling
function resampleElevations(
  src: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const dst = new Float32Array(dstWidth * dstHeight);
  
  const xRatio = srcWidth / dstWidth;
  const yRatio = srcHeight / dstHeight;
  
  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = x * xRatio;
      const srcY = y * yRatio;
      
      const x0 = Math.floor(srcX);
      const y0 = Math.floor(srcY);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const y1 = Math.min(y0 + 1, srcHeight - 1);
      
      const xFrac = srcX - x0;
      const yFrac = srcY - y0;
      
      const tl = src[y0 * srcWidth + x0];
      const tr = src[y0 * srcWidth + x1];
      const bl = src[y1 * srcWidth + x0];
      const br = src[y1 * srcWidth + x1];
      
      const top = tl + (tr - tl) * xFrac;
      const bottom = bl + (br - bl) * xFrac;
      
      dst[y * dstWidth + x] = top + (bottom - top) * yFrac;
    }
  }
  
  return dst;
}

/**
 * Normalize elevations to 0-1 range for use with existing biome/moisture logic
 */
export function normalizeElevations(tile: TerrainTile): Float32Array {
  const normalized = new Float32Array(tile.elevations.length);
  const range = tile.maxElevation - tile.minElevation;
  
  if (range === 0) {
    // Flat terrain - return 0.5 everywhere
    normalized.fill(0.5);
    return normalized;
  }
  
  for (let i = 0; i < tile.elevations.length; i++) {
    normalized[i] = (tile.elevations[i] - tile.minElevation) / range;
  }
  
  return normalized;
}

/**
 * Get location name from coordinates using reverse geocoding
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'GodEngine/1.0' } }
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

// Preset locations for easy testing
export const PRESET_LOCATIONS: Record<string, LatLng> = {
  'Grand Canyon': { lat: 36.0544, lng: -112.1401 },
  'Swiss Alps (Matterhorn)': { lat: 45.9763, lng: 7.6586 },
  'Mount Fuji': { lat: 35.3606, lng: 138.7274 },
  'Himalayas (Everest)': { lat: 27.9881, lng: 86.9250 },
  'Iceland Highlands': { lat: 64.9631, lng: -19.0208 },
  'Norwegian Fjords': { lat: 61.2333, lng: 6.8500 },
  'Scottish Highlands': { lat: 57.0000, lng: -5.0000 },
  'Andes (Patagonia)': { lat: -50.0000, lng: -73.0000 },
  'Death Valley': { lat: 36.5054, lng: -117.0794 },
  'Great Rift Valley': { lat: -3.0674, lng: 37.3556 },
};
