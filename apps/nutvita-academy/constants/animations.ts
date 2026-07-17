export const animations = {
  fadeUp: {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true },
  },
  cardHover: {
    whileHover: { y: -6 },
    transition: { duration: 0.25 },
  },
};