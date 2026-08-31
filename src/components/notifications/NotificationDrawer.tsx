import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDateTimeIST } from '../../lib/dateUtils';
import { Bell, Check, Trash2, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    userNotifications,
    unreadNotifCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    setActiveRequest,
    setCurrentPage,
    requests,
  } = useApp();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          id="notification-drawer-panel"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">Notifications</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {unreadNotifCount > 0 ? `${unreadNotifCount} unread alerts` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifCount > 0 && (
                <button
                  id="mark-all-read-btn"
                  onClick={markAllNotificationsAsRead}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                id="close-notifications-btn"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {userNotifications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">Updates on requests and tickets will appear here.</p>
              </div>
            ) : (
              userNotifications.map(notif => (
                <div
                  key={notif.id}
                  id={`notif-item-${notif.id}`}
                  onClick={() => {
                    if (!notif.isRead) markNotificationAsRead(notif.id);
                    if (notif.requestId) {
                      const req = requests.find(r => r.id === notif.requestId);
                      if (req) {
                        setActiveRequest(req);
                        onClose();
                      }
                    }
                  }}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !notif.isRead
                      ? 'bg-indigo-50/70 border-indigo-200/80 dark:bg-indigo-950/30 dark:border-indigo-900/60'
                      : 'bg-white border-slate-200/80 dark:bg-slate-800/60 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          !notif.isRead ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-transparent'
                        }`}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                          {notif.title}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                          <span>{formatDateTimeIST(notif.createdAt)}</span>
                          {notif.requestId && (
                            <span className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-medium">
                              View Ticket <ExternalLink className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      id={`clear-notif-${notif.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        clearNotification(notif.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-opacity"
                      title="Dismiss"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">
              Live Alert Center
            </span>
            <button
              onClick={() => {
                onClose();
                setCurrentPage('notifications');
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              <span>Open Full Logs Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
