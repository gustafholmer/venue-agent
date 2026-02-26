import { redirect } from 'next/navigation'

export default function DashboardInquiriesPage() {
  redirect('/dashboard/inbox?type=inquiry')
}
