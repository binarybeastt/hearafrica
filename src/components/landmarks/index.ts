import { Landmark, LandmarkZoomLevel } from '@/data/landmarks-data';
import {
  drawNationalTheatre,
  drawCocoaHouse,
  drawKanoDyePits,
  drawNationalMosque,
  drawIndependenceArch,
  drawBalogunMarketLandmark,
  drawKejetiaMarketLandmark,
  drawObalendeDanfoLandmark,
  drawKencomStageLandmark,
  drawYabaBukaLandmark,
  drawSurulereCompoundLandmark,
  drawLekkiIkoyiBridgeLandmark,
  drawThirdMainlandBridgeLandmark,
} from './LandmarkDrawers';

export function renderLandmark(
  ctx: CanvasRenderingContext2D,
  landmark: Landmark,
  screenX: number,
  screenY: number,
  scale: number,
  time: number,
  isHovered: boolean
) {
  switch (landmark.id) {
    case 'national_theatre':
      drawNationalTheatre(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'cocoa_house':
      drawCocoaHouse(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'dye_pits':
      drawKanoDyePits(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'national_mosque':
      drawNationalMosque(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'independence_arch':
      drawIndependenceArch(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'kejetia_market':
      drawKejetiaMarketLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'balogun_market':
      drawBalogunMarketLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'obalende_danfo':
      drawObalendeDanfoLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'kencom_stage':
      drawKencomStageLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'yaba_buka':
      drawYabaBukaLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'surulere_compound':
      drawSurulereCompoundLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'lekki_ikoyi_bridge':
      drawLekkiIkoyiBridgeLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    case 'third_mainland_bridge':
      drawThirdMainlandBridgeLandmark(ctx, screenX, screenY, scale, time, isHovered);
      break;
    default:
      break;
  }
}

export function findLandmarkAt(
  landmarks: Landmark[],
  currentLevel: 'africa' | 'country' | 'city' | 'market',
  P: (lon: number, lat: number) => [number, number],
  mouseX: number,
  mouseY: number
): Landmark | null {
  // Filter applicable level
  const targetLevel: LandmarkZoomLevel | null =
    currentLevel === 'country' ? 'country' : currentLevel === 'city' ? 'city' : null;

  if (!targetLevel) return null;

  const hitRadiusSq = 28 * 28; // 28px hit radius

  for (const lm of landmarks) {
    if (lm.zoomLevel !== targetLevel) continue;
    const [sx, sy] = P(lm.lon, lm.lat);
    const dx = mouseX - sx;
    const dy = mouseY - sy;
    if (dx * dx + dy * dy <= hitRadiusSq) {
      return lm;
    }
  }

  return null;
}
