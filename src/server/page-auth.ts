import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, sessionUser } from './auth';
import type { Role } from '../lib/types';
export async function requirePageUser(path: string, roles?: Role[]) {
  const user = await sessionUser((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login?next=' + encodeURIComponent(path));
  if (roles && !roles.includes(user.role)) redirect('/profile');
  return user;
}
