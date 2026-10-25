import { BookingHistory } from '@/components/booking-pages';
import { requirePageUser } from '@/server/page-auth';
export default async function Page() {
  await requirePageUser('/my-bookings');
  return <BookingHistory />;
}
