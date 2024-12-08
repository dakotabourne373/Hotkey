import { SavedHotkeys, KEYS, ALL_KEYS, HotkeyNode, HotkeyData } from "./constants";


export const generateUnusedHotkey = (tree: SavedHotkeys, maxDepth = 4): KEYS[] | null => {
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

export const mergeNewHotkey = (tree: SavedHotkeys, keys: KEYS[], parameters: Omit<HotkeyNode, 'isSynced'>) => {
    function addRecursive(currentTree: SavedHotkeys, remainingKeys: KEYS[]): SavedHotkeys | HotkeyNode {
        if (remainingKeys.length === 0) {
            return {
                ...currentTree,
                ...parameters,
                isSynced: false,
            } as HotkeyNode;
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

export const convertStoredHotkeys = (savedHotkeys: SavedHotkeys) => {
    const res: HotkeyData[] = [];

    function recurse(obj: HotkeyNode, path: KEYS[]): void {
        const { icon, desc, isSynced, index } = obj;

        if (icon && desc) {
            res.push({ keys: path, icon, desc, isSynced, index });
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

export const removeHotkey = (tree: SavedHotkeys, keys: KEYS[]): SavedHotkeys => {
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

export const updateHotkey = (tree: SavedHotkeys | HotkeyNode, keys: KEYS[], updates: Partial<HotkeyNode>): SavedHotkeys | HotkeyNode => {
    if (keys.length === 0) {
        return {
            ...tree,
            ...updates
        } as HotkeyNode;
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