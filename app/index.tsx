import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { IconFormContext } from "@/context/IconFormContext";
import { KEYS } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { Link } from "expo-router";
import { AlertTriangle, CheckCheck, Info, Plus, icons, } from "lucide-react-native";
import { useState, useEffect, FC, useContext, useRef, useCallback } from "react";
import { View, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type HotkeyNode = {
  icon: string;
  desc: string;
  isSynced: boolean;
} & {
  [key in KEYS]?: SavedHotkeys;
};

type SavedHotkeys = {
  [key in KEYS]?: HotkeyNode
};

type HotkeyData = {
  keys: KEYS[];
  icon: string;
  desc: string;
  isSynced: boolean;
};

const ALL_KEYS = ['F13', 'F14',
  'F15',
  'F16',
  'F17',
  'F18',
  'F19',
  'F20',
  'F21',
  'F22',
  'F23',
  'F24',
] as KEYS[];

const generateUnusedHotkey = (tree: SavedHotkeys, maxDepth = 4): KEYS[] | null => {
  function recurse(currentTree: SavedHotkeys, depth: number, prefix: KEYS[]): KEYS[] | null {
    if (depth === 0) return null;

    for (const key of ALL_KEYS) {
      if (prefix.includes(key)) continue;
      if (!(key in currentTree)) return [...prefix, key];

      const nextLevel = currentTree[key] as SavedHotkeys;
      const result = recurse(nextLevel, depth - 1, [...prefix, key]);

      if (result) return result;
    }

    return null;
  }
  return recurse(tree, maxDepth, []);
}

const mergeNewHotkey = (tree: SavedHotkeys, keys: KEYS[], icon: string, desc: string) => {
  function addRecursive(currentTree: SavedHotkeys, remainingKeys: KEYS[]): SavedHotkeys {
    if (remainingKeys.length === 0) {
      return {
        ...currentTree,
        icon,
        desc,
        isSynced: false,
      };
    }

    const [currentKey, ...restKeys] = remainingKeys;
    const currentNode = currentTree[currentKey] || {};

    return {
      ...currentTree,
      [currentKey]: {
        ...currentNode,
        ...addRecursive(currentNode || {}, restKeys)
      }
    };
  }

  return addRecursive(tree, keys);
}

const convertStoredHotkeys = (savedHotkeys: SavedHotkeys) => {
  const res: HotkeyData[] = [];

  function recurse(obj: HotkeyNode, path: KEYS[]): void {
    const { icon, desc, isSynced } = obj;

    if (icon && desc) {
      res.push({ keys: path, icon, desc, isSynced });
    }

    for (const key in obj) {
      if (key !== 'icon' && key !== 'desc') {
        const value = obj[key as KEYS];
        if (value && typeof value === 'object') recurse(value as HotkeyNode, [...path, key as KEYS]);
      }
    }
  }

  for (const key in savedHotkeys) {
    const node = savedHotkeys[key as KEYS];
    recurse(node as HotkeyNode, [key as KEYS]);
  }

  return res;
}

const removeHotkey = (tree: SavedHotkeys, keys: KEYS[]): SavedHotkeys => {
  if (keys.length === 0) return { ...tree };

  const [currentKey, ...restKeys] = keys;
  const childNode = tree[currentKey];

  if (!childNode) return { ...tree };

  if (restKeys.length === 0) {
    const { icon, desc, isSynced, ...rest } = childNode;
    if (Object.keys(rest).length === 0) {
      const { [currentKey]: _, ...newTree } = tree;
      return newTree;
    }

    return {
      ...tree,
      [currentKey]: rest,
    };
  }

  const updatedChildNode = removeHotkey(childNode as SavedHotkeys, restKeys);
  if (Object.keys(updatedChildNode).length === 0) {
    const { [currentKey]: _, ...newTree } = tree;
    return newTree;
  }

  return {
    ...tree,
    [currentKey]: updatedChildNode,
  };
}

const updateHotkey = (tree: SavedHotkeys | HotkeyNode, keys: KEYS[], updates: Partial<HotkeyNode>): SavedHotkeys | HotkeyNode => {
  if (keys.length === 0) {
    return {
      ...tree,
      ...updates
    };
  }

  const [currentKey, ...restKeys] = keys;
  const currentNode = tree[currentKey];

  const subTree = (typeof currentNode === 'object' && currentNode !== null) ? currentNode : {};
  const updatedNode = updateHotkey(subTree, restKeys, updates);

  return {
    ...tree,
    [currentKey]: updatedNode
  }
}

const createNewWebsocketServer = (ip: string, options: { onopen: WebSocket['onopen']; onmessage: WebSocket['onmessage']; onerror: WebSocket['onerror']; onclose: WebSocket['onclose']; }) => {
  const ws = new WebSocket(`ws://${ip}`);

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
  const [ip, setIp] = useState('192.168.1.102:8686');
  const [serverMessage, setServerMessage] = useState("");
  const [savedHotkeys, setSavedHotkeys] = useState({});
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([]);
  const [open, setOpen] = useState(false);
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
    console.log('DAKOTA-savedHotkeys', savedHotkeys);
  }, [savedHotkeys]);

  useEffect(() => {
    console.log('DAKOTA-hotkeys', hotkeys);
  }, [hotkeys]);

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
        setHotkeys(convertStoredHotkeys(data));
      }
    })
      .catch((e) => setError('fetch'));

    return () => {
      isSubscribed = false;
    }
  }, []);

  const connectToServer = useCallback(() => {
    const ws = createNewWebsocketServer(ip, {
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
  }, [ip]);

  useEffect(() => {
    const ws = connectToServer();
    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws.close();
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
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <Button
              variant='secondary'
              onPress={() => {
                websocket.current?.send(JSON.stringify({ keyCombo: item.keys.join('+'), isSync: !item.isSynced }));
                if (!item.isSynced) {
                  setHotkeys(prevHotkeys => [...prevHotkeys.slice(0, index), { ...item, isSynced: true }, ...prevHotkeys.slice(index + 1)]);
                  setSavedHotkeys((prevSavedKeys) => {
                    const newSavedKeys = updateHotkey(prevSavedKeys, item.keys, {isSynced: true});
                    AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
                    return newSavedKeys;
                  });
                }
              }}
              style={{ width: width / 5, padding: 8, margin: 4, borderRadius: 10, alignItems: 'center', alignContent: 'center', justifyContent: 'space-around', backgroundColor: '#3c3f44', height: 'auto' }}
            >
              <View>
                {item.isSynced ? null : <AlertTriangle color='yellow' size={10} style={{ position: 'absolute', pointerEvents: 'none', right: -18, top: -8 }} />}
                <SpecifiedIcon selectedIcon={item.icon} />
                <Label style={{ pointerEvents: 'none', textAlign: 'center' }}>{item.desc}</Label>
              </View>
            </Button>
          </ContextMenuTrigger>

          <ContextMenuContent align='start' insets={contentInsets} className='w-64 native:w-72'>
            <ContextMenuItem inset>
              <Text>Edit</Text>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem inset onPress={() => {
              const newSavedKeys = removeHotkey(savedHotkeys, item.keys as KEYS[]);
              AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
              setSavedHotkeys(newSavedKeys);
              setHotkeys((prevHotkeys) => [...prevHotkeys.slice(0, index), ...prevHotkeys.slice(index + 1)]);
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
      ListHeaderComponent={<ConnectionBanner connectedServer={isConnected ? ip : undefined} onPress={connectToServer} />}
      ListFooterComponent={
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          !isOpen && setSelectedIcon(undefined);
        }} style={{ width: '100%' }}>
          <DialogTrigger>
            <Button onPress={() => setOpen(true)}>
              <Text>Add new Hotkey!</Text>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a new hotkey</DialogTitle>
              <DialogDescription>
                Select icon, customize your description, then sync the hotkey. That's it!
              </DialogDescription>
            </DialogHeader>
            <View style={{ gap: 16, marginVertical: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Label nativeID="icon">{selectedIcon ? 'Icon selected!' : 'Select an icon'}</Label>
                {selectedIcon ?
                  (<SpecifiedIcon selectedIcon={selectedIcon} />) :
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
                <Label nativeID="desc">Set a description</Label>
                <Input
                  placeholder="Mute Mic"
                  maxLength={40}
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

                const newHotkey = generateUnusedHotkey(savedHotkeys);
                if (!newHotkey) return; // TODO: show an error
                const newSavedKeys = mergeNewHotkey(savedHotkeys, newHotkey, selectedIcon, desc);
                AsyncStorage.setItem('hotkeys', JSON.stringify(newSavedKeys));
                setSavedHotkeys(newSavedKeys);
                setHotkeys((prevKeys) => [...prevKeys, { keys: newHotkey, icon: selectedIcon, desc, isSynced: false }]);
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
