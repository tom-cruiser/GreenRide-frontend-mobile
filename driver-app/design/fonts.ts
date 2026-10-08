import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';

// Loads Inter (bundled with the app, no network needed). Show nothing until
// it is ready, so text never jumps from the system font to Inter.
export function useFlowFonts() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  // If loading fails, carry on with the system font rather than a blank app.
  return loaded || Boolean(error);
}
