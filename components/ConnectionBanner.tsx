import * as React from "react";
import { GestureResponderEvent, Pressable, Text } from "react-native";
import { Settings } from "@/lib/icons/Settings";
import { ipCheck } from "@/lib/regex";
import { LinearGradient } from "expo-linear-gradient";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Info } from "lucide-react-native";
import Animated, { FlipInXDown, FlipOutXDown } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

export namespace ConnectionBanner {
  export interface Props {
    connectedServer: string | undefined;
    isConnected: boolean;
    onPress: (string: string) => void;
  }
}

export const ConnectionBanner: React.FC<ConnectionBanner.Props> = ({
  connectedServer,
  isConnected,
  onPress,
}) => {
  const [open, setOpen] = React.useState(false);
  const [ipAddress, setIpAddress] = React.useState<string>();
  const [error, setError] = React.useState(false);

  const handleSubmit = (event: GestureResponderEvent) => {
    setError(false);
    if (!ipAddress) {
      console.log("ip address is undefined");
      event.preventDefault();
      setError(true);
      return;
    }
    AsyncStorage.setItem("computer-ip", ipAddress);
    onPress(ipAddress);
  };

  React.useEffect(() => {
    if (!ipAddress?.match(ipCheck)) {
      setError(true);
    } else {
      setError(false);
    }
  }, [ipAddress]);

  return (
    <Dialog open={open} onOpenChange={setOpen} style={{ width: "100%" }}>
      <DialogTrigger>
        <LinearGradient
          colors={
            isConnected ? ["#42f5c8", "#42cbf5"] : ["#f54251", "#f542e3"]
          }>
          <Pressable
            style={{
              flexDirection: "row",
              gap: 8,
              padding: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => setOpen(true)}>
            <Text>
              {isConnected
                ? `connected to ${connectedServer}:8686`
                : "not connected"}
            </Text>
            <Settings color="black" />
          </Pressable>
        </LinearGradient>
      </DialogTrigger>
      <DialogContent style={{ marginBottom: 120 }}>
        <DialogHeader>
          <DialogTitle>Edit server ip</DialogTitle>
          <DialogDescription>
            Put in the ip of the computer running the server. Click save when
            you're done.
          </DialogDescription>
        </DialogHeader>
        <>
          <Label nativeID="ip-label">Enter ip</Label>
          <Input
            defaultValue={ipAddress}
            placeholder="192.168.1.200..."
            onChangeText={setIpAddress}
            aria-labelledby="ip-label"
            aria-invalid={error}
            aria-errormessage="ip-error"
          />
          {error ? (
            <Animated.View
              entering={FlipInXDown}
              exiting={FlipOutXDown}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                alignContent: "flex-start",
                gap: 4,
              }}>
              <Info color="red" size={16} style={{ marginTop: 3 }} />
              <Label nativeID="ip-error" style={{ color: "red" }}>
                The ip you submitted is invalid, please resubmit with a valid ip
              </Label>
            </Animated.View>
          ) : null}
        </>
        <DialogFooter>
          <DialogClose asChild onPress={handleSubmit}>
            <Button disabled={error}>
              <Text>Save</Text>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
