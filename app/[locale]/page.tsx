// app/[locale]/page.tsx
import { redirect } from 'next/navigation'

export default async function LocaleRootPage({ params }: { params: Promise<Record<string, string>> }) {
  const { locale } = await params
  redirect(`/${locale}/home`)
}

