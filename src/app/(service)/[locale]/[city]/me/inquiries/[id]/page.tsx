import { MyInquiryThreadScreen } from '@screens/nyc/MyInquiryThreadScreen'

export default async function NycMyInquiryThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <MyInquiryThreadScreen id={id} />
}
