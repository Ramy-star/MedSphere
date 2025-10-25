
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
import { Content } from '@/lib/contentService';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';


type TreeNode = Content & { children?: TreeNode[] };

function buildTree(items: Content[], itemMap: Map<string, TreeNode>): TreeNode[] {
    const roots: TreeNode[] = [];
    
    // First pass: add all items to the map
    items.forEach(item => {
        if (item.type !== 'FILE' && item.type !== 'LINK' && item.type !== 'INTERACTIVE_QUIZ' && item.type !== 'INTERACTIVE_EXAM' && item.type !== 'INTERACTIVE_FLASHCARD') {
            if (!itemMap.has(item.id)) {
                itemMap.set(item.id, { ...item, children: [] });
            }
        }
    });

    // Second pass: build the tree structure
    itemMap.forEach(node => {
        if (node.parentId && itemMap.has(node.parentId)) {
            const parent = itemMap.get(node.parentId)!;
            if (parent.children && !parent.children.some(child => child.id === node.id)) {
                 parent.children.push(node);
            }
        } else if (node.parentId === null) {
            if (!roots.some(root => root.id === node.id)) {
                roots.push(node);
            }
        }
    });

    // Sort children for all nodes
    itemMap.forEach(node => {
        if (node.children) {
            node.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    });
    
    // Sort root nodes
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return roots;
}

const getIconForType = (item: Content) => {
    if (item.metadata?.iconURL) {
      return (
        <div className="relative w-5 h-5 shrink-0">
          <Image
            src={item.metadata.iconURL}
            alt={item.name}
            fill
            className="object-cover rounded-sm pointer-events-none select-none"
            sizes="20px"
          />
        </div>
      );
    }
    switch (item.type) {
      case 'LEVEL':
        return <Layers className="h-5 w-5 text-slate-400 shrink-0" />;
      case 'SEMESTER':
        return <Calendar size={18} className="text-green-400" />;
      case 'SUBJECT':
         const SubjectIcon = (item.iconName && allSubjectIcons[item.iconName]) || Book;
         return <SubjectIcon className={cn("h-5 w-5 shrink-0", item.color || "text-yellow-400")} />;
      case 'FOLDER':
      default:
        return <FolderIcon className="h-5 w-5 text-yellow-400 shrink-0" />;
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
    onToggle: (id: string, hasChildren: boolean) => void;
    onLinkClick: (path: string) => void;
    level: number;
}) => {
    const isNodeOpen = openItems.has(node.id);
    const isNodeActive = activePath.has(node.id);
    const hasChildren = !!(node.children && node.children.length > 0);
    
    let path: string;
    if (node.type === 'LEVEL') {
        path = `/level/${encodeURIComponent(node.name)}`;
    } else {
        path = `/folder/${node.id}`;
    }

    const getActiveColor = () => {
        if (!isNodeActive) return 'text-slate-300';
        switch (node.type) {
            case 'LEVEL': return 'text-blue-400';
            case 'SEMESTER': return 'text-green-400';
            case 'SUBJECT':
            case 'FOLDER':
                return 'text-yellow-400';
            default: return 'text-white';
        }
    };

    return (
        <div className="w-full">
            <div 
                className={cn('group p-1.5 rounded-xl w-full text-slate-300 flex items-center justify-between')}
                style={{ paddingLeft: `${level * 12 + 10}px`}}
            >
                <div className="flex-1 flex items-center gap-3 overflow-hidden">
                    <button onClick={() => onToggle(node.id, hasChildren)} className="p-1 rounded-full hover:bg-white/10" disabled={!hasChildren}>
                        {hasChildren ? (
                            <ChevronDown
                                className={cn(
                                "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                                isNodeOpen ? 'rotate-0' : '-rotate-90'
                                )}
                                aria-hidden="true"
                            />
                        ) : <div className="w-4 h-4" />}
                    </button>
                    
                    <div 
                        onClick={() => onLinkClick(path)}
                        onMouseEnter={() => prefetcher.prefetchChildren(node.id)}
                        className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer p-1 rounded-md"
                    >
                        {getIconForType(node)}
                        <span className={cn("font-medium whitespace-nowrap leading-none text-sm truncate transition-colors", getActiveColor())}>
                            {node.name}
                        </span>
                    </div>
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

  const itemMap = useMemo(() => new Map<string, TreeNode>(), []);

  const tree = useMemo(() => {
    if (!allItems) return [];
    // Clear and rebuild map to ensure it's fresh
    itemMap.clear();
    const folderItems = allItems.filter(item => item.type !== 'FILE' && item.type !== 'LINK' && item.type !== 'INTERACTIVE_QUIZ' && item.type !== 'INTERACTIVE_EXAM' && item.type !== 'INTERACTIVE_FLASHCARD');
    return buildTree(folderItems, itemMap);
  }, [allItems, itemMap]);

  const [openItems, setOpenItems] = useState(() => {
      if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('sidebarOpenItems');
          if (saved) {
              return new Set<string>(JSON.parse(saved));
          }
      }
      return new Set<string>();
  });
  const [activePath, setActivePath] = useState(new Set<string>());

  useEffect(() => {
      localStorage.setItem('sidebarOpenItems', JSON.stringify(Array.from(openItems)));
  }, [openItems]);

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
        const level = allItems.find(l => l.type === 'LEVEL' && l.name === levelName);
        if (level) currentId = level.id;
    }

    if (!currentId) {
        setActivePath(new Set());
        return;
    }

    const newActivePath = new Set<string>();
    let tempItem = itemMap.get(currentId);

    while (tempItem) {
        newActivePath.add(tempItem.id);
        tempItem = tempItem.parentId ? itemMap.get(tempItem.parentId) : undefined;
    }
    setActivePath(newActivePath);

    // Only auto-open path if local storage is empty (first visit logic)
    const savedOpenItems = localStorage.getItem('sidebarOpenItems');
    if (!savedOpenItems) {
        const newOpenItems = new Set<string>();
        let itemToOpen = itemMap.get(currentId);
        while(itemToOpen) {
            if (itemToOpen.parentId) {
                newOpenItems.add(itemToOpen.parentId);
            }
            itemToOpen = itemToOpen.parentId ? itemMap.get(itemToOpen.parentId) : undefined;
        }
        setOpenItems(newOpenItems);
    }
  }, [pathname, allItems, itemMap]);

  useEffect(() => {
    if(allItems) {
      findAndOpenActivePath();
    }
  }, [pathname, allItems, findAndOpenActivePath]);

  const handleToggle = (id: string, hasChildren: boolean) => {
    if (!hasChildren) return;
    setOpenItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
            newSet.delete(id);
             // Recursively close all children
            const closeChildren = (itemId: string) => {
                const item = itemMap.get(itemId);
                if (item && item.children) {
                    item.children.forEach(child => {
                        newSet.delete(child.id);
                        closeChildren(child.id);
                    });
                }
            };
            closeChildren(id);
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
     return tree.map((level) => {
       const isPathActive = activePath.has(level.id);
       const path = `/level/${encodeURIComponent(level.name)}`;
       const shortName = level.name.replace('Level', 'Lvl');
       return (
            <motion.button
                key={level.id}
                onClick={() => handleLinkClick(path)}
                onMouseEnter={() => prefetcher.prefetchChildren(level.id)}
                className={cn(
                  'p-2.5 rounded-2xl w-full flex items-center justify-center text-slate-300 transition-colors',
                  isPathActive ? 'bg-blue-500/20 text-blue-300' : 'hover:bg-transparent'
                )}
                transition={{ duration: 0.2 }}
                layout
            >
              <span className="font-semibold text-sm">{shortName}</span>
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
                    animate={{ opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] } }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2, ease: "easeIn" } }}
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
        
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onOpenChange(!open)} 
                        className="text-white hover:bg-slate-700 hidden sm:flex w-8 h-8 rounded-full -mr-1"
                    >
                        <Menu size={20} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>{open ? 'Collapse sidebar' : 'Expand sidebar'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
      
      <AnimatePresence mode="wait">
        <motion.nav
          key={open ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.3 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-1 no-scrollbar"
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
  const EXPANDED_WIDTH = 288;
  const COLLAPSED_WIDTH = 90;

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
        width: isDesktopSidebarOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
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
