import { LocalizedText } from "@/components/i18n/LocalizedText";

const modules = [
  {
    number: "01",
    titleFr: "Comprendre la malnutrition aiguë",
    titleEn: "Understanding Acute Malnutrition",
    duration: "3h",
    lessons: 6,
  },
  {
    number: "02",
    titleFr: "Dépistage communautaire et référencement",
    titleEn: "Community Screening and Referral",
    duration: "4h",
    lessons: 8,
  },
  {
    number: "03",
    titleFr: "Anthropométrie : PB/MUAC, poids, taille, œdèmes",
    titleEn: "Anthropometry: MUAC, Weight, Height, Oedema",
    duration: "5h",
    lessons: 10,
  },
  {
    number: "04",
    titleFr: "Diagnostic : MAM, SAM et complications",
    titleEn: "Diagnosis: MAM, SAM and Complications",
    duration: "4h",
    lessons: 8,
  },
  {
    number: "05",
    titleFr: "Prise en charge ambulatoire de la MAS",
    titleEn: "Outpatient Management of SAM",
    duration: "6h",
    lessons: 12,
  },
  {
    number: "06",
    titleFr: "Prise en charge hospitalière de la MAS",
    titleEn: "Inpatient Management of SAM",
    duration: "6h",
    lessons: 12,
  },
  {
    number: "07",
    titleFr: "Prise en charge de la MAM",
    titleEn: "Management of MAM",
    duration: "4h",
    lessons: 8,
  },
  {
    number: "08",
    titleFr: "Nourrissons de moins de 6 mois",
    titleEn: "Infants Under 6 Months",
    duration: "5h",
    lessons: 10,
  },
  {
    number: "09",
    titleFr: "Suivi, sortie, rechute et post-traitement",
    titleEn: "Follow-up, Exit, Relapse and Post-treatment Care",
    duration: "4h",
    lessons: 8,
  },
  {
    number: "10",
    titleFr: "Gestion d’un programme communautaire PCIMA/CMAM",
    titleEn: "Managing a CMAM Programme",
    duration: "6h",
    lessons: 12,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7faf7] text-[#063d2e]">
      <section className="bg-[#063d2e] text-white px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <p className="text-orange-400 font-semibold mb-3">
            NutVitaGlobalis Academy
          </p>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            Certified Acute Malnutrition Management Specialist
          </h1>

          <LocalizedText as="p" className="mt-4 text-xl text-green-50 max-w-3xl" fr="Spécialiste certifié en prise en charge communautaire de la malnutrition aiguë." en="Certified specialist in community-based management of acute malnutrition." />

          <div className="mt-8 flex flex-wrap gap-4">
            <span className="bg-white text-[#063d2e] px-5 py-3 rounded-full font-bold">
              <LocalizedText fr="45–60 heures" en="45–60 hours" />
            </span>
            <span className="bg-orange-500 text-white px-5 py-3 rounded-full font-bold">
              Certification : 100 USD
            </span>
            <span className="bg-green-700 text-white px-5 py-3 rounded-full font-bold">
              Français + English
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <LocalizedText as="h2" className="text-3xl font-bold mb-4" fr="Objectif de la formation" en="Course objective" />

        <LocalizedText as="p" className="text-lg text-slate-700 max-w-4xl" fr="Cette certification prépare les professionnels à identifier, référer, traiter et suivre les enfants atteints de malnutrition aiguë modérée ou sévère, en contexte communautaire, ambulatoire et hospitalier, selon les standards internationaux." en="This certification prepares professionals to identify, refer, treat and follow children with moderate or severe acute malnutrition in community, outpatient and inpatient settings, in line with international standards." />
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <LocalizedText as="h2" className="text-3xl font-bold mb-8" fr="Programme de formation" en="Course curriculum" />

        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module) => (
            <div
              key={module.number}
              className="bg-white rounded-3xl p-6 shadow-sm border border-green-100"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-orange-500 font-bold">
                  Module {module.number}
                </span>
                <span className="text-sm bg-green-50 px-3 py-1 rounded-full">
                  {module.duration}
                </span>
              </div>

              <h3 className="text-2xl font-bold mb-2">{module.titleFr}</h3>
              <p className="text-slate-500 italic mb-4">{module.titleEn}</p>

              <p className="text-sm text-slate-600">
                {module.lessons}{" "}
                <LocalizedText fr="leçons • Vidéos • Quiz • Cas pratiques • Ressources téléchargeables" en="lessons • Videos • Quizzes • Case studies • Downloadable resources" />
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border-t border-green-100 px-6 py-14">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          <div>
            <LocalizedText as="h3" className="font-bold text-xl mb-2" fr="Certification vérifiable" en="Verifiable certification" />
            <LocalizedText as="p" className="text-slate-600" fr="Certificat numérique avec QR Code après réussite de l’examen." en="Digital certificate with a QR code after passing the exam." />
          </div>

          <div>
            <LocalizedText as="h3" className="font-bold text-xl mb-2" fr="Approche pratique" en="Practical approach" />
            <LocalizedText as="p" className="text-slate-600" fr="Cas cliniques, arbres décisionnels et simulations terrain." en="Clinical cases, decision trees and field simulations." />
          </div>

          <div>
            <LocalizedText as="h3" className="font-bold text-xl mb-2" fr="Bilingue" en="Bilingual" />
            <LocalizedText as="p" className="text-slate-600" fr="Formation disponible en français et en anglais." en="Course available in French and English." />
          </div>
        </div>
      </section>
    </main>
  );
}
