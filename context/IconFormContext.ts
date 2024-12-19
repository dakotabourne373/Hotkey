import React from "react";

export const IconFormContext = React.createContext<{
  setSelectedIcon: React.Dispatch<React.SetStateAction<string | undefined>>;
  selectedIcon: string | undefined;
}>({
  setSelectedIcon: () => {},
  selectedIcon: undefined,
});
