import SupportProductPage from "@/components/support/SupportProductPage";
import { getSitePage } from "@/lib/site-pages";

export default async function Page() {
  const page = await getSitePage("applications-support-promanage");
  if (!page) return null;
  return <SupportProductPage page={page} appHref="/op-management" />;
}
