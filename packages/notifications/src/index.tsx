import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { EventEmitter } from '@/packages/event-system';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';
type NotificationAnimation = 'fade' | 'slide' | 'bounce';

interface NotificationOptions {
  type?: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  position?: NotificationPosition;
  animation?: NotificationAnimation;
  dismissible?: boolean;
  progress?: boolean;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

interface Notification extends NotificationOptions {
  id: string;
  createdAt: Date;
  visible: boolean;
  progress: number;
}

interface NotificationGroup {
  position: NotificationPosition;
  notifications: Notification[];
}

interface NotificationManagerOptions {
  maxNotifications?: number;
  defaultDuration?: number;
  defaultPosition?: NotificationPosition;
  defaultAnimation?: NotificationAnimation;
  defaultType?: NotificationType;
  defaultDismissible?: boolean;
  defaultProgress?: boolean;
}

class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private eventEmitter: EventEmitter;
  private options: Required<NotificationManagerOptions>;

  constructor(options: NotificationManagerOptions = {}) {
    this.options = {
      maxNotifications: 5,
      defaultDuration: 5000,
      defaultPosition: 'top-right',
      defaultAnimation: 'fade',
      defaultType: 'info',
      defaultDismissible: true,
      defaultProgress: true,
      ...options,
    };
    this.eventEmitter = new EventEmitter();
  }

  public show(options: NotificationOptions): string {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = {
      id,
      type: options.type || this.options.defaultType,
      title: options.title,
      message: options.message,
      duration: options.duration || this.options.defaultDuration,
      position: options.position || this.options.defaultPosition,
      animation: options.animation || this.options.defaultAnimation,
      dismissible:
        options.dismissible !== undefined
          ? options.dismissible
          : this.options.defaultDismissible,
      progress:
        options.progress !== undefined
          ? options.progress
          : this.options.defaultProgress,
      icon: options.icon,
      action: options.action,
      onClose: options.onClose,
      onClick: options.onClick,
      className: options.className,
      style: options.style,
      createdAt: new Date(),
      visible: true,
      progress: 0,
    };

    this.notifications.set(id, notification);
    this.eventEmitter.emit('add', notification);

    if (notification.duration > 0) {
      this.startProgressTimer(id);
    }

    this.cleanup();
    return id;
  }

  private startProgressTimer(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    const startTime = Date.now();
    const duration = notification.duration!;
    const interval = 16; // ~60fps

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      if (progress >= 100) {
        clearInterval(timer);
        this.dismiss(id);
      } else {
        this.updateProgress(id, progress);
      }
    }, interval);
  }

  private updateProgress(id: string, progress: number): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.progress = progress;
    this.eventEmitter.emit('update', notification);
  }

  public dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.visible = false;
    this.eventEmitter.emit('update', notification);

    setTimeout(() => {
      this.notifications.delete(id);
      notification.onClose?.();
      this.eventEmitter.emit('remove', notification);
    }, 300); // Animation duration
  }

  public dismissAll(): void {
    for (const id of this.notifications.keys()) {
      this.dismiss(id);
    }
  }

  private cleanup(): void {
    const notifications = Array.from(this.notifications.values());
    if (notifications.length > this.options.maxNotifications) {
      const oldestId = notifications[0].id;
      this.dismiss(oldestId);
    }
  }

  public getNotifications(): NotificationGroup[] {
    const groups: Map<NotificationPosition, Notification[]> = new Map();

    for (const notification of this.notifications.values()) {
      const position = notification.position!;
      if (!groups.has(position)) {
        groups.set(position, []);
      }
      groups.get(position)!.push(notification);
    }

    return Array.from(groups.entries()).map(([position, notifications]) => ({
      position,
      notifications: notifications.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    }));
  }

  public on(event: string, handler: (notification: Notification) => void): () => void {
    return this.eventEmitter.on(event, handler).unsubscribe;
  }

  // Convenience methods
  public info(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({ ...options, type: 'info', message });
  }

  public success(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({ ...options, type: 'success', message });
  }

  public warning(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({ ...options, type: 'warning', message });
  }

  public error(message: string, options: Partial<NotificationOptions> = {}): string {
    return this.show({ ...options, type: 'error', message });
  }
}

// React Components
const NotificationContext = createContext<NotificationManager | null>(null);

export function NotificationProvider({
  children,
  options,
}: {
  children: React.ReactNode;
  options?: NotificationManagerOptions;
}): JSX.Element {
  const [manager] = useState(() => new NotificationManager(options));

  return (
    <NotificationContext.Provider value={manager}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const manager = useContext(NotificationContext);
  if (!manager) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return manager;
}

function NotificationContainer() {
  const manager = useNotifications();
  const [groups, setGroups] = useState<NotificationGroup[]>([]);

  useEffect(() => {
    const handlers = ['add', 'update', 'remove'].map(event =>
      manager.on(event, () => {
        setGroups(manager.getNotifications());
      })
    );

    return () => {
      handlers.forEach(unsubscribe => unsubscribe());
    };
  }, [manager]);

  return (
    <>
      {groups.map(group => (
        <div
          key={group.position}
          className={`notification-group notification-group-${group.position}`}
        >
          {group.notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onDismiss={() => manager.dismiss(notification.id)}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  const {
    type,
    title,
    message,
    animation,
    dismissible,
    progress,
    icon,
    action,
    onClick,
    className,
    style,
    visible,
  } = notification;

  return (
    <div
      className={`notification notification-${type} notification-${animation} ${
        visible ? 'visible' : ''
      } ${className || ''}`}
      style={style}
      onClick={() => onClick?.()}
    >
      {icon && <div className="notification-icon">{icon}</div>}
      <div className="notification-content">
        {title && <div className="notification-title">{title}</div>}
        <div className="notification-message">{message}</div>
        {action && (
          <button
            className="notification-action"
            onClick={e => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        )}
      </div>
      {dismissible && (
        <button
          className="notification-dismiss"
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          ×
        </button>
      )}
      {progress && (
        <div
          className="notification-progress"
          style={{ width: `${notification.progress}%` }}
        />
      )}
    </div>
  );
}

export {
  NotificationManager,
  type NotificationType,
  type NotificationPosition,
  type NotificationAnimation,
  type NotificationOptions,
  type Notification,
};

// Example usage:
// const manager = new NotificationManager({
//   maxNotifications: 5,
//   defaultDuration: 5000,
//   defaultPosition: 'top-right',
// });
//
// manager.show({
//   type: 'success',
//   title: 'Success',
//   message: 'Operation completed successfully',
//   action: {
//     label: 'Undo',
//     onClick: () => console.log('Undo clicked'),
//   },
// });
//
// // React usage
// function MyComponent() {
//   const notifications = useNotifications();
//
//   const handleClick = () => {
//     notifications.success('Operation completed!', {
//       title: 'Success',
//       duration: 3000,
//     });
//   };
//
//   return <button onClick={handleClick}>Show Notification</button>;
// }
