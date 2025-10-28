import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Button } from "@/components/ui/button";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { IconFormContext } from "@/context/IconFormContext";
import { HotkeyData, KEYS, SavedHotkeys } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link } from "expo-router";
import { AlertTriangle, CheckCheck, Pencil, Plus } from "lucide-react-native";
import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { View, AppState, LayoutAnimation } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import {
  convertStoredHotkeys,
  updateHotkey,
  removeHotkey,
  generateUnusedHotkey,
  mergeNewHotkey,
} from "@/lib/hotkey-utils";
import { SpecifiedIcon } from "@/components/SpecifiedIcon";
import { HotkeyGrid } from "@/components/HotkeyGrid";
import { Loader } from "@/components/Loader";
import React, { useMemo } from "react";

const createNewWebsocketServer = (
  ip: string,
  port = "8686",
  options: {
    onopen: WebSocket["onopen"];
    onmessage: WebSocket["onmessage"];
    onerror: WebSocket["onerror"];
    onclose: WebSocket["onclose"];
  },
) => {
  const ws = new WebSocket(`ws://${ip}:${port}`);

  ws.onopen = options.onopen;
  ws.onclose = options.onclose;
  ws.onmessage = options.onmessage;
  ws.onerror = options.onerror;

  return ws;
};

