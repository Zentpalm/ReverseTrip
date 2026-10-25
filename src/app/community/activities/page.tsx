import { HostPage } from '@/components/host-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/community/activities', ['host', 'admin']);
  return <HostPage section="activities" />;
}
