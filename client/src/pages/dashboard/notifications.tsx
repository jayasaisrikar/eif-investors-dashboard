import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout-dashboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

function formatNotificationTitle(n: any) {
  switch (n.type) {
    case 'meeting_reschedule_requested':
      return n.data?.title ?? 'Reschedule requested';
    case 'meeting_reschedule_accepted':
      return n.data?.title ?? 'Reschedule accepted';
    case 'meeting_reschedule_declined':
      return n.data?.title ?? 'Reschedule declined';
    default:
      return n.data?.title ?? n.type ?? 'Notification';
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const fetchNotifications = async (p = 0) => {
    try {
      const res = await fetch(`/api/notifications?limit=${limit}&offset=${p*limit}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notifications');
      const data: any[] = await res.json();
      if (p === 0) setNotifications(data);
      else setNotifications(prev => [...prev, ...data]);
      setHasMore(data.length === limit);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      toast({ title: 'Unable to load notifications', description: String(err) });
    }
  };

  useEffect(() => { fetchNotifications(0); }, []);

  const markReadState = async (id: string, isRead: boolean) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_read: isRead }) });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setNotifications(prev => prev.map(n => n.id === id ? updated : n));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('update notification failed', err);
    }
  };

  const deleteNotificationById = async (id: string) => {
    if (!confirm('Delete this notification? This action cannot be undone.')) return;
    try {
      const r = await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!r.ok) throw new Error('Failed to delete');
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('delete failed', err);
      toast({ title: 'Delete failed', description: String(err) });
    }
  };

  const markAllAsRead = async () => {
    try {
      const r = await fetch('/api/notifications/mark-all-read', { method: 'POST', credentials: 'include' });
      if (!r.ok) throw new Error('Failed to mark all read');
      // refresh
      fetchNotifications(0);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch (err) {
      console.error('mark all read failed', err);
      toast({ title: 'Action failed', description: String(err) });
    }
  };

  const onClickNotification = async (n: any) => {
    try {
      if (!n.is_read) {
        await markReadState(n.id, true);
      }
      // navigate to related resource, else show details
      if (n.data?.meeting_request_id) {
        setLocation(`/dashboard/meetings`);
        return;
      }
      // fallback to no-op: show a toast
      toast({ title: formatNotificationTitle(n), description: n.data?.message ?? '' });
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = (unreadOnly ? notifications.filter(n => !n.is_read) : notifications).filter(n => {
    if (!search) return true;
    const t = (n.data?.message ?? '') + ' ' + (n.data?.title ?? '') + ' ' + (n.type ?? '');
    return t.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setUnreadOnly(s => !s)}>{unreadOnly ? 'Show All' : 'Show Unread'}</Button>
            <Button size="sm" onClick={markAllAsRead}>Mark all as read</Button>
          </div>
        </div>

        <div className="bg-card border rounded-md p-3">
          <div className="flex items-center gap-2 mb-4 justify-between">
            <div className="flex items-center gap-2">
              <Input placeholder="Search notifications" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(n => (
                <TableRow key={n.id} className={!n.is_read ? 'font-medium bg-muted/10' : ''}>
                  <TableCell>{formatNotificationTitle(n)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                        <span>{n.data?.message ?? n.type}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{n.data?.details}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => onClickNotification(n)}>{n.is_read ? 'Open' : 'Open & Mark read'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => markReadState(n.id, !n.is_read)}>{n.is_read ? 'Mark unread' : 'Mark read'}</Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteNotificationById(n.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-center">
            {hasMore ? (
              <Button onClick={() => { setPage(p => { const np = p + 1; fetchNotifications(np); return np; }); }}>Load more</Button>
            ) : (
              <span className="text-sm text-muted-foreground">No more notifications</span>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
