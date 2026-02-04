import "react-native-gesture-handler";
import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CalculatorProvider } from "../src/state/store";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CalculatorProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </CalculatorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
