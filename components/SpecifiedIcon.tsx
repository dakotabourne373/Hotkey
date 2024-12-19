import { icons } from "lucide-react-native";
import { FC } from "react";

export const SpecifiedIcon: FC<{ selectedIcon: string | undefined }> = ({
  selectedIcon,
}) => {
  if (!selectedIcon || !(selectedIcon in icons)) return null;

  // eslint-disable-next-line import/namespace
  const DialogIcon = icons[selectedIcon as unknown as keyof typeof icons];

  return <DialogIcon color="white" style={{ alignSelf: "center" }} />;
};
