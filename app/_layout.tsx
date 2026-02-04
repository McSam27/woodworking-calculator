import "react-native-gesture-handler";
import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect } from "react";
import { useColorScheme } from "nativewind";
import { CalculatorProvider } from "../src/state/store";
import { useCalculator } from "../src/state/store";

const ThemeSync = () => {
  const { state } = useCalculator();
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(state.settings.theme);
  }, [setColorScheme, state.settings.theme]);

  return null;
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CalculatorProvider>
          <ThemeSync />
          <Stack screenOptions={{ headerShown: false }} />
        </CalculatorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
