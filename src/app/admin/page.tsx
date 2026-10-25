import { Admin } from '@/components/host-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/admin', ['admin']);
  return <Admin />;
}
