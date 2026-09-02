'use client';

import { useQuery } from '@tanstack/react-query';
import { orderQueries } from '@/entities/order';

export default function OrderHistoryPage() {
  const { data: orders } = useQuery(orderQueries.list());

  return (
    <main className="page-container">
      <h1>주문 내역</h1>
      {orders !== undefined && orders.length === 0 && <p>주문 내역이 없습니다.</p>}
      {orders !== undefined && orders.length > 0 && (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>{order.id}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
