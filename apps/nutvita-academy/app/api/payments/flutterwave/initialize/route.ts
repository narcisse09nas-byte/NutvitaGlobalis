import { createFlutterwaveCheckout } from "@/lib/payments/flutterwave";
import { isFlutterwaveConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { apiText } from "@/lib/api-i18n";

export async function POST(request: Request) {
  if (!isFlutterwaveConfigured()) return Response.json({ error: apiText(request, "Paiement Flutterwave non configuré.", "Flutterwave payment is not configured.") }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "Authentification Supabase requise." }, { status: 401 });

  const body = await request.json().catch(() => null) as { courseSlugs?: unknown; couponCode?: unknown } | null;
  const courseSlugs = Array.isArray(body?.courseSlugs) ? [...new Set(body.courseSlugs.filter((value): value is string => typeof value === "string" && value.length > 0))] : [];
  if (courseSlugs.length === 0 || courseSlugs.length > 20) return Response.json({ error: apiText(request, "Panier invalide.", "Invalid cart.") }, { status: 400 });
  if (body?.couponCode) return Response.json({ error: apiText(request, "Les coupons seront réactivés après migration de leur validation côté serveur.", "Coupons will be re-enabled after their validation is migrated to the server.") }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const [{ data: profile }, { data: courses, error: coursesError }, { data: existingEnrollments }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", auth.user.id).single(),
    admin.from("courses").select("id, slug, title, price_usd").in("slug", courseSlugs).eq("status", "published"),
    admin.from("enrollments").select("course_id, courses!inner(slug)").eq("user_id", auth.user.id),
  ]);
  if (coursesError || !courses || courses.length !== courseSlugs.length) return Response.json({ error: apiText(request, "Une formation est introuvable ou non publiée.", "A course was not found or is not published.") }, { status: 409 });
  const enrolledSlugs = new Set((existingEnrollments ?? []).map((item) => {
    const relation = item.courses as unknown as { slug?: string } | { slug?: string }[];
    return Array.isArray(relation) ? relation[0]?.slug : relation?.slug;
  }));
  if (courseSlugs.some((slug) => enrolledSlugs.has(slug))) return Response.json({ error: apiText(request, "Une formation du panier est déjà active dans votre compte.", "A course in the cart is already active in your account.") }, { status: 409 });

  const subtotal = courses.reduce((total, course) => total + Number(course.price_usd), 0);
  if (subtotal <= 0) return Response.json({ error: "Le montant de la commande est invalide." }, { status: 409 });
  const reference = `NVGA-${Date.now()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const { data: order, error: orderError } = await admin.from("orders").insert({ user_id: auth.user.id, status: "pending", currency: "USD", subtotal, discount: 0, total: subtotal, payment_provider: "flutterwave", transaction_reference: reference }).select("id").single();
  if (orderError || !order) return Response.json({ error: apiText(request, "Impossible de créer la commande.", "Unable to create the order.") }, { status: 500 });
  const { error: itemsError } = await admin.from("order_items").insert(courses.map((course) => ({ order_id: order.id, course_id: course.id, course_title: course.title, unit_price: Number(course.price_usd), discount: 0, final_price: Number(course.price_usd) })));
  if (itemsError) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return Response.json({ error: apiText(request, "Impossible de préparer la commande.", "Unable to prepare the order.") }, { status: 500 });
  }

  try {
    const checkoutUrl = await createFlutterwaveCheckout({ transactionReference: reference, amount: subtotal, currency: "USD", customer: { email: profile?.email ?? auth.user.email ?? "", name: profile?.full_name ?? auth.user.user_metadata.full_name ?? "Candidat" } });
    await admin.from("orders").update({ checkout_url: checkoutUrl }).eq("id", order.id);
    return Response.json({ checkoutUrl, reference });
  } catch (error) {
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return Response.json({ error: error instanceof Error ? error.message : "Flutterwave indisponible." }, { status: 502 });
  }
}
