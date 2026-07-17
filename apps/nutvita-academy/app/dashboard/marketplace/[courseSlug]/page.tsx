import { PublishedMarketplaceCourse } from "@/components/marketplace/PublishedMarketplaceCourse";

export default async function MarketplaceCoursePage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <PublishedMarketplaceCourse courseSlug={courseSlug} />
    </div>
  );
}
