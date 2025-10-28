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

export namespace ConnectionBanner {
  export interface Props {
    connectedServer: string | undefined;
    connectedPort: string | undefined;
    isConnected: boolean;
    onPress: (ip: string, port: string) => void;
  }
}

export const ConnectionBanner: React.FC<ConnectionBanner.Props> = ({
  connectedServer,
  connectedPort,
  isConnected,
  onPress,
}) => {
  const [open, setOpen] = React.useState(false);
  const [ipAddress, setIpAddress] = React.useState<string | undefined>(
    connectedServer,
  );
  const [port, setPort] = React.useState<string | undefined>(connectedPort);
  const [ipError, setIpError] = React.useState(false);
  const [portError, setPortError] = React.useState(false);

  const handleSubmit = (event: GestureResponderEvent) => {
    setIpError(false);
    setPortError(false);
    const newPort = port || "8686";
    if (!ipAddress) {
      console.log("ip address is undefined");
      event.preventDefault();
      setIpError(true);
      return;
    }
    if (newPort.length >= 5) {
      console.log("port error");
      event.preventDefault();
      setPortError(true);
      return;
    }

    onPress(ipAddress, newPort);
  };

  React.useEffect(() => {
    if (!connectedServer && ipAddress && !ipAddress.match(ipCheck)) {
      setIpError(true);
    } else {
      setIpError(false);
    }
  }, [ipAddress, connectedServer]);

  React.useEffect(() => {
    if (connectedServer) setIpAddress(connectedServer);
  }, [connectedServer]);
  React.useEffect(() => {
    if (connectedPort) setPort(connectedPort);
  }, [connectedPort]);

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
                ? `connected to ${connectedServer}:${connectedPort}`
                : "not connected"}
            </Text>
            <Settings color="black" />
          </Pressable>
        </LinearGradient>
      </DialogTrigger>
      <DialogContent style={{ marginBottom: 120 }}>
        <DialogHeader>
          <DialogTitle>Edit server connection settings</DialogTitle>
          <DialogDescription>
            Put in the displayed ip and port of the computer running the server.
            Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <>
          <Label nativeID="ip-label">Enter ip</Label>
          <Input
            value={ipAddress}
            placeholder="192.168.1.200..."
            onChangeText={setIpAddress}
            aria-labelledby="ip-label"
            aria-invalid={ipError}
            aria-errormessage="ip-error"
            keyboardType="numeric"
          />
          {ipError ? (
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
                The ip you submitted is invalid, please resubmit with a valid
                ip.
              </Label>
            </Animated.View>
          ) : null}
        </>
        <>
          <Label nativeID="port-label">Enter port</Label>
          <Input
            value={port}
            placeholder="8686"
            onChangeText={setPort}
            aria-labelledby="port-label"
            aria-invalid={portError}
            aria-errormessage="port-error"
            keyboardType="numeric"
          />
          {portError ? (
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
              <Label nativeID="port-error" style={{ color: "red" }}>
                The port you submitted is invalid, please resubmit with a valid
                port number.
              </Label>
            </Animated.View>
          ) : null}
        </>
        <DialogFooter>
          <DialogClose asChild onPress={handleSubmit}>
            <Button disabled={ipError || portError}>
              <Text>Save</Text>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
