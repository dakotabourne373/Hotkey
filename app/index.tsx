import { ConnectionBanner } from "@/components/ConnectionBanner";
import { KEYS } from "@/lib/constants";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import { Pressable, View } from "react-native";

export default function Index() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [ip, setIp] = useState('192.168.1.102:8686');
  const [serverMessage, setServerMessage] = useState("");

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

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        width: '100%'
      }}
    >
      <ConnectionBanner connectedServer={isConnected ? ip : undefined} />
      <Pressable onPress={() => {
          console.log('HIT');
          websocket?.send('a');
        }}>
        <Image source={require('@/assets/images/a.png')} style={{width: 200, height: 200}} />
      </Pressable>
    </View>
  );
}
