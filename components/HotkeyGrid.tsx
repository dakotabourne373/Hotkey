import React, { useState, useEffect } from "react";
import { View, FlatList, ScrollView } from "react-native";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import DraggableGrid from "react-native-draggable-grid";
import { HotkeyData } from "@/lib/constants";
import { SpecifiedIcon } from "./SpecifiedIcon";
import { Button, buttonVariants } from "./ui/button";
import { Label } from "./ui/label";
import { AlertTriangle } from "lucide-react-native";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

interface HotkeyGridProps {
  data: HotkeyData[];
  isSorting: boolean;
  onPressItem: (item: HotkeyData, index: number) => void;
  renderContextMenu: (item: HotkeyData, index: number) => React.ReactNode;
  onDragRelease?: (data: HotkeyData[]) => void;
  ListHeaderComponent: React.ReactElement | null;
}

export const HotkeyGrid: React.FC<HotkeyGridProps> = ({
  data,
  isSorting,
  onPressItem,
  renderContextMenu,
  onDragRelease,
  ListHeaderComponent,
}) => {
  const [sortableData, setSortableData] = useState<
    (HotkeyData & { key: string })[]
  >([]);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    // Convert data to the format expected by DraggableGrid
    setSortableData(data.map((item, index) => ({ ...item, key: `${index}` })));
  }, [data]);

  const handleDragRelease = (items: any[]) => {
    setScrollEnabled(true);
    if (onDragRelease) {
      // Convert back to regular data format
      const newData = items.map((item) => ({
        ...item,
        // Remove the 'key' property which was only needed for DraggableGrid
        key: undefined,
      }));
      onDragRelease(newData);
    }
  };

  // Shared item renderer for both normal and sortable modes
  const renderItem = (item: HotkeyData, index: number) => {
    const itemStyle = {
      flex: 1 / 4,
      margin: 4,
      borderRadius: 10,
      alignItems: "center" as const,
      alignContent: "center" as const,
      justifyContent: "space-around" as const,
      backgroundColor: "#3c3f44",
      height: "100%",
      minHeight: 80,
    } as const;

    return isSorting ? (
      <View
        key={index}
        style={{
          ...itemStyle,
          borderStyle: "dashed",
          borderWidth: 1,
          borderColor: "white",
          flexGrow: 1,
        }}>
        {!item.isSynced && (
          <AlertTriangle
            color="yellow"
            size={10}
            style={{ position: "absolute", right: 2, top: 2 }}
          />
        )}
        <SpecifiedIcon selectedIcon={item.icon} />
        <Label style={{ textAlign: "center", pointerEvents: "none" }}>
          {item.desc}
        </Label>
      </View>
    ) : (
      <ContextMenu key={index} style={{ flexGrow: 1, height: "100%" }}>
        <ContextMenuTrigger
          asChild
          onLongPress={() => {
            impactAsync(ImpactFeedbackStyle.Heavy);
          }}>
          <Button
            variant="secondary"
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium);
              onPressItem(item, index);
            }}
            style={itemStyle}>
            {!item.isSynced && (
              <AlertTriangle
                color="yellow"
                size={10}
                style={{ position: "absolute", right: 2, top: 2 }}
              />
            )}
            <SpecifiedIcon selectedIcon={item.icon} />
            <Label style={{ pointerEvents: "none", textAlign: "center" }}>
              {item.desc}
            </Label>
          </Button>
        </ContextMenuTrigger>
        {renderContextMenu(item, index)}
      </ContextMenu>
    );
  };

  if (isSorting) {
    return (
      <ScrollView style={{ flex: 1 }} scrollEnabled={scrollEnabled}>
        {ListHeaderComponent}
        <DraggableGrid
          onDragItemActive={() => setScrollEnabled(false)}
          data={sortableData}
          numColumns={4}
          onDragRelease={handleDragRelease}
          renderItem={(item) => renderItem(item, parseInt(item.key))}
        />
      </ScrollView>
    );
  }

  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      numColumns={4}
      data={data}
      keyExtractor={(item) => item.keys.join("-")}
      renderItem={({ item, index }) => renderItem(item, index)}
      ListHeaderComponent={ListHeaderComponent}
    />
  );
};
