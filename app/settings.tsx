import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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

export default function SettingsScreen() {
  const router = useRouter();
  const { state, dispatch } = useCalculator();
  const [confirmClear, setConfirmClear] = useState(false);

  const setPrecision = (value: Precision) => {
    dispatch({ type: "SET_SETTING", key: "fractionPrecision", val: value });
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={["top", "bottom"]}>
      <View className="flex-row items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <Pressable onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-amber-600">← Back</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</Text>
      </View>

      <Section title="Account">
        <View className="flex-row items-center gap-4 px-5 py-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
            <Text className="text-lg">👤</Text>
          </View>
          <View>
            <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Sign in to sync measurements
            </Text>
            <Text className="mt-1 text-xs font-semibold text-amber-600">Coming soon</Text>
          </View>
        </View>
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
            {(["imperial", "metric"] as const).map((unit) => (
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
                  {unit === "imperial" ? "Imperial" : "Metric"}
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
        <Row label="Enable unit conversion" sub="Show ⇄ button to convert results">
          <Toggle
            value={state.settings.unitConversionEnabled}
            onToggle={() =>
              dispatch({
                type: "SET_SETTING",
                key: "unitConversionEnabled",
                val: !state.settings.unitConversionEnabled,
              })
            }
          />
        </Row>
      </Section>

      <Section title="Data">
        <View className="px-5 py-4">
          {!confirmClear ? (
            <Pressable
              onPress={() => setConfirmClear(true)}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950"
            >
              <Text className="text-center text-sm font-semibold text-red-600 dark:text-red-300">
                Clear All History
              </Text>
            </Pressable>
          ) : (
            <View className="items-center">
              <Text className="text-sm font-semibold text-red-600 dark:text-red-300">
                Delete all saved measurements?
              </Text>
              <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                This cannot be undone.
              </Text>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={() => {
                    dispatch({ type: "CLEAR_ALL" });
                    setConfirmClear(false);
                  }}
                  className="rounded-lg bg-red-600 px-4 py-2"
                >
                  <Text className="text-xs font-semibold text-white">Delete All</Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmClear(false)}
                  className="rounded-lg bg-zinc-200 px-4 py-2 dark:bg-zinc-800"
                >
                  <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Cancel
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
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
