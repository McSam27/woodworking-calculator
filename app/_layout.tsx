import "react-native-gesture-handler";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CalculatorProvider } from "../src/state/store";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CalculatorProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CalculatorProvider>
    </GestureHandlerRootView>
  );
}
