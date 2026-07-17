const stats = [
  ["10+", "Professional Certifications"],
  ["100+", "Hours of Learning"],
  ["2", "Languages"],
  ["100%", "Online"],
];

export function HomeStats() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-4 lg:px-8">
        {stats.map(([value, label]) => (
          <div key={label} className="text-center">
            <p className="text-4xl font-extrabold text-[#0B5D3B]">{value}</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}