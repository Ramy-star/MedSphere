
'use client';

import {
  Calendar,
  ChevronDown,
  GraduationCap,
  Layers,
  Menu,
  Folder as FolderIcon,
  Book,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Content, contentService } from '@/lib/contentService';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useCollection } from '@/firebase/firestore/use-collection';
import { cn } from '@/lib/utils';
import { prefetcher } from '@/lib/prefetchService';
import { useSidebarStore } from '@/hooks/use-sidebar-store';
import { allSubjectIcons } from '@/lib/file-data';


type TreeNode = Content & { children?: TreeNode[] };

function buildTree(items: Content[]): TreeNode[] {
    const itemMap = new Map<string, TreeNode>(items.map(item => [item.id, { ...item, children: [] }]));
    const roots: TreeNode[] = [];

    items.forEach(item => {
        // We only care about items that are not files/links for the sidebar tree
        if (item.type === 'FILE' || item.type === 'LINK') return;

        const node = itemMap.get(item.id)!;
        if (item.parentId && itemMap.has(item.parentId)) {
            const parent = itemMap.get(item.parentId)!;
            if (!parent.children) parent.children = [];
            
            const parentChildren = parent.children as TreeNode[];
            // Ensure no duplicates
            if (!parentChildren.some(child => child.id === node.id)) {
                parentChildren.push(node);
            }
        } else if(item.parentId === null) {
            // Ensure no duplicate roots
            if (!roots.some(root => root.id === node.id)) {
                roots.push(node);
            }
        }
    });

    // Sort children by 'order' property for all nodes
    itemMap.forEach(node => {
        if (node.children) {
            node.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    });
    
    // Sort roots as well
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return roots;
}

const getIconForType = (item: Content) => {
    switch (item.type) {
      case 'LEVEL':
        return <Layers className="h-5 w-5 text-slate-400 shrink-0" />;
      case 'SEMESTER':
        return <Calendar size={18} className="text-green-400" />;
      case 'SUBJECT':
         const SubjectIcon = (item.iconName && allSubjectIcons[item.iconName]) || Book;
         return <SubjectIcon className={cn("h-5 w-5 shrink-0", item.color || "text-gray-300")} />;
      case 'FOLDER':
      default:
        return <FolderIcon className="h-5 w-5 text-yellow-500/80 shrink-0" />;
    }
};

const TreeItem = ({
    node,
    openItems,
    activePath,
    onToggle,
    onLinkClick,
    level = 0
}: {
    node: TreeNode;
    openItems: Set<string>;
    activePath: Set<string>;
    onToggle: (id: string) => void;
    onLinkClick: (path: string) => void;
    level: number;
}) => {
    const isNodeOpen = openItems.has(node.id);
    const isNodeActive = activePath.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    let path: string;
    if (node.type === 'LEVEL') {
        path = `/level/${encodeURIComponent(node.name)}`;
    } else {
        path = `/folder/${node.id}`;
    }

    return (
        <div className="w-full">
            <div 
                className={cn(
                    'group p-1.5 rounded-xl w-full text-slate-300 hover:text-white flex items-center justify-between',
                     isNodeActive && 'bg-white/10 text-white'
                )}
                style={{ paddingLeft: `${level * 12 + 10}px`}}
            >
                {hasChildren ? (
                     <button onClick={() => onToggle(node.id)} className="p-1 -ml-1 rounded-md hover:bg-white/10">
                        <ChevronDown
                            className={cn(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                            isNodeOpen ? 'rotate-0' : '-rotate-90'
                            )}
                            aria-hidden="true"
                        />
                    </button>
                ) : (
                    // Placeholder for alignment
                    <div className="w-6 h-6" />
                )}

                <div 
                    onClick={() => onLinkClick(path)}
                    onMouseEnter={() => prefetcher.prefetchChildren(node.id)}
                    className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer p-1 rounded-md"
                >
                    {getIconForType(node)}
                    <span className="font-medium whitespace-nowrap leading-none text-sm truncate">
                        {node.name}
                    </span>
                </div>
            </div>
            
            <AnimatePresence initial={false}>
                {isNodeOpen && hasChildren && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: 'auto' },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        {node.children!.map((child) => (
                           <TreeItem
                                key={child.id}
                                node={child}
                                openItems={openItems}
                                activePath={activePath}
                                onToggle={onToggle}
                                onLinkClick={onLinkClick}
                                level={level + 1}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};


function SidebarContent({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const { data: allItems } = useCollection<Content>('content');

  const { tree, itemMap } = useMemo(() => {
    if (!allItems) {
      return { tree: [], itemMap: new Map() };
    }
    const map = new Map(allItems.map(item => [item.id, item]));
    const folderItems = allItems.filter(item => item.type !== 'FILE' && item.type !== 'LINK');
    const treeData = buildTree(folderItems);
    return { tree: treeData, itemMap: map };
  }, [allItems]);

  const [openItems, setOpenItems] = useState(new Set<string>());
  const [activePath, setActivePath] = useState(new Set<string>());

  const findAndOpenActivePath = useCallback(() => {
    if (!allItems || pathname === '/') {
        setActivePath(new Set());
        return;
    }

    const pathParts = pathname.split('/');
    let currentId: string | null = null;
    
    if (pathParts[1] === 'folder' && pathParts.length >= 3) {
        currentId = pathParts[2];
    } else if (pathParts[1] === 'level' && pathParts.length >= 3) {
        const levelName = decodeURIComponent(pathParts[2]);
        const level = allItems.find(l => l.name === levelName);
        if (level) {
            currentId = level.id;
        }
    }

    if (!currentId) {
        setActivePath(new Set());
        return;
    }

    const newActivePath = new Set<string>();
    const newOpenItems = new Set<string>(openItems);
    let tempItem = itemMap.get(currentId);

    while (tempItem) {
        newActivePath.add(tempItem.id);
        if (tempItem.parentId) {
            newOpenItems.add(tempItem.parentId);
        }
        tempItem = tempItem.parentId ? itemMap.get(tempItem.parentId) : undefined;
    }

    setActivePath(newActivePath);
    // Only expand the path if the sidebar is open, to avoid changing state unnecessarily
    if(open) {
      setOpenItems(newOpenItems);
    }
  }, [pathname, open, allItems, itemMap, openItems]);

  useEffect(() => {
    if(allItems) {
      findAndOpenActivePath();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, allItems, open]);

  const handleToggle = (id: string) => {
    setOpenItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        return newSet;
    });
  };

  const handleLinkClick = (path: string) => {
    router.push(path);
    if (isMobile) {
      onOpenChange(false);
    }
  };

  const collapsedViewContent = useMemo(() => {
     if (!tree) return null;
     return tree.map((level, index) => {
       const isPathActive = activePath.has(level.id);
       const path = `/level/${encodeURIComponent(level.name)}`;
       const shortName = level.name.replace('Level', 'Lvl');
       return (
            <motion.button
                key={level.id}
                onClick={() => handleLinkClick(path)}
                onMouseEnter={() => prefetcher.prefetchChildren(level.id)}
                className={cn(
                  'p-2.5 rounded-2xl w-full flex items-center justify-center text-slate-300 hover:text-white',
                  isPathActive && 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white'
                )}
                whileHover={{ backgroundColor: isPathActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}
                transition={{ duration: 0.2 }}
                layout
            >
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-slate-400 shrink-0" />
                <span className="font-semibold text-sm">{shortName}</span>
              </div>
            </motion.button>
       )
     })
  }, [tree, activePath, handleLinkClick]);


  return (
    <div className='flex flex-col h-full'>
      <div className={cn("flex items-center mb-4 h-10 px-2.5", open ? "justify-between" : "justify-center")}>
        <AnimatePresence>
            {open && (
                <motion.div
                    className="flex items-center gap-3 overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <div className="p-1.5 rounded-xl bg-gradient-to-br from-green-400/30 to-green-600/30">
                        <GraduationCap className="text-green-300 flex-shrink-0" size={20} />
                    </div>
                    <h2 className="font-bold text-white whitespace-nowrap">
                        Academic Structure
                    </h2>
                </motion.div>
            )}
        </AnimatePresence>
        
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(!open)} 
            className="text-white hover:bg-slate-700 hidden sm:flex w-8 h-8 rounded-full -mr-1"
        >
            <Menu size={20} />
        </Button>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.nav
          key={open ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-1"
        >
          {open ? (
            tree.map(node => (
              <TreeItem 
                key={node.id} 
                node={node} 
                openItems={openItems}
                activePath={activePath}
                onToggle={handleToggle}
                onLinkClick={handleLinkClick}
                level={0} 
              />
            ))
          ) : (
            collapsedViewContent
          )}
        </motion.nav>
      </AnimatePresence>
    </div>
  )
}


export function Sidebar({ open, setOpen }: { open?: boolean, setOpen?: (open: boolean) => void }) {
  const isMobile = useIsMobile();
  const { isDesktopSidebarOpen, setDesktopSidebarOpen } = useSidebarStore();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="glass-card p-4 !w-72">
           <SidebarContent open={true} onOpenChange={setOpen!} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <motion.aside
      animate={{
        width: isDesktopSidebarOpen ? 288 : 120,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 40,
      }}
      className={cn("relative h-full flex-col glass-card p-4 hidden md:flex z-10")}
    >
      <SidebarContent open={isDesktopSidebarOpen} onOpenChange={setDesktopSidebarOpen} />
    </motion.aside>
  );
}
