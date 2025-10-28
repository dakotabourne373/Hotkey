import { Portal } from "@rn-primitives/portal";
import { LoaderIcon } from "lucide-react-native";
import React, { FC, useEffect, useId } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

const AnimatedLoaderIcon = createAnimatedComponent(LoaderIcon);

export const Loader: FC<{ visible: boolean }> = ({ visible }) => {
  const id = useId();

  const rotationDegree = useSharedValue(0);

  useEffect(() => {
    // Animate the rotation continuously
    rotationDegree.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }), // Spin 360 degrees in 2 seconds
      -1, // Repeat indefinitely
      false, // Do not reverse
    );
  }, [rotationDegree, visible]);

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotationDegree.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Portal name={`loader-${id}`}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
            opacity: 0.4,
          },
        ]}>
        <Animated.View style={animatedStyles}>
          <AnimatedLoaderIcon width={48} height={48} color="#fff" />
        </Animated.View>
      </View>
    </Portal>
  );
};
