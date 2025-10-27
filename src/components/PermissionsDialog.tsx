

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
import { useState, useMemo, useEffect } from 'react';
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
import { cn } from '@/lib/utils';


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

const permissionGroups = {
    'Add Content Menu': [
        { id: 'canAddClass', label: 'Add Class' },
        { id: 'canAddFolder', label: 'Add Folder' },
        { id: 'canUploadFile', label: 'Upload File' },
        { id: 'canAddLink', label: 'Add Link' },
        { id: 'canCreateFlashcard', label: 'Create Flashcard' },
    ],
    'Item Options Menu': [
        { id: 'canRename', label: 'Rename' },
        { id: 'canDelete', label: 'Delete' },
        { id: 'canMove', label: 'Move' },
        { id: 'canCopy', label: 'Copy' },
        { id: 'canChangeIcon', label: 'Change Icon' },
        { id: 'canToggleVisibility', label: 'Toggle Visibility' },
        { id: 'canUpdateFile', label: 'Update File' },
        { id: 'canCreateQuestions', label: 'Create Questions (AI)' },
    ],
    'Page Access': [
        { id: 'canAccessQuestionCreator', label: 'Questions Creator Page' },
        { id: 'canAccessAdminPanel', label: 'Admin Panel (Full Access)' },
    ]
};



export function PermissionsDialog({ user, open, onOpenChange }: { user: UserProfile | null, open: boolean, onOpenChange: (open: boolean) => void }) {
    const [roles, setRoles] = useState<UserRole[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (user && open) {
            setRoles(user.roles && Array.isArray(user.roles) ? JSON.parse(JSON.stringify(user.roles)) : []);
        }
    }, [user, open]);

    const handleSave = async () => {
        if (!user) return;
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
        const newRole: UserRole = { role: 'subAdmin', scope: 'global', permissions: [] };
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
    
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[90vw] max-w-2xl p-0 border-slate-700 rounded-2xl bg-slate-900/80 backdrop-blur-xl shadow-lg text-white flex flex-col h-[80vh]">
                <div className="p-6 pb-4">
                    <DialogHeader>
                        <DialogTitle>Edit Permissions for {user.displayName}</DialogTitle>
                        <DialogDescription>
                            Assign roles and specific permissions for this user.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <ScrollArea className="flex-1 px-6">
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
                <div className="p-6 pt-4 mt-auto border-t border-slate-800 flex justify-between items-center">
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
            </DialogContent>
        </Dialog>
    );
}

function RoleEditor({ role, onChange, onRemove }: { role: UserRole, onChange: (updatedRole: Partial<UserRole>) => void, onRemove: () => void }) {
    const [showFolderSelector, setShowFolderSelector] = useState(false);

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
        <div className="bg-black/20 border border-white/10 p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-white capitalize">{role.scope} Admin Role</h4>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/20" onClick={onRemove}>
                    <Trash2 size={16} />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {role.scopeId ? role.scopeName || role.scopeId : `Select ${role.scope}...`}
                    </Button>
                )}
            </div>
            
            <div className="space-y-4 pt-2">
                {Object.entries(permissionGroups).map(([groupName, permissions]) => (
                    <div key={groupName}>
                        <h5 className="font-medium text-sm text-slate-300 mb-3 border-b border-white/10 pb-2">{groupName}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                           {permissions.map(p => (
                                <div key={p.id} className="flex items-center space-x-2 p-1 rounded-md">
                                    <Checkbox 
                                        id={`${role.scopeId || 'global'}-${p.id}`}
                                        checked={role.permissions?.includes(p.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                                    />
                                     <label htmlFor={`${role.scopeId || 'global'}-${p.id}`} className="text-sm font-medium leading-none cursor-pointer text-slate-200">
                                        {p.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {showFolderSelector && (
                 <FolderSelectorDialog 
                    open={showFolderSelector}
                    onOpenChange={setShowFolderSelector}
                    onSelect={handleScopeSelect}
                    actionType={null} 
                 />
            )}
        </div>
    );
}
