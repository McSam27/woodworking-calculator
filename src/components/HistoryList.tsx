import React, { useMemo, useRef, useState } from "react";
import { Platform, Pressable, SectionList, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import type { CalculationRecord, Precision } from "../state/store";
import { formatImperial, fractionFromDecimal, inchesToMm } from "../lib/math";
import { timeAgo } from "../lib/time";

type Props = {
  items: CalculationRecord[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSetDescription: (id: string, desc: string) => void;
  precision: Precision;
};

const SectionLabel = ({ title }: { title: string }) => (
  <Text className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
    {title}
  </Text>
);

const SwipeRow = ({
  onDelete,
  children,
  simultaneousHandlers,
}: {
  onDelete: () => void;
  children: React.ReactNode;
  simultaneousHandlers: React.RefObject<SectionList<CalculationRecord>>;
}) => {
  const renderRight = () => (
    <View className="flex h-full w-24 flex-row items-stretch">
      <Pressable onPress={onDelete} className="flex-1 items-center justify-center bg-red-500">
        <Ionicons name="trash-outline" size={18} color="#ffffff" />
        <Text className="mt-1 text-xs font-semibold text-white">Delete</Text>
      </Pressable>
    </View>
  );
  return (
    <Swipeable
      renderRightActions={renderRight}
      overshootRight={false}
      simultaneousHandlers={simultaneousHandlers}
    >
      {children}
    </Swipeable>
  );
};

export const HistoryList = ({
  items,
  onDelete,
  onToggleFavorite,
  onSetDescription,
  precision,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const listRef = useRef<SectionList<CalculationRecord>>(null);

  const filteredItems = useMemo(() => {
    if (activeTab === "favorites") {
      return items.filter((item) => item.isFavorited);
    }
    return items;
  }, [activeTab, items]);

  const sortedItems = useMemo(
    () => [...filteredItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filteredItems]
  );

  const favorites = useMemo(
    () => sortedItems.filter((i) => i.isFavorited),
    [sortedItems]
  );

  const startEdit = (item: CalculationRecord) => {
    setEditingId(item.id);
    setEditValue(item.description ?? "");
  };

  const saveEdit = (id: string) => {
    onSetDescription(id, editValue.trim().slice(0, 60));
    setEditingId(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const formatFixed = (value: number, decimals = 2) =>
    value.toFixed(decimals).replace(/\.?0+$/, "");

  const renderItem = (item: CalculationRecord) => {
    const inches = item.resultRaw;
    const frac = fractionFromDecimal(inches, 1000000);
    const mm = inchesToMm(inches);
    const cm = mm / 10;
    return (
    <SwipeRow key={item.id} onDelete={() => onDelete(item.id)} simultaneousHandlers={listRef}>
      <View className="border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        {editingId === item.id ? (
          <View className="mb-2 flex-row items-center gap-2">
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Add description..."
              placeholderTextColor="#71717a"
              autoFocus
              maxLength={60}
              className="flex-1 rounded-lg border border-amber-500 bg-white px-3 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
              style={{
                height: 40,
                lineHeight: 20,
                textAlignVertical: "center",
                paddingVertical: Platform.OS === "ios" ? 8 : 0,
              }}
            />
            <Pressable onPress={() => saveEdit(item.id)} className="rounded-lg bg-amber-600 px-3 py-2">
              <Ionicons name="checkmark" size={16} color="#ffffff" />
            </Pressable>
            <Pressable onPress={cancelEdit} className="rounded-lg bg-zinc-200 px-3 py-2 dark:bg-zinc-800">
              <Ionicons name="close" size={16} color="#3f3f46" />
            </Pressable>
          </View>
        ) : (
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className={`text-base font-semibold ${
                item.description
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {item.description ?? "Add description"}
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => startEdit(item)} className="p-1">
                <Ionicons name="create-outline" size={18} color="#a1a1aa" />
              </Pressable>
              <Pressable onPress={() => onToggleFavorite(item.id)} className="p-1">
                <Ionicons
                  name={item.isFavorited ? "heart" : "heart-outline"}
                  size={18}
                  color={item.isFavorited ? "#f59e0b" : "#a1a1aa"}
                />
              </Pressable>
            </View>
          </View>
        )}

        <Text className="mt-2 font-mono text-lg text-zinc-500 dark:text-zinc-400">
          {item.expression}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-mono text-xl font-semibold text-amber-600 dark:text-amber-400">
            = {item.result}
          </Text>
          <Text className="text-sm text-zinc-500 dark:text-zinc-400">
            {timeAgo(item.createdAt)}
          </Text>
        </View>

        <View className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-950">
          <Text className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Live Conversions
          </Text>
          <View className="mt-2 flex-row flex-wrap">
            <View className="w-1/2 pr-2">
              <Text className="font-mono text-base text-zinc-700 dark:text-zinc-200">
                {formatFixed(inches, 3)} in
              </Text>
            </View>
            <View className="w-1/2 pl-2">
              <Text className="font-mono text-base text-zinc-700 dark:text-zinc-200">
                {formatImperial(frac, precision)}
              </Text>
            </View>
            <View className="mt-2 w-1/2 pr-2">
              <Text className="font-mono text-base text-zinc-700 dark:text-zinc-200">
                {formatFixed(cm, 2)} cm
              </Text>
            </View>
            <View className="mt-2 w-1/2 pl-2">
              <Text className="font-mono text-base text-zinc-700 dark:text-zinc-200">
                {formatFixed(mm, 2)} mm
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SwipeRow>
    );
  };

  const sections = (
    activeTab === "favorites"
      ? [{ title: "Favorites", data: favorites }]
      : [{ title: "", data: sortedItems }]
  ).filter(Boolean) as { title: string; data: CalculationRecord[] }[];

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-2 p-5">
        {(["all", "favorites"] as const).map((tab) => {
          const selected = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 ${
                selected ? "bg-amber-600" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? "text-white" : "text-zinc-700 dark:text-zinc-200"
                }`}
              >
                {tab === "all" ? "All" : "Favorites"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderItem(item)}
        renderSectionHeader={({ section }) =>
          section.title ? <SectionLabel title={section.title} /> : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-6 py-16">
            <Text className="mt-3 text-base font-semibold text-zinc-700 dark:text-zinc-200">
              {activeTab === "favorites" ? "No favorites yet" : "No measurements yet"}
            </Text>
            <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {activeTab === "favorites"
                ? "Tap the heart on any measurement in All to add it here."
                : "Start calculating to build your list!"}
            </Text>
          </View>
        }
        ListFooterComponent={
          <Text className="px-5 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Swipe left on an item to name or delete
          </Text>
        }
        stickySectionHeadersEnabled={false}
        className="flex-1 pb-6"
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
};
