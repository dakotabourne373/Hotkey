import React, { FC, useState } from "react";
import { LayoutAnimation, ScrollView, View } from "react-native";
import { HotkeyData } from "@/lib/constants";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { SpecifiedIcon } from "./SpecifiedIcon";
import { Button } from "./ui/button";
import { Text } from "./ui/text";
import { ConnectionBanner } from "./ConnectionBanner";
import DraggableGrid, {
  IDraggableGridProps,
} from "react-native-draggable-grid";
import { Label } from "./ui/label";
import { SquareStack } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export namespace SortableHotkeyList {
  export interface Props {
    data: HotkeyData[];
    connectionBannerProps: ConnectionBanner.Props;
    onFinishSorting: (val: HotkeyData[]) => void;
  }
}

type GridProps = IDraggableGridProps<{ key: string } & HotkeyData>;

export const SortableHotkeyList: FC<SortableHotkeyList.Props> = ({
  data: originalList,
  connectionBannerProps,
  onFinishSorting,
}) => {
  const [data, setData] = useState([
    ...originalList.map((item, index) => ({ ...item, key: `${index}` })),
  ]);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const handleDragRelease: GridProps["onDragRelease"] = (item) => {
    setData(item);
    setScrollEnabled(true);
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        height: "100%",
      }}>
      <ScrollView scrollEnabled={scrollEnabled}>
        <>
          <ConnectionBanner {...connectionBannerProps} />
          <View
            style={{
              flexDirection: "row-reverse",
              justifyContent: "space-between",
              padding: 16,
            }}>
            <Button
              style={{
                borderRadius: 10,
                padding: 2,
                paddingHorizontal: 4,
                alignContent: "center",
                justifyContent: "center",
              }}
              disabled>
              <SquareStack color="black" />
            </Button>
          </View>
        </>
        <DraggableGrid
          onDragItemActive={() => setScrollEnabled(false)}
          data={data}
          numColumns={4}
          onDragRelease={handleDragRelease}
          renderItem={(item) => (
            <View
              key={item.key}
              className="flex items-center justify-center rounded-md h-10 px-4 py-2 native:h-12 native:px-5 native:py-3"
              style={{
                width: "100%",
                flex: 1,
                paddingHorizontal: 16,
                margin: 4,
                borderRadius: 10,
                borderStyle: "dashed",
                borderWidth: 1,
                borderColor: "white",
                alignItems: "center",
                alignContent: "center",
                justifyContent: "space-around",
                backgroundColor: "#3c3f44",
              }}>
              <SpecifiedIcon selectedIcon={item.icon} />
              <Label style={{ pointerEvents: "none", textAlign: "center" }}>
                {item.desc}
              </Label>
            </View>
          )}
        />
      </ScrollView>
      <Button
        style={{ margin: 16 }}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Heavy);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onFinishSorting(data);
        }}>
        <Text>Finish Editing Order</Text>
      </Button>
    </SafeAreaView>
  );
};
