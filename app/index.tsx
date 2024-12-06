import { Image, ImageBackground } from "expo-image";
import { useState, useEffect } from "react";
import { Button, Pressable, Text, View } from "react-native";

const ip = 'ws://192.168.1.102:8686'

export default function Index() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [websocket, setWebsocket] = useState<WebSocket>();
  const [serverMessage, setServerMessage] = useState("");

  useEffect(() => {
    const ws = new WebSocket(ip);

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
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Pressable onPress={() => {
          console.log('HIT');
          websocket?.send('a');
        }}>
        <Image source={require('@/assets/images/a.png')} style={{width: 200, height: 200}} />
      </Pressable>
      <Text>{isConnected ? `connected to ${ip}` : 'not connected'}</Text>
    </View>
  );
}
