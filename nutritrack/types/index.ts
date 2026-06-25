

import type { Timestamp } from '@/nutritrack/local-firestore';

export type Program = 'TSFP' | 'OTP' | 'ITP';

export type HealthArea = {
  id: string;
  code: string;
  hqGlobal: string;
  country: string;
  region: string;
  healthDistrict: string;
  subDivision?: string; // New field for Admin 3
  healthArea: string;
  healthFacilityName: string;
  childCounter: number;
  programs: Program[];
};

export type Village = {
    id: string;
    villageId: string;
    country: string;
    region: string;
    healthDistrict: string;
    healthAreaId: string;
    name: string;
    chwCount: number;
    estimatedPopulation: number;
}

export type CHW = {
    id: string;
    chwId: string;
    firstName: string;
    lastName: string;
    sex: Sex;
    phone: string;
    email?: string;
    healthAreaId: string;
    villageId: string;
}

export type AdmissionType = 'new' | 'relapse' | 'ex-sam' | 'readmission-lt-2m' | 'internal-transfer' | 'new-whz-muac' | 'new-oedema';
export type Sex = 'M' | 'F';
export type Oedema = 'yes' | 'no';
export type DiagnosisStatus = 'SAM' | 'MAM' | 'Not Malnourished';
export type Diagnosis = DiagnosisStatus;

export interface DiagnosisResult {
  status: DiagnosisStatus;
  reason: string;
}

export type CommodityType = 'Nutritional' | 'Systematic Treatment';
export type CommodityProgram = 'SAM' | 'MAM' | 'Both' | 'SAM+';

export type Commodity = {
    id: string;
    name: string;
    unit: 'kg' | 'sachet' | 'tablet' | 'unit' | 'MT' | 'ml';
    type: CommodityType;
    program: CommodityProgram;
}

export type StockMovementType = 'received' | 'used' | 'transferred' | 'damaged';

export type StockMovement = {
    id: string;
    commodityId: string;
    healthAreaId: string;
    type: StockMovementType;
    quantity: number;
    date: Timestamp;
    program?: CommodityProgram;
    batchNumber?: string;
    notes?: string;
    transferredTo?: string; // healthAreaId
    source?: 'WFP' | 'UNICEF' | 'DRPH' | 'Other' | 'Internal Transfer';
    sourceOther?: string;
}

export type AggregatedStockByBatch = {
    commodityId: string;
    commodityName: string;
    unit: 'kg' | 'sachet' | 'tablet' | 'unit' | 'MT' | 'ml';
    batchNumber: string;
    openingStock: number;
    received: number;
    used: number;
    transferred: number;
    damaged: number;
    closingStock: number;
    healthFacilityName?: string;
}

export type Treatment = {
    commodityId: string;
    batchNumber: string;
    quantity: number;
}

export type HomeVisit = {
    date: Timestamp;
    chwId: string;
    observations: string;
}

export type VaccinationStatus = Record<string, {
    status: 'yes' | 'no' | 'unknown';
    date: Timestamp | null;
}>;

export type Sensitization = {
    approach: 'FGD' | 'Councelling';
    chwId: string | null;
    otherProvider?: string;
    mainTopic: string;
    otherTopic?: string;
} | null;

export type Visit = {
  id: string;
  childId?: string;
  visitDate: any;
  visitNumber: number;
  weight: number; // kg
  height: number; // cm
  muac: number; // mm
  oedema: Oedema;
  oedemaGrade: '1' | '2' | '3' | null;
  appetiteTest: 'pass' | 'fail' | null;
  
  // Comorbidities
  diarrheaDehydration: Oedema;
  severeVomiting: Oedema;
  pneumonia: Oedema;
  subcostalRetraction: Oedema;
  openSkinLesions: Oedema;
  hypothermia: Oedema;
  fever: Oedema;
  extremePallor: Oedema;
  weakApatheticUnconscious: Oedema;
  seizuresMeaslesEtc: Oedema;
  clinicalVitaminADeficiency: Oedema;
  ivDripOrNgtFeeding: Oedema;

  nutritionalTreatments: Treatment[];
  systematicTreatments: Treatment[];
  nextVisitDate: any;
  homeVisit: HomeVisit | null;
  sensitization: Sensitization;
  waz?: number | null;
  haz?: number | null;
  whz?: number | null;
  diagnosis: DiagnosisResult | string | null;
};

export type InpatientMeal = {
    prescribed: number | null;
    actual: number | null;
    absent: boolean;
    refused: boolean;
};

export type InpatientMedication = {
    commodityId: string;
    route: 'oral' | 'anal' | 'im' | 'iv' | 'perfusion';
    dose: string;
    unit: 'mg/day' | 'ml/day';
    frequency: string;
    administrations: {
        doseNumber: number;
        quantity: number | null;
        time: string;
        doneBy: string;
    }[];
};

