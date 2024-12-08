import { ConnectionBanner } from "@/components/ConnectionBanner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconFormContext } from "@/context/IconFormContext";
import { KEYS } from "@/lib/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { Link } from "expo-router";
import { Info, Plus, icons, } from "lucide-react-native";
import { useState, useEffect, FC, useContext } from "react";
import { Pressable, View, Text, Dimensions } from "react-native";
type HotkeyNode = {
  icon: string;
  desc: string;
} & {
  [key in KEYS]?: SavedHotkeys;
};

type SavedHotkeys = {
  [key in KEYS]?: HotkeyNode
};

type HotkeyData = {
  keys: string[];
  icon: string;
  desc: string;
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

  function recurse(obj: HotkeyNode, path: string[]): void {
    const { icon, desc } = obj;

    if (icon && desc) {
      res.push({ keys: path, icon, desc });
    }

    for (const key in obj) {
      if (key !== 'icon' && key !== 'desc') {
        const value = obj[key as KEYS];
        if (value && typeof value === 'object') recurse(value as HotkeyNode, [...path, key]);
      }
    }
  }

  for (const key in savedHotkeys) {
    const node = savedHotkeys[key as KEYS];
    recurse(node as HotkeyNode, [key]);
  }

  return res;
}

const SpecifiedIcon: FC<{ selectedIcon: string | undefined }> = ({ selectedIcon }) => {
  if (!selectedIcon || !(selectedIcon in icons)) return null;

  const DialogIcon = icons[selectedIcon as unknown as keyof typeof icons];

  return <DialogIcon color='white' />;
}

export default function Index() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [ip, setIp] = useState('192.168.1.102:8686');
  const [serverMessage, setServerMessage] = useState("");
  const [savedHotkeys, setSavedHotkeys] = useState({});
  const [hotkeys, setHotkeys] = useState<HotkeyData[]>([]);
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState<string>();
  const [error, setError] = useState<'icon' | 'desc' | 'fetch'>();

  const { selectedIcon, setSelectedIcon } = useContext(IconFormContext);

  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      const data = await AsyncStorage.getItem('hotkeys');
      if(!data) return {};

      return JSON.parse(data) as SavedHotkeys;
    }

    fetchData().then((data) => {
      if(isSubscribed) setHotkeys(convertStoredHotkeys(data));
    })
    .catch((e) => setError('fetch'));

    return () => {
      isSubscribed = false;
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(`ws://${ip}`);

    ws.onopen = () => {
      console.log("WebSocket connection opened");
      // to send message you can use like that :   ws.send("Hello, server!"); 
      setIsConnected(true); // Update state to reflect successful connection
      setWebsocket(ws);
    };

    ws.onmessage = (e) => {
      console.log("Message from server:", e.data);
      setServerMessage(e?.data); // Store the server message
    };

    ws.onerror = (e) => {
      console.log("WebSocket error:", e);
      setIsConnected(false); // Update state if there is an error
      setWebsocket(undefined);
    };

    ws.onclose = (e) => {
      console.log("WebSocket connection closed:", e.code, e.reason);
      setIsConnected(false); // Update state if the connection closes
      setWebsocket(undefined);
    };

    // Clean up WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  const { width } = Dimensions.get('window');

  return (
    <FlashList
      estimatedItemSize={100}
      numColumns={4}
      data={hotkeys}
      renderItem={({ item }) => (
        <Button
          variant='secondary'
          onPress={() => {
            console.log('HIT');
            websocket?.send('a');
          }}
          style={{ width: width / 5, padding: 8, margin: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#3c3f44', height: 'auto' }}
        >
          <SpecifiedIcon selectedIcon={item.icon} />
          <Label>{item.desc}</Label>
        </Button>
      )}
      ListHeaderComponent={<ConnectionBanner connectedServer={isConnected ? ip : undefined} />}
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
                setHotkeys((prevKeys) => [...prevKeys, { keys: newHotkey, icon: selectedIcon, desc }]);
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
