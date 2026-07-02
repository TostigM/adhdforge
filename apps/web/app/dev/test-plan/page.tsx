/**
 * M4 Interactive Test Plan — dev-only.
 * Server-side gate: 404 in production (the old client-side throw still shipped
 * the page in the prod bundle; a server notFound() never renders it at all).
 */
import { notFound } from 'next/navigation';

import { TestPlanClient } from './_components/TestPlanClient';

export default function TestPlanPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <TestPlanClient />;
}
