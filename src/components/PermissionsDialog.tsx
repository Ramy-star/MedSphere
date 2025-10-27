
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { useState, useMemo } from 'react';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Content } from '@/lib/contentService';
import { FolderSelectorDialog } from './FolderSelectorDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useToast } from '@/hooks/use-toast';


type UserRole = {
    role: 'superAdmin' | 'subAdmin';
    scope: 'global' | 'level' | 'semester' | 'subject' | 'folder';
    scopeId?: string;
    scopeName?: string; // For display purposes
    permissions?: string[];
};

type UserProfile = {
    uid: string;
    roles?: UserRole[];
    displayName?: string;
};

const allPermissions = [
    { id: 'canAddContent', label: 'Add Content' },
    { id: 'canEditContent', label: 'Edit Content' },
    { id: 'canDeleteContent', label: 'Delete Content' },
    { id: 'canManageUsers', label: 'Manage Users' },
    { id: 'canAccessQuestionCreator', label: 'Access Questions Creator' },
    { id: 'canAccessAdminPanel', label: 'Access Admin Panel' },
];

export function PermissionsDialog({ user, open, onOpenChange }: { user: UserProfile, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [roles, setRoles] = useState<UserRole[]>(user.roles || []);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { roles });
            toast({ title: "Permissions Saved", description: `Permissions for ${user.displayName} have been updated.` });
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error Saving', description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAddRole = () => {
        const newRole: UserRole = { role: 'subAdmin', scope: 'level', permissions: [] };
        setRoles([...roles, newRole]);
    };
    
    const handleRemoveRole = (index: number) => {
        const newRoles = [...roles];
        newRoles.splice(index, 1);
        setRoles(newRoles);
    };

    const handleRoleChange = (index: number, updatedRole: Partial<UserRole>) => {
        const newRoles = [...roles];
        newRoles[index] = { ...newRoles[index], ...updatedRole };
        setRoles(newRoles);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] max-w-2xl p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
                <div className="p-6">
                    <DialogHeader>
                        <DialogTitle>Edit Permissions for {user.displayName}</DialogTitle>
                        <DialogDescription>
                            Assign roles and specific permissions for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-96 mt-4 pr-4 -mr-4">
                        <div className="space-y-6">
                            {roles.map((role, index) => (
                                <RoleEditor 
                                    key={index}
                                    role={role}
                                    onRemove={() => handleRemoveRole(index)}
                                    onChange={(updatedRole) => handleRoleChange(index, updatedRole)}
                                />
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="mt-6 flex justify-between items-center">
                         <Button variant="outline" onClick={handleAddRole} className="rounded-xl">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Role
                        </Button>
                        <div className="flex gap-2">
                           <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving} className="rounded-xl">
                               {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                               Save Changes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function RoleEditor({ role, onChange, onRemove }: { role: UserRole, onChange: (updatedRole: Partial<UserRole>) => void, onRemove: () => void }) {
    const { data: allItems } = useCollection<Content>('content');
    const [showFolderSelector, setShowFolderSelector] = useState(false);

    const levels = useMemo(() => allItems?.filter(i => i.type === 'LEVEL'), [allItems]);

    const handleScopeSelect = (scopeItem: Content) => {
        onChange({ scopeId: scopeItem.id, scopeName: scopeItem.name });
        setShowFolderSelector(false);
    };
    
    const handlePermissionChange = (permissionId: string, checked: boolean) => {
        const currentPermissions = role.permissions || [];
        const newPermissions = checked
            ? [...currentPermissions, permissionId]
            : currentPermissions.filter(p => p !== permissionId);
        onChange({ permissions: newPermissions });
    };

    return (
        <div className="glass-card p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white">Sub-Admin Role</h4>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={onRemove}>
                    <Trash2 size={16} />
                </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                 <Select value={role.scope} onValueChange={(value) => onChange({ scope: value as UserRole['scope'], scopeId: undefined, scopeName: undefined })}>
                    <SelectTrigger className="bg-slate-800/60 border-slate-700 rounded-xl">
                        <SelectValue placeholder="Select scope..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        <SelectItem value="level">Level</SelectItem>
                        <SelectItem value="semester">Semester</SelectItem>
                        <SelectItem value="subject">Subject</SelectItem>
                        <SelectItem value="folder">Folder</SelectItem>
                    </SelectContent>
                </Select>

                {role.scope !== 'global' && (
                     <Button variant="outline" className="rounded-xl justify-start truncate" onClick={() => setShowFolderSelector(true)}>
                        {role.scopeId ? role.scopeName || role.scopeId : 'Select Item...'}
                    </Button>
                )}
            </div>

            <div className="space-y-2">
                <p className="font-medium text-sm">Permissions:</p>
                <div className="grid grid-cols-2 gap-2">
                    {allPermissions.map(p => (
                        <div key={p.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10">
                            <Checkbox 
                                id={`${role.scopeId || 'global'}-${p.id}`}
                                checked={role.permissions?.includes(p.id)}
                                onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                            />
                             <label htmlFor={`${role.scopeId || 'global'}-${p.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                {p.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {showFolderSelector && (
                 <FolderSelectorDialog 
                    open={showFolderSelector}
                    onOpenChange={setShowFolderSelector}
                    onSelect={handleScopeSelect}
                    actionType={null} // We are just selecting a scope, not performing an action
                 />
            )}
        </div>
    );
}

