import * as React from 'react';
import { Pressable, Text } from 'react-native';
import { Settings } from '@/lib/icons/Settings';
import { LinearGradient } from 'expo-linear-gradient';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';

export namespace ConnectionBanner {
    export interface Props {
        connectedServer: string | undefined;
    }
}

export const ConnectionBanner: React.FC<ConnectionBanner.Props> = ({ connectedServer }) => {
    const [open, setOpen] = React.useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen} style={{width: '100%'}}>
            <DialogTrigger>
                <LinearGradient colors={connectedServer ? ['#42f5c8', '#42cbf5'] : ['#f54251', '#f542e3']}>
                    <Pressable style={{ flexDirection: 'row', gap: 8, padding: 16, alignItems: 'center', justifyContent: 'center' }} onPress={() => setOpen(true)}>
                        <Text>{connectedServer ? `connected to ${connectedServer}` : 'not connected'}</Text>
                        <Settings color='black' />
                    </Pressable>
                </LinearGradient>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit server ip</DialogTitle>
                    <DialogDescription>
                        Put in the ip of the computer running the server. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>
                            <Text>Save</Text>
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
