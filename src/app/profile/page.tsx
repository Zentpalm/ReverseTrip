import { Profile } from '@/components/auth-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/profile');
  return <Profile />;
}
