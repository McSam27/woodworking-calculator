import React, { useMemo, useState } from "react";
import { Platform, Pressable, SectionList, Text, TextInput, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { CalculationRecord } from "../state/store";
import { timeAgo } from "../lib/time";

type Props = {
  items: CalculationRecord[];
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onSetDescription: (id: string, desc: string) => void;
};

const SectionLabel = ({ title }: { title: string }) => (
  <Text className="px-5 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
    {title}
  </Text>
);

const SwipeRow = ({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) => {
  const renderRight = () => (
    <View className="flex h-full w-24 items-center justify-center bg-red-500">
      <Pressable onPress={onDelete} className="px-4 py-3">
        <Text className="text-sm font-semibold text-white">Delete</Text>
      </Pressable>
    </View>
  );
  return (
    <Swipeable renderRightActions={renderRight} overshootRight={false}>
      {children}
    </Swipeable>
  );
};

export const HistoryList = ({ items, onDelete, onToggleFavorite, onSetDescription }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { favorites, rest } = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => Number(b.isFavorited) - Number(a.isFavorited) || b.createdAt.localeCompare(a.createdAt)
    );
    return {
      favorites: sorted.filter((i) => i.isFavorited),
      rest: sorted.filter((i) => !i.isFavorited),
    };
  }, [items]);

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

  const renderItem = (item: CalculationRecord) => (
    <SwipeRow key={item.id} onDelete={() => onDelete(item.id)}>
      <View className="border-b border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        {editingId === item.id ? (
          <View className="mb-2 flex-row items-center gap-2">
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Short description..."
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
              <Text className="text-xs font-semibold text-white">Save</Text>
            </Pressable>
            <Pressable onPress={cancelEdit} className="rounded-lg bg-zinc-200 px-3 py-2 dark:bg-zinc-800">
              <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">X</Text>
            </Pressable>
          </View>
        ) : item.description ? (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={() => startEdit(item)} className="flex-1">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {item.description}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => startEdit(item)}
              hitSlop={8}
              className="rounded-full"
            >
              <Text className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Edit</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => startEdit(item)}>
            <Text className="text-xs italic text-zinc-500 dark:text-zinc-400">
              Tap to add description...
            </Text>
          </Pressable>
        )}

        <Text className="mt-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{item.expression}</Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
            = {item.result}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{timeAgo(item.createdAt)}</Text>
            <Pressable onPress={() => onToggleFavorite(item.id)}>
              <Text className="text-xs font-semibold text-amber-500">
                {item.isFavorited ? "Fav" : "Set"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SwipeRow>
  );

  const sections = [
    favorites.length > 0 ? { title: "Favorites", data: favorites } : null,
    rest.length > 0 ? { title: favorites.length > 0 ? "Recent" : "", data: rest } : null,
  ].filter(Boolean) as { title: string; data: CalculationRecord[] }[];

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      renderSectionHeader={({ section }) =>
        section.title ? <SectionLabel title={section.title} /> : null
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-6 py-16">
          <Text className="mt-3 text-base font-semibold text-zinc-700 dark:text-zinc-200">
            No measurements yet
          </Text>
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Start calculating to build your list!
          </Text>
        </View>
      }
      ListFooterComponent={
        <Text className="px-5 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Swipe left on an item to delete
        </Text>
      }
      stickySectionHeadersEnabled={false}
      className="flex-1 pb-6"
      contentContainerStyle={{ paddingBottom: 24 }}
    />
  );
};
