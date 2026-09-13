import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';

/**
 * Automatically locks the screen to landscape mode (ideal for 3D Battle Arena controls).
 */
export const lockToLandscape = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await ScreenOrientation.lock({ orientation: 'landscape' });
      return;
    }
  } catch (e) {
    console.warn('Native landscape lock failed:', e);
  }

  // Web API fallback (note: standard desktop/mobile browsers often require user gesture / fullscreen)
  try {
    const orientationObj = screen.orientation as any;
    if (orientationObj && typeof orientationObj.lock === 'function') {
      await orientationObj.lock('landscape');
    }
  } catch (e) {
    console.warn('Web screen.orientation.lock landscape failed:', e);
  }
};

/**
 * Restores the screen orientation to portrait mode (ideal for lobby & exploration walk).
 */
export const lockToPortrait = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await ScreenOrientation.lock({ orientation: 'portrait' });
      return;
    }
  } catch (e) {
    console.warn('Native portrait lock failed:', e);
  }

  try {
    const orientationObj = screen.orientation as any;
    if (orientationObj && typeof orientationObj.lock === 'function') {
      await orientationObj.lock('portrait');
    } else if (orientationObj && typeof orientationObj.unlock === 'function') {
      orientationObj.unlock();
    }
  } catch (e) {
    console.warn('Web screen.orientation.lock portrait failed:', e);
  }
};

/**
 * Unlocks orientation to allow normal auto-rotation based on physical sensor.
 */
export const unlockOrientation = async (): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await ScreenOrientation.unlock();
      return;
    }
  } catch (e) {
    console.warn('Native unlock orientation failed:', e);
  }

  try {
    if (screen.orientation && typeof screen.orientation.unlock === 'function') {
      screen.orientation.unlock();
    }
  } catch (e) {
    console.warn('Web unlock orientation failed:', e);
  }
};
