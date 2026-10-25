'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page">
      <div className="panel empty">
        <h1>โหลดหน้านี้ไม่สำเร็จ / Unable to load this page</h1>
        <p>กรุณาลองอีกครั้ง / Please try again</p>
        <button className="btn" onClick={reset}>
          ลองอีกครั้ง / Try again
        </button>
      </div>
    </div>
  );
}
