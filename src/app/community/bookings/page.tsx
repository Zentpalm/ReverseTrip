import { HostPage } from '@/components/host-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/community/bookings', ['host', 'admin']);
  return <HostPage section="bookings" />;
}
