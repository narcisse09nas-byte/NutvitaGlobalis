import type { SurveyQuestion } from "@/survey/lib/xlsform";

export type SurveyModuleTemplate = {
  id: string;
  title: string;
  description: string;
  source: string;
  formulas: Record<string, unknown>;
  questions: Omit<SurveyQuestion, "id">[];
};

const yesNo = [{value:"1",label:"Oui"},{value:"0",label:"Non"}];
const q = (type:SurveyQuestion["type"],name:string,label:string,extra:Partial<SurveyQuestion>={}):Omit<SurveyQuestion,"id"> => ({type,name,label,labels:{fr:label,en:""},...extra});
const group = (id:string,title:string,items:Omit<SurveyQuestion,"id">[],relevant?:string) => [
  q("begin_group",id,title,{appearance:"field-list",relevant}),
  ...items,
  q("end_group",`end_${id}`,""),
];
const days = (name:string,label:string) => q("integer",name,label,{required:true,constraint:". >= 0 and . <= 7",constraint_message:"Saisir un nombre de jours entre 0 et 7."});

const fcsCore = [
  days("FCSStap","Céréales et tubercules : nombre de jours consommés sur les 7 derniers jours"),
  days("FCSPulse","Légumineuses : nombre de jours"),
  days("FCSDairy","Lait et produits laitiers : nombre de jours"),
  days("FCSPr","Viande, poisson et œufs : nombre de jours"),
  days("FCSVeg","Légumes : nombre de jours"),
  days("FCSFruit","Fruits : nombre de jours"),
  days("FCSFat","Huiles et matières grasses : nombre de jours"),
  days("FCSSugar","Sucre et produits sucrés : nombre de jours"),
];

