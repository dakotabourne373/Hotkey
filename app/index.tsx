import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { IconFormContext } from "@/context/IconFormContext";
import { HotkeyData, KEYS, SavedHotkeys } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { Link } from "expo-router";
import { AlertTriangle, CheckCheck, Info, Pencil, Plus, icons, } from "lucide-react-native";
import { useState, useEffect, FC, useContext, useRef, useCallback } from "react";
import { View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { convertStoredHotkeys, updateHotkey, removeHotkey, generateUnusedHotkey, mergeNewHotkey } from "@/lib/hotkey-utils";

const createNewWebsocketServer = (ip: string, options: { onopen: WebSocket['onopen']; onmessage: WebSocket['onmessage']; onerror: WebSocket['onerror']; onclose: WebSocket['onclose']; }) => {
  const ws = new WebSocket(`ws://${ip}:8686`);

  ws.onopen = options.onopen;
  ws.onclose = options.onclose;
  ws.onmessage = options.onmessage;
  ws.onerror = options.onerror;

  return ws;
}

const SpecifiedIcon: FC<{ selectedIcon: string | undefined }> = ({ selectedIcon }) => {
  if (!selectedIcon || !(selectedIcon in icons)) return null;

  const DialogIcon = icons[selectedIcon as unknown as keyof typeof icons];

  return <DialogIcon color='white' style={{ alignSelf: 'center' }} />;
}

export default function Index() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const websocket = useRef<WebSocket>(null);
  const [ip, setIp] = useState('192.168.1.102');
  const [serverMessage, setServerMessage] = useState("");
  const [savedHotkeys, setSavedHotkeys] = useState({});
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingData, setEditingData] = useState<HotkeyData>();
  const [desc, setDesc] = useState<string>();
  const [error, setError] = useState<'icon' | 'desc' | 'fetch'>();

  const { selectedIcon, setSelectedIcon } = useContext(IconFormContext);

  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 12,
    right: 12,
  };

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      const data = await AsyncStorage.getItem('hotkeys');
      if (!data) return {};

      return JSON.parse(data) as SavedHotkeys;
    }

    fetchData().then((data) => {
      if (isSubscribed) {
        setSavedHotkeys(data);
        setHotkeys(convertStoredHotkeys(data).sort((a, b) => b.index - a.index));
      }
    })
      .catch((e) => setError('fetch'));

    return () => {
      isSubscribed = false;
    }
  }, []);

  const connectToServer = useCallback((newIp: string) => {
    setIp(newIp);
    AsyncStorage.setItem('computer-ip', newIp);
    const ws = createNewWebsocketServer(newIp, {
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
      },
      onmessage: (e: WebSocketMessageEvent) => {
        console.log("Message from server:", e.data);
        setServerMessage(e?.data); // Store the server message
      },
      onopen: () => {
        console.log("WebSocket connection opened");
        // to send message you can use like that :   ws.send("Hello, server!"); 
        setIsConnected(true); // Update state to reflect successful connection
        // @ts-ignore
        websocket.current = ws;
      },
    });

    return ws;
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    AsyncStorage.getItem('computer-ip')
      .then((savedIp) => {
        if (!savedIp) return;
        ws = connectToServer(savedIp);
      });
    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws?.close();
    };
  }, [connectToServer]);

  const { width } = Dimensions.get('window');

  return (
    <FlashList
      keyboardShouldPersistTaps='always'
      estimatedItemSize={100}
      numColumns={4}
      data={hotkeys}
      renderItem={({ item, index }) => (
        <ContextMenu style={{ flexGrow: 1, height: '100%' }}>
          <ContextMenuTrigger style={{ height: '100%', backgroundColor: 'blue' }} asChild onLongPress={() => {
            impactAsync(ImpactFeedbackStyle.Heavy);
          }}>
            <Button
              variant='secondary'
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Medium);
                websocket.current?.send(JSON.stringify({ keyCombo: item.keys.join('+'), isSync: !item.isSynced }));
                if (!item.isSynced) {
                  setHotkeys(prevHotkeys => [...prevHotkeys.slice(0, index), { ...item, isSynced: true }, ...prevHotkeys.slice(index + 1)]);
                  setSavedHotkeys((prevSavedKeys) => {
                    const newSavedKeys = updateHotkey(prevSavedKeys, item.keys, { isSynced: true });
                    AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
                    return newSavedKeys;
                  });
                }
              }}
              style={{ width: width / 4.5, margin: 4, borderRadius: 10, alignItems: 'center', alignContent: 'center', justifyContent: 'space-around', backgroundColor: '#3c3f44', height: '100%', pointerEvents: 'box-only' }}
            >
              {item.isSynced ? null : <AlertTriangle color='yellow' size={10} style={{ position: 'absolute', right: -18, top: -8 }} />}
              <SpecifiedIcon selectedIcon={item.icon} />
              <Label style={{ pointerEvents: 'none', textAlign: 'center' }}>{item.desc}</Label>
            </Button>
          </ContextMenuTrigger>

          <ContextMenuContent align='start' insets={contentInsets} className='w-64 native:w-72'>
            <ContextMenuItem inset onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setSelectedIcon(item.icon);
              setDesc(item.desc);
              setEditingData({ ...item, index });
              setEditing(true);
              setOpen(true)
            }}>
              <Text>Edit</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem inset onPress={() => {
              const newSavedKeys = removeHotkey(savedHotkeys, item.keys as KEYS[]);
              AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
              setSavedHotkeys(newSavedKeys);
              setHotkeys((prevHotkeys) => [...prevHotkeys.slice(0, index), ...prevHotkeys.slice(index + 1)]);
              impactAsync(ImpactFeedbackStyle.Rigid);
            }}>
              <Text>Delete</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem inset style={{ flexDirection: 'row' }} disabled>
              {item.isSynced ? <CheckCheck color='green' /> : <AlertTriangle color='yellow' />}
              <Text>{item.isSynced ? 'Hotkey synced!' : 'You\'ll need to resync this hotkey'}</Text>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      )}
      ListHeaderComponent={<ConnectionBanner connectedServer={ip} isConnected={isConnected} onPress={connectToServer} />}
      ListFooterComponent={
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          !isOpen && setSelectedIcon(undefined);
        }} style={{ width: '100%', marginTop: 32 }}>
          <DialogTrigger>
            <Button onPress={() => { setOpen(true); setEditing(false) }}>
              <Text>Add new Hotkey!</Text>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit a hotkey' : 'Add a new hotkey'}</DialogTitle>
              <DialogDescription>
                {editing ? "Edit icon or description, then save! That's it!" : "Select icon, customize your description, then sync the hotkey. That's it!"}
              </DialogDescription>
            </DialogHeader>
            <View style={{ gap: 16, marginVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Label nativeID="icon">{selectedIcon ? 'Icon selected!' : 'Select an icon'}</Label>
                {selectedIcon ?
                  (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ backgroundColor: '#3c3f44', borderRadius: 10, padding: 2, paddingHorizontal: 4, alignContent: 'center', justifyContent: 'center' }}>
                        <SpecifiedIcon selectedIcon={selectedIcon} />
                      </View>
                      <>
                        <Link asChild href='/modal' aria-labelledby="icon">
                          <Button>
                            <Pencil color='black' />
                          </Button>
                        </Link>
                      </>
                    </View>) :
                  (
                    <Link asChild href='/modal' aria-labelledby="icon">
                      <Button>
                        <Plus color='black' />
                      </Button>
                    </Link>
                  )
                }
              </View>
              <View style={{ gap: 8 }}>
                <Label nativeID="desc">{editing ? 'Edit the description' : 'Set a description'}</Label>
                <Input
                  defaultValue={editingData?.desc}
                  placeholder="Mute Mic"
                  maxLength={15}
                  aria-labelledby="desc"
                  onChangeText={setDesc}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Label>See instructions for Recording the hotkey</Label>
                <Info color='white' />
              </View>
            </View>
            <DialogFooter>
              <DialogClose asChild onPress={() => {
                if (!selectedIcon) {
                  setError('icon');
                  return;
                }
                if (!desc) {
                  setError('desc');
                  return;
                }
                if (editing && !editingData) return; // TO-DO: show an error

                if (editing && editingData) {
                  setHotkeys(prevHotkeys => [...prevHotkeys.slice(0, editingData.index), { ...editingData, icon: selectedIcon, desc }, ...prevHotkeys.slice(editingData.index + 1)]);
                  setSavedHotkeys((prevSavedKeys) => {
                    const newSavedKeys = updateHotkey(prevSavedKeys, editingData.keys, { desc, icon: selectedIcon });
                    AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
                    return newSavedKeys;
                  });
                } else {
                  const newHotkey = generateUnusedHotkey(savedHotkeys);
                  if (!newHotkey) return; // TODO: show an error
                  const newSavedKeys = mergeNewHotkey(savedHotkeys, newHotkey, { icon: selectedIcon, desc, index: hotkeys.length });
                  AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
                  setSavedHotkeys(newSavedKeys);
                  setHotkeys((prevKeys) => [...prevKeys, { keys: newHotkey, icon: selectedIcon, desc, isSynced: false, index: prevKeys.length }]);
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
        </Dialog>}
    />
  );
}

{/* <Pressable onPress={() => {
        console.log('HIT');
        websocket?.send('a');
      }}>
        <Image source={require('@/assets/images/a.png')} style={{ width: 200, height: 200 }} />
      </Pressable> */}
{/* <Button onPress={() => {
        // console.log('DAKOTA-before', savedHotkeys)
        const newHotkey = generateUnusedHotkey(savedHotkeys);
        console.log('DAKOTA-newHotkey', newHotkey);
        if (!newHotkey) return; // TODO: show an error
        const newSavedKeys = mergeNewHotkey(savedHotkeys, newHotkey, 'test-icon', 'test-desc');
        setSavedHotkeys(newSavedKeys);
        console.log('DAKOTA-after', JSON.stringify(newSavedKeys, null, 2));
      }}>
        <Text>Generate new hotkey</Text>
      </Button> */}
{/* <Link href='/modal' asChild>
        <Button>
          <Text>Go to Icon Screen</Text>
        </Button>
      </Link> */}
