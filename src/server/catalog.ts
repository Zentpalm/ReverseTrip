import { connection, ensureDatabase, isDemo, type Database } from './db';
import type { Activity, Catalog, Community, DiscountConfig, Session } from '../lib/types';
export async function getDiscounts(db: Database = connection()) {
  const [r] = await db.all<{ config_json: string }>(
    'SELECT config_json FROM discount_rules WHERE id=?',
    ['standard'],
  );
  const config = JSON.parse(r.config_json) as DiscountConfig;
  return { ...config, enabled: isDemo() };
}
export async function getActivities(
  db: Database = connection(),
  ownerId?: string,
): Promise<Activity[]> {
  const query = ownerId ? 'c.owner_id=?' : "a.status='published' AND c.verification='verified'";
  const activities = await db.all<Activity>(
    `SELECT a.*,c.name AS host_name,c.verification FROM activities a JOIN communities c ON a.community_id=c.id WHERE ${query} ORDER BY a.created_at, CASE a.id WHEN 'cooking' THEN 1 WHEN 'pottery' THEN 2 WHEN 'indigo' THEN 3 WHEN 'cacao' THEN 4 WHEN 'paddleboard' THEN 5 ELSE 6 END,a.id`,
    ownerId ? [ownerId] : [],
  );
  const sessions = await db.all<Session>('SELECT * FROM activity_sessions ORDER BY starts_at');
  const images = await db.all<{ activity_id: string; url: string }>(
    'SELECT activity_id,url FROM activity_images ORDER BY position',
  );
  return activities.map((a) => ({
    ...a,
    sessions: sessions.filter((s) => s.activity_id === a.id),
    images: images.filter((i) => i.activity_id === a.id).map((i) => i.url),
  }));
}
export async function getCatalog(): Promise<Catalog> {
  await ensureDatabase();
  const db = connection();
  const [activities, communities, discounts] = await Promise.all([
    getActivities(db),
    db.all<Community>(
      "SELECT id,owner_id,name,province,description,verification,demo,image FROM communities WHERE verification='verified'",
    ),
    getDiscounts(db),
  ]);
  return { activities, communities, demo: isDemo(), discounts };
}
