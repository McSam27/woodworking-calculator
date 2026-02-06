import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useCalculator, type Precision } from "../src/state/store";

const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
  <Pressable
    onPress={onToggle}
    className={`h-7 w-12 rounded-full ${value ? "bg-amber-600" : "bg-zinc-300 dark:bg-zinc-700"}`}
  >
    <View
      className={`h-6 w-6 rounded-full bg-white shadow-sm ${
        value ? "ml-[22px]" : "ml-0.5"
      }`}
    />
  </Pressable>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View className="mt-6">
    <Text className="px-5 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
      {title}
    </Text>
    <View className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {children}
    </View>
  </View>
);

const Row = ({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
}) => (
  <View className="flex-row items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
    <View className="flex-1 pr-3">
      <Text className="text-sm text-zinc-900 dark:text-zinc-100">{label}</Text>
      {sub && (
        <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{sub}</Text>
      )}
    </View>
    {children}
  </View>
);

const PrecisionButton = ({
  value,
  selected,
  onPress,
}: {
  value: Precision;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-full px-3 py-1 ${
      selected ? "bg-amber-600" : "bg-zinc-100 dark:bg-zinc-800"
    }`}
  >
    <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-zinc-700 dark:text-zinc-200"}`}>
      1/{value}
    </Text>
  </Pressable>
);

const ThemeButton = ({
  value,
  selected,
  onPress,
}: {
  value: "light" | "dark" | "system";
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-full px-3 py-1 ${
      selected ? "bg-amber-600" : "bg-zinc-100 dark:bg-zinc-800"
    }`}
  >
    <Text className={`text-xs font-semibold ${selected ? "text-white" : "text-zinc-700 dark:text-zinc-200"}`}>
      {value === "system" ? "System" : value === "light" ? "Light" : "Dark"}
    </Text>
  </Pressable>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { state, dispatch } = useCalculator();
  const insets = useSafeAreaInsets();
  const [showClearToast, setShowClearToast] = useState(false);
  const setPrecision = (value: Precision) => {
    dispatch({ type: "SET_SETTING", key: "fractionPrecision", val: value });
  };

  const confirmClearHistory = () => {
    Alert.alert(
      "Clear measurement history?",
      "This will delete all saved measurements and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            dispatch({ type: "CLEAR_ALL" });
            setShowClearToast(true);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!showClearToast) return;
    const timer = setTimeout(() => setShowClearToast(false), 1500);
    return () => clearTimeout(timer);
  }, [showClearToast]);

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={["top", "bottom"]}>
      {showClearToast && (
        <View
          className="absolute left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-200 px-4 py-3 shadow dark:bg-zinc-800"
          style={{ bottom: Math.max(insets.bottom, 16) }}
        >
          <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
            Measurements cleared
          </Text>
        </View>
      )}
      <View className="flex-row items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-amber-600">← Back</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</Text>
      </View>

      <Section title="General">
        <Row label="Theme" sub="Choose light, dark, or system">
          <View className="flex-row flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((value) => (
              <ThemeButton
                key={value}
                value={value}
                selected={state.settings.theme === value}
                onPress={() => dispatch({ type: "SET_SETTING", key: "theme", val: value })}
              />
            ))}
          </View>
        </Row>
      </Section>

      <Section title="Calculator">
        <Row label="Auto-save calculations" sub="Save every calculation when you press =">
          <Toggle
            value={state.settings.autoSave}
            onToggle={() =>
              dispatch({ type: "SET_SETTING", key: "autoSave", val: !state.settings.autoSave })
            }
          />
        </Row>
        <Row label="Default units">
          <View className="flex-row gap-2">
            {(["imperial", "imperial-inches", "metric", "metric-cm"] as const).map((unit) => (
              <Pressable
                key={unit}
                onPress={() => dispatch({ type: "SET_SETTING", key: "unitSystem", val: unit })}
                className={`rounded-full px-3 py-1 ${
                  state.settings.unitSystem === unit
                    ? "bg-amber-600"
                    : "bg-zinc-100 dark:bg-zinc-800"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    state.settings.unitSystem === unit
                      ? "text-white"
                      : "text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {unit === "imperial"
                    ? "Imperial"
                    : unit === "imperial-inches"
                      ? "Inches"
                      : unit === "metric"
                        ? "Metric - mm"
                        : "Metric cm"}
                </Text>
              </Pressable>
            ))}
          </View>
        </Row>
        <Row label="Fraction precision" sub="Results round to the nearest denominator">
          <View className="flex-row flex-wrap gap-2">
            {[2, 4, 8, 16, 32].map((val) => (
              <PrecisionButton
                key={val}
                value={val as Precision}
                selected={state.settings.fractionPrecision === val}
                onPress={() => setPrecision(val as Precision)}
              />
            ))}
          </View>
        </Row>
      </Section>

      <Section title="Data">
        <View className="px-5 py-4">
          <Pressable
            onPress={confirmClearHistory}
            disabled={state.history.length === 0}
            className={`rounded-xl border px-4 py-3 ${
              state.history.length === 0
                ? "border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
            }`}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                state.history.length === 0
                  ? "text-zinc-400 dark:text-zinc-500"
                  : "text-red-600 dark:text-red-300"
              }`}
            >
              Clear Measurement History
            </Text>
          </Pressable>
        </View>
      </Section>

      <Section title="About">
        <Row label="WoodCalc">
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">v1.0.0</Text>
        </Row>
      </Section>
    </SafeAreaView>
  );
}