export type InpatientVisit = {
    id: string;
    childId?: string;
    date: Timestamp;
    visitDate: Timestamp; // To align with Visit type for getCuredPerformance
    treatmentPhase: 'Phase 1' | 'Transition' | 'Phase 2';
    weight: number;
    oedema: Oedema;
    oedemaGrade: '1' | '2' | '3' | null;
    appetiteTest: 'pass' | 'fail' | null;
    whz?: number | null;
    morningTime: string | null;
    eveningTime: string | null;
    temperatureMorning: number | null;
    temperatureEvening: number | null;
    respirationRateMorning: number | null;
    respirationRateEvening: number | null;
    stoolsCount: number | null;
    
    therapeuticFeeding: {
        commodityId: string;
        numberOfMeals: number;
        meals: InpatientMeal[];
    } | null;

    complications: {
        hypoglycemia: boolean;
        hypothermia: boolean;
        dehydration: boolean;
        electrolyteImbalance: boolean;
        infection: boolean;
        severeAnemia: boolean;
        other: boolean;
        otherComplication?: string;
    };

    medications: InpatientMedication[];
    notes: string;
    discharge?: {
        date: Timestamp;
        type: 'treated_with_success' | 'cured' | 'defaulter' | 'dead' | 'non_respondent' | 'medical_reference';
    } | null;
};


export type Child = {
  id:string;
  childCode: string;
  firstName: string;
  lastName: string;
  caretakerName: string;
  caretakerPhone: string | null;
  age: number; // months
  sex: Sex;
  villageId: string;
  chwId: string;
  admissionType: AdmissionType;
  weight: number;
  height: number;
  muac: number;
  oedema: Oedema;
  oedemaGrade: '1' | '2' | '3' | null;
  // Clinical Assessment
  appetiteTest: 'pass' | 'fail' | null;
  diarrheaDehydration: Oedema;
  severeVomiting: Oedema;
  pneumonia: Oedema;
  subcostalRetraction: Oedema;
  openSkinLesions: Oedema;
  hypothermia: Oedema;
  fever: Oedema;
  extremePallor: Oedema;
  weakApatheticUnconscious: Oedema;
  seizuresMeaslesEtc: Oedema;
  clinicalVitaminADeficiency: Oedema;
  ivDripOrNgtFeeding: Oedema;

  vaccinationStatus: VaccinationStatus;
  vaccinationAssessmentDone?: boolean;
  healthAreaId: string;
  admissionDate: Timestamp;
  status: 'active' | 'discharged' | 'defaulter' | 'referred_out';
  diagnosis: DiagnosisResult | string | null;
  currentInpatientPhase?: 'Phase 1' | 'Transition' | 'Phase 2';
  whz: number | null;
  waz: number | null;
  haz: number | null;
  visits?: Visit[]; // This is a helper property on the client, not stored in the main child doc
  nextVisitDate: Timestamp | null;
  needsHomeVisit: 'yes' | 'no';
  homeVisitDate: Timestamp | null;
  homeVisitPlan: {
    reason: string;
    chwId: string;
  } | null;
  discharge?: {
    date: Timestamp;
    type: 'cured' | 'defaulter' | 'non_respondent' | 'dead' | 'transfer_out' | 'referred_out' | 'referred_otp' | 'end_ex_sam_followup' | 'treated_with_success' | 'non_respondent_medical_reference' | 'transfer_tsfp' | 'transfer_otp' | 'transfer_itp';
    transferToFacilityId?: string | null;
    transferToOther?: string | null; // For external or specified transfers
    referredToFacilityId?: string | null;
    referredToOther?: string | null;
    referralReason?: string;
    referralStatus?: 'pending' | 'accepted' | 'declined' | 'reached' | 'not_reached';
    referralStatusUpdateDate?: Timestamp | null;
    declineReason?: string | null;
  };
};

export type UserRole = 'owner' | 'regional' | 'health_district' | 'health_area';
export type UserStatus = 'pending' | 'active' | 'rejected';

export type AppUser = {
    id: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    healthAreaId: string; // Can be an ID, region name, or district name
    createdAt: Timestamp;
}

export interface SupervisionChecklistItem {
    item: string;
    status: number;
    comments?: string;
}

export type Supervision = {
    id: string;
    date: Timestamp;
    supervisorName: string;
    supervisorSex: 'M' | 'F';
    supervisorFunction: string;
    facilityId: string;
    component: 'outpatient' | 'inpatient' | 'community';
    checklist: SupervisionChecklistItem[];
    summary?: string;
    recommendations?: string;
    actionPlan?: string;
};

export type CommunityScreening = {
    id: string;
    date: Timestamp;
    chwId: string;
    villageId: string;
    childrenScreened: number;
    samCasesFound: number;
    mamCasesFound: number;
    notes?: string;
};

export type CommunitySensitization = {
    id: string;
    date: Timestamp;
    chwId: string;
    villageId: string;
    type: 'FGD' | 'Counselling';
    topic: string;
    otherTopic?: string;
    participantsMale: number;
    participantsFemale: number;
};

export type CommunityHomeVisit = {
    id: string;
    date: Timestamp;
    chwId: string;
    villageId: string;
    routineVisits: number;
    poorOutcomeVisits: number;
    defaulterTracinVisits: number;
    mamChildrenReached: number;
    samChildrenReached: number;
    findingsRoutine?: string;
    findingsPoorOutcome?: string;
    findingsDefaulter?: string;
};

export type CommunityCulinaryDemo = {
    id: string;
    date: Timestamp;
    chwId: string;
    villageId: string;
    topic: string;
    participantsMaleNoMal: number;
    participantsFemaleNoMal: number;
    participantsMaleMAM: number;
    participantsFemaleMAM: number;
    participantsMaleSAM: number;
    participantsFemaleSAM: number;
};



