import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout-dashboard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function CompanyPublicProfile() {
  const [match, params] = useRoute('/company/:userId');
  const userId = params?.userId as string | undefined;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${userId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('failed to fetch company');
        const data = await res.json();
        if (mounted) setCompany(data);

        // record a profile view event; server will infer actor from JWT if present
        await fetch('/api/events/profile_view', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target_user_id: userId }),
        });
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Could not load company profile.' });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [userId]);

  const handleDownload = async (fileName?: string, url?: string) => {
    if (!userId) return;
    try {
      // record download event; server will infer downloader_user_id if authenticated
      await fetch('/api/events/deck_download', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userId, file_name: fileName ?? null }),
      });

      toast({ title: 'Download recorded', description: fileName ? `${fileName} download recorded.` : 'Download recorded.' });

      // if url provided, open it
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not record download.' });
    }
  };

  if (!userId) return <div>Invalid company</div>;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{company?.company_name ?? company?.firm ?? 'Company'}</h1>
            <p className="text-muted-foreground">{company?.tagline ?? ''}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setLocation('/auth')}>Request Meeting</Button>
            <Button onClick={() => handleDownload(company?.links?.pitch_deck?.name, company?.links?.pitch_deck?.url)} className="bg-secondary">Download Deck</Button>
          </div>
        </div>

        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Company description and details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {company?.description ?? 'No description provided.'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-white/5">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Sector</div>
                <div className="font-medium">{company?.sector ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Stage</div>
                <div className="font-medium">{company?.stage ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">HQ</div>
                <div className="font-medium">{company?.hq_location ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Funding Ask</div>
                <div className="font-medium">{company?.capital_sought ?? '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