export const nutritionSurveyModules:SurveyModuleTemplate[] = [
  {
    id:"anthropometry",title:"Mesures anthropométriques OMS",description:"Âge, sexe, poids, taille/longueur, PB, œdèmes et z-scores P/A, T/A et P/T.",source:"WHO Child Growth Standards 2006",
    formulas:{engine:"who_lms",outputs:["weight_for_age_z","height_for_age_z","weight_for_height_z"],ageRangeMonths:[0,60]},
    questions:group("anthropometry","Anthropométrie",[
      q("integer","anthro_age_months","Âge révolu en mois",{required:true,constraint:". >= 0 and . <= 60"}),
      q("select_one","anthro_sex","Sexe",{required:true,listName:"sex",options:[{value:"female",label:"Fille"},{value:"male",label:"Garçon"}]}),
      q("decimal","anthro_weight_kg","Poids en kilogrammes",{required:true,constraint:". > 0"}),
      q("decimal","anthro_height_cm","Taille ou longueur en centimètres",{required:true,constraint:". >= 40 and . <= 130"}),
      q("select_one","anthro_method","Méthode de mesure",{listName:"measurement_method",options:[{value:"recumbent_length",label:"Longueur couchée"},{value:"standing_height",label:"Taille debout"}]}),
      q("decimal","anthro_muac_mm","Périmètre brachial (mm)",{constraint:". >= 70 and . <= 300"}),
      q("select_one","anthro_edema","Œdèmes bilatéraux prenant le godet ?",{listName:"yes_no",options:yesNo}),
    ]),
  },
  {
    id:"iycf_mad",title:"MMF / MDD / MAD (6-23 mois)",description:"Pratiques d’alimentation du nourrisson et du jeune enfant.",source:"WFP/WHO IYCF - script nutMAD",
    formulas:{mddThreshold:5,mddGroups:8,mmf:"breastfed 6-8m >=2; breastfed 9-23m >=3; non-breastfed solid>=1 and total feeds>=4",mmff:"non-breastfed milk feeds>=2",mad:"MDD and MMF and, if non-breastfed, MMFF"},
    questions:group("iycf_mad","Alimentation complémentaire 6-23 mois",[
      q("integer","PCMADChildAge_months","Âge de l’enfant en mois",{required:true,constraint:". >= 6 and . <= 23"}),
      q("select_one","PCMADBreastfeed","L’enfant a-t-il été allaité hier, jour ou nuit ?",{listName:"yes_no",options:yesNo}),
      ...["StapCer","StapRoo","Pulse","Dairy","PrMeatF","PrEgg","PrFish","VegOrg","VegGre","VegOth","FruitOrg","FruitOth"].map(name=>q("select_one",`PCMAD${name}`,`Consommation hier : ${name}`,{listName:"yes_no",options:yesNo})),
      q("integer","PCMADMeals","Nombre de repas solides, semi-solides ou mous hier",{constraint:". >= 0 and . <= 7"}),
      q("integer","PCMADInfFormulaNum","Nombre de prises de formule",{constraint:". >= 0 and . <= 7"}),
      q("integer","PCMADMilkNum","Nombre de prises de lait animal",{constraint:". >= 0 and . <= 7"}),
      q("integer","PCMADYogurtDrinkNum","Nombre de boissons au yaourt",{constraint:". >= 0 and . <= 7"}),
    ],"${PCMADChildAge_months} >= 6 and ${PCMADChildAge_months} <= 23"),
  },
  {
    id:"mddw",title:"MDD-W",description:"Diversité alimentaire minimale sur 10 groupes.",source:"FAO/WFP - script nutMDDW",
    formulas:{groups:10,threshold:5,output:"MDDW_5"},
    questions:group("mddw","Diversité alimentaire MDD-W",[
      ...["StapCer","StapRoo","Pulse","Nuts","Milk","Dairy","PrMeatO","PrMeatF","PrMeatWhite","PrFish","PrEgg","VegGre","VegOrg","FruitOrg","VegOth","FruitOth"].map(name=>q("select_one",`PWMDDW${name}`,`Consommation au cours des dernières 24 heures : ${name}`,{listName:"yes_no",options:yesNo}))
    ]),
  },
  {
    id:"fcs",title:"Food Consumption Score (FCS)",description:"Fréquences de consommation sur 7 jours, seuil standard ou élevé.",source:"WFP - scripts FCS low/high threshold",
    formulas:{score:"FCSStap*2 + FCSPulse*3 + FCSDairy*4 + FCSPr*4 + FCSVeg + FCSFruit + FCSFat*0.5 + FCSSugar*0.5",lowThresholds:[21,35],highThresholds:[28,42],validRange:[0,112]},
    questions:group("fcs","Score de consommation alimentaire",fcsCore),
  },
  {
    id:"fcsn",title:"FCS-Nut",description:"Qualité nutritionnelle du FCS : vitamine A, protéines et fer héminique.",source:"WFP - scripts FCSN indicator calculation",
    formulas:{vitaminA:"FCSDairy+FCSNPrMeatO+FCSNPrEggs+FCSNVegOrg+FCSNVegGre+FCSNFruiOrg",protein:"FCSPulse+FCSDairy+FCSNPrMeatF+FCSNPrMeatO+FCSNPrFish+FCSNPrEggs",haemIron:"FCSNPrMeatF+FCSNPrMeatO+FCSNPrFish",categories:{never:0,sometimes:[1,6],daily:[7,42]}},
    questions:group("fcsn","Qualité nutritionnelle FCS-N",[
      ...fcsCore,
      ...["PrMeatO","PrMeatF","PrFish","PrEggs","VegOrg","VegGre","FruiOrg"].map(name=>days(`FCSN${name}`,`Sous-groupe FCS-N ${name} : nombre de jours`)),
    ]),
  },
  {
    id:"hdds",title:"HDDS",description:"Diversité alimentaire du ménage sur 24 heures.",source:"WFP - script Household Dietary Diversity Score",
    formulas:{score:"sum of 12 binary food groups",validRange:[0,12],qualityFlags:{zero:0,lowMax:2,highMin:10}},
    questions:group("hdds","Diversité alimentaire du ménage",["StapCer","StapRoot","Pulse","Dairy","PrMeat","PrFish","PrEggs","Veg","Fruit","Fat","Sugar","Cond"].map(name=>q("select_one",`HDDS${name}`,`Consommé au cours des dernières 24 heures : ${name}`,{listName:"yes_no",options:yesNo}))),
  },
  {
    id:"hhs",title:"Household Hunger Scale (HHS)",description:"Expériences de faim du ménage et fréquence.",source:"WFP/FANTA - script Household Hunger Scale",
    formulas:{score:"sum recoded frequency of 3 occurrence questions",categories:{"0-1":"little_or_no_hunger","2-3":"moderate_hunger","4-6":"severe_hunger"}},
    questions:group("hhs","Échelle de la faim du ménage",["NoFood","BedHung","NotEat"].flatMap(name=>[
      q("select_one",`HHS${name}`,`Au cours des 4 dernières semaines : ${name} ?`,{listName:"yes_no",options:yesNo}),
      q("select_one",`HHS${name}_FR`,`Fréquence : ${name}`,{listName:"frequency_30d",options:[{value:"1",label:"Rarement"},{value:"2",label:"Parfois"},{value:"3",label:"Souvent"}],relevant:`\${HHS${name}} = '1'`}),
    ])),
  },
  {
    id:"rcsi",title:"rCSI",description:"Indice réduit des stratégies d’adaptation sur 7 jours.",source:"WFP - script rCSI",
    formulas:{score:"LessQlty*1 + Borrow*2 + MealNb*1 + MealSize*1 + MealAdult*3",validRange:[0,56],ipc:[3,18,42]},
    questions:group("rcsi","Stratégies d’adaptation alimentaire",[
      days("rCSILessQlty","Recours à des aliments moins préférés"),
      days("rCSIBorrow","Emprunt de nourriture ou aide"),
      days("rCSIMealNb","Réduction du nombre de repas"),
      days("rCSIMealSize","Réduction de la taille des portions"),
      days("rCSIMealAdult","Restriction des adultes au profit des enfants"),
    ]),
  },
  {
    id:"lcs",title:"LCS",description:"Stratégies d’adaptation des moyens d’existence : stress, crise, urgence.",source:"WFP - script LCS-EN",
    formulas:{levels:{none:1,stress:2,crisis:3,emergency:4},output:"maximum severity used"},
    questions:group("lcs","Stratégies liées aux moyens d’existence",["stress_DomAsset","stress_Utilities","stress_Saving","crisis_ProdAssets","crisis_Health","crisis_OutSchool","em_ResAsset","em_Begged","em_IllegalAct"].map(name=>q("select_one",`LcsEN_${name}`,`Stratégie ${name}`,{listName:"lcs_status",options:[{value:"10",label:"Non"},{value:"20",label:"Oui"},{value:"30",label:"Déjà épuisée"}]}))),
  },
  {
    id:"fes_cari",title:"FES / CARI",description:"Part des dépenses alimentaires et classification consolidée de la sécurité alimentaire.",source:"WFP - scripts FES et CARI-FES",
    formulas:{fes:"monthly food expenditure / total monthly expenditure",fesCategories:[0.5,0.65,0.75],cari:"round(mean(FCS_4pt, mean(max_coping, foodexp_4pt)))"},
    questions:group("fes_cari","Dépenses et CARI",[
      q("decimal","HHExpF_1M","Dépenses/consommation alimentaires mensuelles",{required:true,constraint:". >= 0"}),
      q("decimal","HHExpNF_1M","Dépenses/consommation non alimentaires mensuelles",{required:true,constraint:". >= 0"}),
      q("calculate","FES","Part des dépenses alimentaires",{calculation:"${HHExpF_1M} div (${HHExpF_1M}+${HHExpNF_1M})",readonly:true}),
      q("note","cari_note","Le CARI final combine FCS, FES et la stratégie d’adaptation maximale."),
    ]),
  },
  {
    id:"food_sources",title:"Sources de consommation alimentaire",description:"Source principale de chaque groupe alimentaire consommé.",source:"WFP - script Food-consumption-sources",
    formulas:{sourceCodes:{100:"own_production",200:"hunting_fishing",300:"gathering",400:"borrowing",500:"cash",600:"credit",700:"begging",800:"exchange",900:"gift",1000:"assistance"}},
    questions:group("food_sources","Sources des aliments",["Stap","Pulse","Dairy","Pr","Veg","Fruit","Fat","Sugar"].map(name=>q("select_one",`FCS${name}_SRf`,`Source principale : ${name}`,{listName:"food_source",options:[{value:"100",label:"Production propre"},{value:"200",label:"Chasse ou pêche"},{value:"300",label:"Cueillette"},{value:"400",label:"Emprunt"},{value:"500",label:"Achat comptant"},{value:"600",label:"Crédit"},{value:"700",label:"Mendicité"},{value:"800",label:"Échange"},{value:"900",label:"Don"},{value:"1000",label:"Assistance"}]}))),
  },
  {
    id:"mddi",title:"MDDI / MODA",description:"Privations multidimensionnelles : alimentation, éducation, santé, abri, WASH et sécurité.",source:"WFP MDDI et approche MODA",
    formulas:{dimensions:["food","education","health","shelter","wash","safety"],weights:"equal dimensions; equal indicators within dimension",incidenceThreshold:.33,severeThreshold:.5},
    questions:group("mddi","Privations multidimensionnelles",[
      q("select_one","MDDI_food1","Consommation alimentaire inacceptable ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_food2","Niveau élevé de stratégies d’adaptation ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_edu1","Au moins un enfant d’âge scolaire non scolarisé ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_health1","Un membre malade n’a pas reçu de traitement ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_health2","Plus d’un membre ou plus de la moitié du ménage est malade ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_shelter1","Source de cuisson non améliorée ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_shelter2","Source d’éclairage non améliorée ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_shelter3","Plus de trois personnes par pièce de couchage ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_wash1","Installation sanitaire non améliorée ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_wash2","Source d’eau de boisson non améliorée ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_safety1","Insécurité ou violence rapportée ?",{listName:"yes_no",options:yesNo}),
      q("select_one","MDDI_safety2","Déplacement forcé au cours des 12 derniers mois ?",{listName:"yes_no",options:yesNo}),
    ]),
  },
  {
    id:"nutrition_coverage",title:"Couverture programme nutritionnel",description:"Participation et couverture des interventions nutritionnelles.",source:"WFP - script nut7_coverage",
    formulas:{output:"PNutProgPartic_yn"},
    questions:group("nutrition_coverage","Couverture nutritionnelle",[q("select_one","PNutProgPartic_yn","Le participant est-il inscrit au programme nutritionnel ?",{listName:"yes_no",options:yesNo})]),
  },
];

export function instantiateSurveyModule(template:SurveyModuleTemplate){
  const instance=crypto.randomUUID().slice(0,8);
  return template.questions.map(question=>({
    ...question,id:crypto.randomUUID(),moduleId:template.id,
    indicatorMetadata:{moduleId:template.id,source:template.source,formulas:template.formulas,instance},
  } satisfies SurveyQuestion));
}
