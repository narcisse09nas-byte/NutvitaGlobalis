"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocalAuth } from "@/hooks/use-local-auth";
import { useInstructorStudio } from "@/hooks/use-instructor-studio";
import { useLanguage } from "@/hooks/use-language";
import { marketplaceCourses } from "@/data/marketplace-catalog";
import { getPublishedStudioCourses } from "@/lib/studio-course-runtime";
import {
  createEmptyMarketplaceStore,
  createReviewRecord,
  loadMarketplaceStore,
  saveMarketplaceStore,
} from "@/lib/marketplace-storage";
import type { MarketplaceCourse, MarketplaceStore } from "@/types/marketplace";

type ContextValue = {
  data: MarketplaceStore;
  courses: MarketplaceCourse[];
  usesServerCatalog: boolean;
  cartCourses: MarketplaceCourse[];
  wishlistCourses: MarketplaceCourse[];
  cartTotalUsd: number;
  addToCart: (slug: string) => void;
  removeFromCart: (slug: string) => void;
  toggleWishlist: (slug: string) => void;
  isInWishlist: (slug: string) => boolean;
  isInCart: (slug: string) => boolean;
  isEnrolled: (slug: string) => boolean;
  submitReview: (slug: string, rating: number, comment: string) => void;
  checkout: (
    code?: string,
  ) => Promise<{ checkoutUrl?: string; reference?: string; error?: string }>;
};

export const MarketplaceContext = createContext<ContextValue | null>(null);

