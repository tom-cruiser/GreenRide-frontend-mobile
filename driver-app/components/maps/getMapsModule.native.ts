import type { MapsModule } from "./types";

export async function getMapsModule(): Promise<MapsModule> {
  try {
    // Use dynamic import for proper async loading
    const rnMaps = await import("react-native-maps");
    return {
      MapView: rnMaps.default,
      Marker: rnMaps.Marker,
    };
  } catch (error) {
    console.warn("Maps module not available:", error);
    return null;
  }
}
