/**
 * Sidebar Component
 * Conversation list and management
 * Features:
 * - List of saved conversations
 * - New conversation button
 * - Search conversations
 * - Delete conversations
 * - Export/import conversations
 * - Responsive drawer on mobile
 */

import React, { useState } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';

const Sidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onExportConversations,
  onImportConversations,
  isMobileOpen,
  onMobileToggle,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = React.useRef(null);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    const query = searchQuery.toLowerCase();
    const title = (conv.title || 'New Conversation').toLowerCase();
    const hasMatch = title.includes(query);

    // Also search in first message
    if (!hasMatch && conv.messages?.length > 0) {
      const firstMessage = conv.messages[0].content.toLowerCase();
      return firstMessage.includes(query);
    }

    return hasMatch;
  });

  // Group conversations by date
  const groupedConversations = filteredConversations.reduce((groups, conv) => {
    const date = new Date(conv.createdAt || Date.now());
    let label = 'Older';

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else if (isThisWeek(date)) {
      label = 'This Week';
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(conv);
    return groups;
  }, {});

  const handleExport = () => {
    onExportConversations();
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result);
          onImportConversations(data);
        } catch (err) {
          console.error('Failed to import:', err);
          alert('Failed to import conversations. Invalid file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const formatConversationTime = (timestamp) => {
    return format(new Date(timestamp), 'MMM d, h:mm a');
  };

  const getConversationPreview = (conv) => {
    if (conv.messages?.length > 0) {
      return conv.messages[0].content.substring(0, 60) + '...';
    }
    return 'No messages yet';
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversations
          </h2>
          <button
            onClick={onMobileToggle}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* New conversation button */}
        <button
          onClick={onNewConversation}
          className="w-full btn btn-primary flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          New Conversation
        </button>

        {/* Search */}
        <div className="relative mt-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {Object.entries(groupedConversations).map(([label, convs]) => (
          <div key={label} className="mb-4">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {label}
            </h3>
            <div className="space-y-1">
              {convs.map((conv) => (
                <div
                  key={conv.id}
                  className={`
                    group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer
                    transition-colors
                    ${
                      conv.id === currentConversationId
                        ? 'bg-primary-100 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-700'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <ChatBubbleLeftIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {conv.title || 'New Conversation'}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-opacity"
                        aria-label="Delete conversation"
                      >
                        <TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {getConversationPreview(conv)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatConversationTime(conv.updatedAt || conv.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredConversations.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 btn btn-ghost text-xs flex items-center justify-center gap-1"
            title="Export conversations"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 btn btn-ghost text-xs flex items-center justify-center gap-1"
            title="Import conversations"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-0
          w-80 transform transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${className}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile menu button */}
      {!isMobileOpen && (
        <button
          onClick={onMobileToggle}
          className="fixed bottom-4 left-4 z-40 lg:hidden p-3 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 transition-colors"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
      )}
    </>
  );
};

export default Sidebar;