export function MarketplaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();
  const { text } = useLanguage();
  const { data: studioData } = useInstructorStudio();
  const [data, setData] = useState<MarketplaceStore>(
    createEmptyMarketplaceStore(),
  );
  const [remoteCourses, setRemoteCourses] = useState<
    MarketplaceCourse[] | null
  >(null);
  const [remoteEnrollmentIds, setRemoteEnrollmentIds] = useState<Set<string>>(
    new Set(),
  );
  useEffect(() => {
    setData(loadMarketplaceStore());
    void fetch("/api/catalog", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const payload = (await response.json()) as {
        courses: MarketplaceCourse[];
        enrolledCourseIds: string[];
      };
      setRemoteCourses(payload.courses);
      setRemoteEnrollmentIds(new Set(payload.enrolledCourseIds));
    });
  }, []);
  const persist = useCallback(
    (updater: (current: MarketplaceStore) => MarketplaceStore) =>
      setData((current) => {
        const next = updater(current);
        saveMarketplaceStore(next);
        return next;
      }),
    [],
  );
  const courses = useMemo<MarketplaceCourse[]>(
    () =>
      remoteCourses ?? [
        ...marketplaceCourses,
        ...getPublishedStudioCourses(studioData)
          .filter(
            (studio) =>
              !marketplaceCourses.some((course) => course.slug === studio.slug),
          )
          .map<MarketplaceCourse>((studio) => ({
            id: studio.id,
            slug: studio.slug,
            code: studio.code,
            title: studio.title,
            subtitle: studio.subtitle,
            description: studio.description,
            category: studio.category,
            language: studio.language,
            level: "professional",
            instructorId: studio.instructorUserId,
            instructorName: "NutVitaGlobalis Faculty",
            priceUsd: studio.priceUsd,
            rating: 0,
            reviewCount: 0,
            studentCount: 0,
            durationHours: Math.max(
              1,
              Math.ceil(
                studio.modules.reduce(
                  (total, module) =>
                    total +
                    module.lessons.reduce(
                      (sum, lesson) => sum + lesson.durationMinutes,
                      0,
                    ),
                  0,
                ) / 60,
              ),
            ),
            lessonsCount: studio.modules.reduce(
              (total, module) => total + module.lessons.length,
              0,
            ),
            featured: false,
            published: true,
          })),
      ],
    [remoteCourses, studioData],
  );
  const usesServerCatalog = remoteCourses !== null;
  const cartCourses = useMemo(
    () =>
      courses.filter((course) =>
        data.cart.some((item) => item.courseSlug === course.slug),
      ),
    [courses, data.cart],
  );
  const wishlistCourses = useMemo(
    () =>
      courses.filter((course) =>
        data.wishlist.some((item) => item.courseSlug === course.slug),
      ),
    [courses, data.wishlist],
  );
  const cartTotalUsd = cartCourses.reduce(
    (total, course) => total + course.priceUsd,
    0,
  );
  const addToCart = useCallback(
    (slug: string) =>
      persist((current) =>
        current.cart.some((item) => item.courseSlug === slug)
          ? current
          : {
              ...current,
              cart: [
                ...current.cart,
                { courseSlug: slug, addedAt: new Date().toISOString() },
              ],
            },
      ),
    [persist],
  );
  const removeFromCart = useCallback(
    (slug: string) =>
      persist((current) => ({
        ...current,
        cart: current.cart.filter((item) => item.courseSlug !== slug),
      })),
    [persist],
  );
  const toggleWishlist = useCallback(
    (slug: string) =>
      persist((current) => ({
        ...current,
        wishlist: current.wishlist.some((item) => item.courseSlug === slug)
          ? current.wishlist.filter((item) => item.courseSlug !== slug)
          : [
              ...current.wishlist,
              { courseSlug: slug, addedAt: new Date().toISOString() },
            ],
      })),
    [persist],
  );
  const isInWishlist = useCallback(
    (slug: string) => data.wishlist.some((item) => item.courseSlug === slug),
    [data.wishlist],
  );
  const isInCart = useCallback(
    (slug: string) => data.cart.some((item) => item.courseSlug === slug),
    [data.cart],
  );
  const isEnrolled = useCallback(
    (slug: string) => {
      const course = courses.find((item) => item.slug === slug);
      return Boolean(
        (course && remoteEnrollmentIds.has(course.id)) ||
        (user &&
          data.enrollments.some(
            (item) => item.userId === user.id && item.courseSlug === slug,
          )),
      );
    },
    [courses, data.enrollments, remoteEnrollmentIds, user],
  );
  const submitReview = useCallback(
    (slug: string, rating: number, comment: string) => {
      if (!user || !comment.trim() || !isEnrolled(slug)) return;
      persist((current) => ({
        ...current,
        reviews: [
          createReviewRecord({
            courseSlug: slug,
            userId: user.id,
            authorName: user.fullName,
            rating: Math.min(5, Math.max(1, rating)),
            comment: comment.trim(),
          }),
          ...current.reviews.filter(
            (review) =>
              !(review.courseSlug === slug && review.userId === user.id),
          ),
        ],
      }));
    },
    [isEnrolled, persist, user],
  );
  const checkout = useCallback(
    async (code?: string) => {
      if (!user) return { error: text("Utilisateur non connecté.", "User not signed in.") };
      if (!cartCourses.length) return { error: text("Le panier est vide.", "The cart is empty.") };
      const response = await fetch("/api/payments/flutterwave/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseSlugs: cartCourses.map((course) => course.slug),
          couponCode: code?.trim() || undefined,
        }),
      });
      const payload = (await response.json()) as {
        checkoutUrl?: string;
        reference?: string;
        error?: string;
      };
      if (!response.ok || !payload.checkoutUrl)
        return {
          error: payload.error ?? text("Initialisation du paiement impossible.", "Unable to initialize payment."),
        };
      persist((current) => ({ ...current, cart: [] }));
      return payload;
    },
    [cartCourses, persist, text, user],
  );
  const value = useMemo(
    () => ({
      data,
      courses,
      usesServerCatalog,
      cartCourses,
      wishlistCourses,
      cartTotalUsd,
      addToCart,
      removeFromCart,
      toggleWishlist,
      isInWishlist,
      isInCart,
      isEnrolled,
      submitReview,
      checkout,
    }),
    [
      data,
      courses,
      usesServerCatalog,
      cartCourses,
      wishlistCourses,
      cartTotalUsd,
      addToCart,
      removeFromCart,
      toggleWishlist,
      isInWishlist,
      isInCart,
      isEnrolled,
      submitReview,
      checkout,
    ],
  );
  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
}
