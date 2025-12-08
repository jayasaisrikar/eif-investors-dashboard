import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function NotificationsRoot() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation('/dashboard/notifications'); }, []);
  return null;
}