export default function Index() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);
  const websocket = useRef<WebSocket>(null);
  const [ip, setIp] = useState<string>();
  const [port, setPort] = useState<string>();
  const [, setServerMessage] = useState("");
  const [savedHotkeys, setSavedHotkeys] = useState({});
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingData, setEditingData] = useState<HotkeyData>();
  const [desc, setDesc] = useState<string>();
  const [, setError] = useState<"icon" | "desc" | "fetch">();
  const [isSorting, setIsSorting] = useState(false);

  const { selectedIcon, setSelectedIcon } = useContext(IconFormContext);

  const insets = useSafeAreaInsets();
  const contentInsets = useMemo(
    () => ({
      top: insets.top,
      bottom: insets.bottom,
      left: 12,
      right: 12,
    }),
    [insets.top, insets.bottom],
  );

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      const data = await AsyncStorage.getItem("hotkeys");
      if (!data) return {};

      return JSON.parse(data) as SavedHotkeys;
    };

    fetchData()
      .then((data) => {
        if (isSubscribed) {
          setSavedHotkeys(data);
          setHotkeys(
            convertStoredHotkeys(data).sort((a, b) => a.index - b.index),
          );
        }
      })
      .catch((e) => setError("fetch"));

    return () => {
      isSubscribed = false;
    };
  }, []);

  const connectToServer = useCallback((newIp: string, newPort: string) => {
    websocket.current?.close();
    setIsConnecting(true);
    setIsConnected(false);
    setIp(newIp);
    setPort(newPort);
    const ws = createNewWebsocketServer(newIp, newPort, {
      onclose: (e) => {
        console.log("WebSocket connection closed:", e.code, e.reason);
        setIsConnected(false); // Update state if the connection closes
        // @ts-ignore
        websocket.current = null;
      },
      onerror: (e) => {
        console.log("WebSocket error:", e);
        setIsConnected(false); // Update state if there is an error
        // @ts-ignore
        websocket.current = null;
        setIsConnecting(false);
      },
      onmessage: (e: WebSocketMessageEvent) => {
        console.log("Message from server:", e.data);
        setServerMessage(e?.data); // Store the server message
      },
      onopen: () => {
        console.log("WebSocket connection opened");
        // to send message you can use like that :   ws.send("Hello, server!");
        AsyncStorage.setItem("computer-ip", newIp);
        AsyncStorage.setItem("server-port", newPort);
        setIsConnected(true); // Update state to reflect successful connection
        setIsConnecting(false);
        // @ts-ignore
        websocket.current = ws;
      },
    });

    return ws;
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    setIsConnecting(true);
    AsyncStorage.getItem("computer-ip").then((savedIp) => {
      if (!savedIp) {
        setIsConnecting(false);
        return;
      }
      AsyncStorage.getItem("server-port").then((savedPort) => {
        ws = connectToServer(savedIp, savedPort || "8686");
      });
    });
    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws?.close();
    };
  }, [connectToServer]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active" && !isConnected && ip && port) {
        connectToServer(ip, port);
      } else if (state === "inactive" || state === "background") {
        // Close the WebSocket connection when the app is inactive
        websocket.current?.close();
        setIsConnected(false);
      }
    });

    return () => {
      listener.remove();
    };
  }, [isConnected, ip, connectToServer, port]);

  const handleFinishedSorting = (newList: HotkeyData[]) => {
    setIsSorting(false);
    let copySavedHotkeys = { ...savedHotkeys };
    setHotkeys(
      newList.map((item, index) => {
        copySavedHotkeys = updateHotkey(copySavedHotkeys, item.keys, { index });
        return {
          ...item,
          index,
        };
      }),
    );
    setSavedHotkeys(copySavedHotkeys);
    AsyncStorage.setItem("hotkeys", JSON.stringify(copySavedHotkeys));
  };

  const handlePressHotkey = useCallback((item: HotkeyData, index: number) => {
    websocket.current?.send(
      JSON.stringify({
        keyCombo: item.keys.join("+"),
        isSync: !item.isSynced,
      }),
    );

    if (!item.isSynced) {
      setHotkeys((prevHotkeys) => [
        ...prevHotkeys.slice(0, index),
        { ...item, isSynced: true },
        ...prevHotkeys.slice(index + 1),
      ]);

      setSavedHotkeys((prevSavedKeys) => {
        const newSavedKeys = updateHotkey(prevSavedKeys, item.keys, {
          isSynced: true,
        });
        AsyncStorage.setItem("hotkeys", JSON.stringify(newSavedKeys));
        return newSavedKeys;
      });
    }
  }, []);

  const renderContextMenu = useCallback(
    (item: HotkeyData, index: number) => {
      return (
        <ContextMenuContent
          align="start"
          insets={contentInsets}
          className="w-64 native:w-72">
          <ContextMenuItem
            inset
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedIcon(item.icon);
              setDesc(item.desc);
              setEditingData({ ...item, index });
              setEditing(true);
              setOpen(true);
            }}>
            <Text>Edit</Text>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            inset
            onPress={() => {
              const newSavedKeys = removeHotkey(
                savedHotkeys,
                item.keys as KEYS[],
              );
              AsyncStorage.setItem("hotkeys", JSON.stringify(newSavedKeys));
              setSavedHotkeys(newSavedKeys);
              setHotkeys((prevHotkeys) => [
                ...prevHotkeys.slice(0, index),
                ...prevHotkeys.slice(index + 1),
              ]);
              impactAsync(ImpactFeedbackStyle.Rigid);
            }}>
            <Text>Delete</Text>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem inset style={{ flexDirection: "row" }} disabled>
            {item.isSynced ? (
              <CheckCheck color="green" />
            ) : (
              <AlertTriangle color="yellow" />
            )}
            <Text>
              {item.isSynced
                ? "Hotkey synced!"
                : "You'll need to resync this hotkey"}
            </Text>
          </ContextMenuItem>
        </ContextMenuContent>
      );
    },
    [contentInsets, savedHotkeys, setSelectedIcon],
  );

  const headerComponent = (
    <>
      <ConnectionBanner
        connectedServer={ip}
        connectedPort={port}
        isConnected={isConnected}
        onPress={connectToServer}
      />
      {/* <View
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
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );
            setIsSorting(!isSorting);
          }}>
          <SquareStack color="black" />
        </Button>
      </View> */}
    </>
  );

  const footerComponent = isSorting ? (
    <Button
      style={{ marginHorizontal: 16, marginTop: 16, marginBottom: -16 }}
      onPress={() => {
        impactAsync(ImpactFeedbackStyle.Heavy);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        handleFinishedSorting(hotkeys);
      }}>
      <Text>Finish Editing Order</Text>
    </Button>
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <HotkeyGrid
        data={hotkeys}
        isSorting={isSorting}
        onPressItem={handlePressHotkey}
        renderContextMenu={renderContextMenu}
        onDragRelease={handleFinishedSorting}
        ListHeaderComponent={headerComponent}
      />

      {footerComponent}
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          !isOpen && setSelectedIcon(undefined);
        }}
        style={{ margin: 16 }}>
        <DialogTrigger>
          {isSorting ? null : (
            <Button
              onPress={() => {
                setOpen(true);
                setEditing(false);
              }}>
              <Text>Add new Hotkey!</Text>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit a hotkey" : "Add a new hotkey"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Edit icon or description, then save! That's it!"
                : "Select icon, customize your description, then sync the hotkey. That's it!"}
            </DialogDescription>
          </DialogHeader>
          <View style={{ gap: 16, marginVertical: 20 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Label nativeID="icon">
                {selectedIcon ? "Icon selected!" : "Select an icon"}
              </Label>
              {selectedIcon ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: "#3c3f44",
                      borderRadius: 10,
                      padding: 2,
                      paddingHorizontal: 4,
                      alignContent: "center",
                      justifyContent: "center",
                    }}>
                    <SpecifiedIcon selectedIcon={selectedIcon} />
                  </View>
                  <>
                    <Link asChild href="/modal" aria-labelledby="icon">
                      <Button>
                        <Pencil color="black" />
                      </Button>
                    </Link>
                  </>
                </View>
              ) : (
                <Link asChild href="/modal" aria-labelledby="icon">
                  <Button>
                    <Plus color="black" />
                  </Button>
                </Link>
              )}
            </View>
            <View style={{ gap: 8 }}>
              <Label nativeID="desc">
                {editing ? "Edit the description" : "Set a description"}
              </Label>
              <Input
                defaultValue={editingData?.desc}
                placeholder="Mute Mic"
                maxLength={15}
                aria-labelledby="desc"
                onChangeText={setDesc}
              />
            </View>
            {/* <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <Label>See instructions for Recording the hotkey</Label>
              <Info color="white" />
            </View> */}
          </View>
          <DialogFooter>
            <DialogClose
              asChild
              onPress={() => {
                if (!selectedIcon) {
                  setError("icon");
                  return;
                }
                if (!desc) {
                  setError("desc");
                  return;
                }
                if (editing && !editingData) return; // TO-DO: show an error

                if (editing && editingData) {
                  setHotkeys((prevHotkeys) => [
                    ...prevHotkeys.slice(0, editingData.index),
                    { ...editingData, icon: selectedIcon, desc },
                    ...prevHotkeys.slice(editingData.index + 1),
                  ]);
                  setSavedHotkeys((prevSavedKeys) => {
                    const newSavedKeys = updateHotkey(
                      prevSavedKeys,
                      editingData.keys,
                      { desc, icon: selectedIcon },
                    );
                    AsyncStorage.setItem(
                      "hotkeys",
                      JSON.stringify(newSavedKeys),
                    );
                    return newSavedKeys;
                  });
                } else {
                  const newHotkey = generateUnusedHotkey(savedHotkeys);
                  if (!newHotkey) return; // TODO: show an error
                  const newSavedKeys = mergeNewHotkey(savedHotkeys, newHotkey, {
                    icon: selectedIcon,
                    desc,
                    index: hotkeys.length,
                  });
                  AsyncStorage.setItem("hotkeys", JSON.stringify(newSavedKeys));
                  setSavedHotkeys(newSavedKeys);
                  setHotkeys((prevKeys) => [
                    ...prevKeys,
                    {
                      keys: newHotkey,
                      icon: selectedIcon,
                      desc,
                      isSynced: false,
                      index: prevKeys.length,
                    },
                  ]);
                }
                setEditing(false);
                setEditingData(undefined);
              }}>
              <Button>
                <Text>Save</Text>
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Loader visible={!isConnected && isConnecting} />
    </SafeAreaView>
  );
}
