'use client';
import Link from 'next/link';
import { Empty } from '@/components/ui';
import { useApp } from '@/components/providers';
export default function NotFound() {
  const { t } = useApp();
  return (
    <div className="container page">
      <Empty
        title={t('not_found')}
        action={
          <Link className="btn" href="/activities">
            {t('explore')}
          </Link>
        }
      />
    </div>
  );
}
