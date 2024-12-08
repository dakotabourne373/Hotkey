import { Input } from "@/components/ui/input";
import { FlashList } from "@shopify/flash-list";
import { icons } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import tags from '@/lib/icons/tags.json';

export default function Modal() {
    const [search, setSearch] = useState<string>();

    const filteredIcons = useMemo(() => {
        if (!search) return Object.values(icons);
        const tagKeys = Object.keys(tags).filter((tag) => tag.includes(search.toLowerCase())) as Array<keyof typeof tags>;
        const searchedIcons = new Set(tagKeys.reduce<string[]>((acc, cur) => [
            ...acc, ...tags[cur].filter((tag) => !acc.includes(tag))
        ], []));
        return Object.values(icons).filter(icon => searchedIcons.has(icon.displayName || icon.name));
    }, [search]);

    return (
        <FlashList
            style={{ alignItems: 'center' }}
            estimatedItemSize={63}
            ListHeaderComponent={(
                <View style={{ margin: 16 }}>
                    <Input
                        placeholder="Try searching for an icon!"
                        onChangeText={setSearch}
                        autoCapitalize="none"
                    />
                </View>
            )}
            numColumns={6}
            data={filteredIcons}
            keyExtractor={(item) => item.displayName || 'unknown'}
            renderItem={({ item: Item }) => (
                <Pressable style={{ padding: 16, margin: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#3c3f44' }}>
                    <Item color='white' />
                </Pressable>
            )}
        />
    );
}