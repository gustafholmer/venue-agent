import { redirect } from 'next/navigation'

export default async function VenueInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string; inquiryId: string }>
}) {
  const { inquiryId } = await params
  redirect(`/dashboard/inquiries/${inquiryId}`)
}
