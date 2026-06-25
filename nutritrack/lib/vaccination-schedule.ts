
export interface Vaccine {
    name: string;
    disease: string;
}

export interface ScheduleEntry {
    ageInMonths: number;
    contact: string;
    vaccines: Vaccine[];
}

// Age in months: 0 = at birth, 1.5 = 6 weeks, etc.
export const vaccinationSchedule: ScheduleEntry[] = [
    {
        ageInMonths: 0,
        contact: '1st Contact (at birth)',
        vaccines: [
            { name: 'OPV-0', disease: 'Poliomyelitis' },
            { name: 'BCG', disease: 'Tuberculosis' },
            { name: 'HepB-BD', disease: 'Hepatitis B Infection' },
        ],
    },
    {
        ageInMonths: 1.5, // 6 weeks
        contact: '2nd Contact (6 weeks)',
        vaccines: [
            { name: 'OPV-1', disease: 'Poliomyelitis' },
            { name: 'ROTA-1', disease: 'Rotavirus Diarrhoea' },
            { name: 'DTC-HepB-Hib-1', disease: 'Diphtheria, Tetanus, Whooping cough, Hepatitis B, Haemophilus influenzae type b' },
            { name: 'Pneumo 13-1', disease: 'Pneumococcal infections' },
        ],
    },
    {
        ageInMonths: 2.5, // 10 weeks
        contact: '3rd Contact (10 weeks)',
        vaccines: [
            { name: 'OPV-2', disease: 'Poliomyelitis' },
            { name: 'ROTA-2', disease: 'Rotavirus Diarrhoea' },
            { name: 'IPTI-1', disease: 'Malaria' },
            { name: 'DTC-HepB-Hib-2', disease: 'Diphtheria, Tetanus, Whooping cough, Hepatitis B, Haemophilus influenzae type b' },
            { name: 'Pneumo 13-2', disease: 'Pneumococcal infections' },
        ],
    },
    {
        ageInMonths: 3.5, // 14 weeks
        contact: '4th Contact (14 weeks)',
        vaccines: [
            { name: 'OPV-3', disease: 'Poliomyelitis' },
            { name: 'ROTA-3', disease: 'Rotavirus Diarrhoea' },
            { name: 'IPTI-2', disease: 'Malaria' },
            { name: 'DTC-HepB-Hib-3', disease: 'Diphtheria, Tetanus, Whooping cough, Hepatitis B, Haemophilus influenzae type b' },
            { name: 'Pneumo 13-3', disease: 'Pneumococcal infections' },
            { name: 'IPV-1', disease: 'Poliomyelitis' },
        ],
    },
    {
        ageInMonths: 6,
        contact: '5th Contact (6 months)',
        vaccines: [
            { name: 'Vit A', disease: 'Vitamin A deficiency' },
            { name: 'IPTI-3', disease: 'Malaria' },
            { name: 'AMV-1', disease: 'Malaria' },
        ],
    },
    {
        ageInMonths: 7,
        contact: '6th Contact (7 months)',
        vaccines: [{ name: 'AMV-2', disease: 'Malaria' }],
    },
    {
        ageInMonths: 9,
        contact: '7th Contact (9 months)',
        vaccines: [
            { name: 'MR-1', disease: 'Measles-Rubella' },
            { name: 'YFV', disease: 'Yellow fever' },
            { name: 'IPV-2', disease: 'Poliomyelitis' },
            { name: 'AMV-3', disease: 'Malaria' },
            { name: 'IPTI-4', disease: 'Malaria' },
            { name: 'LLIN', disease: 'Malaria' },
        ],
    },
    {
        ageInMonths: 12,
        contact: '8th Contact (12 months)',
        vaccines: [
            { name: 'Vit A', disease: 'Vitamin A deficiency' },
            { name: 'Mebendazole', disease: 'Intestinal worms' },
        ],
    },
    {
        ageInMonths: 15,
        contact: '9th Contact (15 months)',
        vaccines: [
            { name: 'MR 2', disease: 'Measles-Rubella' },
            { name: 'Men A/ACYW135', disease: 'Meningitis and other severe meningococcal infections' },
            { name: 'IPTI-5', disease: 'Malaria' },
        ],
    },
    {
        ageInMonths: 18,
        contact: '10th Contact (18 months)',
        vaccines: [
            { name: 'Vit A', disease: 'Vitamin A deficiency' },
            { name: 'Mebendazole', disease: 'Intestinal worms' },
        ],
    },
    {
        ageInMonths: 24,
        contact: '11th Contact (24 months)',
        vaccines: [
            { name: 'AMV-4', disease: 'Malaria' },
            { name: 'Vit A', disease: 'Vitamin A deficiency' },
            { name: 'Mebendazole', disease: 'Intestinal worms' },
        ],
    },
];

export const getDueVaccines = (ageInMonths: number) => {
    return vaccinationSchedule.filter(entry => entry.ageInMonths <= ageInMonths);
};


