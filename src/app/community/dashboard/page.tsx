import { HostPage } from '@/components/host-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/community/dashboard', ['host', 'admin']);
  return <HostPage />;
}
