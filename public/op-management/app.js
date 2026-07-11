(function () {
  "use strict";

  var cspOutcomes = [
    { id: "SO1", name: "Food and essential needs" },
    { id: "SO2", name: "Nutrition outcomes" },
    { id: "SO3", name: "Livelihoods and resilience" },
    { id: "SO4", name: "National systems" },
    { id: "SO5", name: "Common services" }
  ];

  var cspActivities = [
    { id: "A1", so: "SO1", name: "Integrated food and nutrition assistance" },
    { id: "A2", so: "SO1", name: "Emergency preparedness and response capacity strengthening" },
    { id: "A3", so: "SO2", name: "Integrated nutrition package to prevent malnutrition" },
    { id: "A4", so: "SO3", name: "Livelihood support, asset creation and value chain development" },
    { id: "A5", so: "SO4", name: "Capacity strengthening for national systems" },
    { id: "A6", so: "SO5", name: "UNHAS services" },
    { id: "A7", so: "SO5", name: "On-demand supply chain, ICT and coordination services" }
  ];

  var countryTree = {
    Cameroon: {
      Adamawa: {
        "Djerem": ["Ngaoundal", "Tibati"],
        "Faro-et-Deo": ["Galim-Tignere", "Kontcha", "Mayo-Baleo", "Tignere"],
        "Mayo-Banyo": ["Bankim", "Banyo", "Mayo-Darle"],
        "Mbere": ["Dir", "Djohong", "Meiganga", "Ngaoui"],
        "Vina": ["Belel", "Martap", "Mbe", "Nganha", "Ngaoundere I", "Ngaoundere II", "Ngaoundere III", "Nyambaka"]
      },
      Centre: {
        "Haute-Sanaga": ["Bibey", "Lembe-Yezoum", "Mbandjock", "Minta", "Nanga-Eboko", "Nkoteng", "Nsem"],
        "Lekie": ["Batchenga", "Ebebda", "Elig-Mfomo", "Evodoula", "Lobo", "Monatele", "Obala", "Okola", "Saa"],
        "Mbam-et-Inoubou": ["Bafia", "Bokito", "Deuk", "Kiiki", "Kon-Yambetta", "Makenene", "Ndikinimeki", "Nitoukou", "Ombessa"],
        "Mbam-et-Kim": ["Mbangassina", "Ngambe-Tikar", "Ngoro", "Ntui", "Yoko"],
        "Mefou-et-Afamba": ["Afanloum", "Assamba", "Awae", "Edzendouan", "Esse", "Mfou", "Nkolafamba", "Soa"],
        "Mefou-et-Akono": ["Akono", "Bikok", "Mbankomo", "Ngoumou"],
        "Mfoundi": ["Yaounde I", "Yaounde II", "Yaounde III", "Yaounde IV", "Yaounde V", "Yaounde VI", "Yaounde VII"],
        "Nyong-et-Kelle": ["Biyouha", "Bondjock", "Bot-Makak", "Dibang", "Eseka", "Makak", "Matomb", "Messondo", "Ngog-Mapubi", "Nguibassal"],
        "Nyong-et-Mfoumou": ["Akonolinga", "Ayos", "Endom", "Mengang", "Nyakokombo"],
        "Nyong-et-Soo": ["Akoeman", "Dzeng", "Mbalmayo", "Mengueme", "Ngomedzap", "Nkolmetet"]
      },
      East: {
        "Boumba-et-Ngoko": ["Gari-Gombo", "Moloundou", "Salapoumbe", "Yokadouma"],
        "Haut-Nyong": ["Abong-Mbang", "Bebend", "Dimako", "Dja", "Doumaintang", "Doume", "Lomie", "Mboanz", "Mboma", "Messamena", "Messok", "Ngoyla", "Nguelemendouka", "Somalomo"],
        "Kadey": ["Batouri", "Bombe", "Kette", "Mbang", "Mbotoro", "Ndelele", "Ndem-Nam"],
        "Lom-et-Djerem": ["Belabo", "Bertoua I", "Bertoua II", "Betare-Oya", "Diang", "Garoua-Boulai", "Mandjou", "Ngoura"]
      },
      "Far North": {
        "Diamare": ["Bogo", "Dargala", "Gazawa", "Maroua I", "Maroua II", "Maroua III", "Meri", "Ndoukoula", "Pette"],
        "Logone-et-Chari": ["Blangoua", "Darak", "Fotokol", "Goulfey", "Hile-Alifa", "Kousseri", "Logone-Birni", "Makary", "Waza", "Zina"],
        "Mayo-Danay": ["Datcheka", "Gobo", "Guere", "Kai-Kai", "Kalfou", "Kar-Hay", "Maga", "Tchati-Bali", "Vele", "Wina", "Yagoua"],
        "Mayo-Kani": ["Guidiguis", "Kaele", "Mindif", "Moulvoudaye", "Moutourwa", "Porhi", "Taibong"],
        "Mayo-Sava": ["Kolofata", "Mora", "Tokombere"],
        "Mayo-Tsanaga": ["Bourrha", "Hina", "Koza", "Mayo-Moskota", "Mogode", "Mokolo", "Soulede-Roua"]
      },
      Littoral: {
        "Moungo": ["Abo Fiko", "Bare-Bakem", "Dibombari", "Loum", "Manjo", "Mbanga", "Melong", "Mombo", "Njombe-Penja", "Nkongsamba I", "Nkongsamba II", "Nkongsamba III", "Nlonako"],
        "Nkam": ["Nkondjock", "Nord-Makombe", "Yabassi", "Yingui"],
        "Sanaga-Maritime": ["Dibamba", "Dizangue", "Edea I", "Edea II", "Massock-Songloulou", "Mouanko", "Ndom", "Ngambe", "Ngwei", "Nyanon", "Pouma"],
        "Wouri": ["Douala I", "Douala II", "Douala III", "Douala IV", "Douala V", "Douala VI"]
      },
      North: {
        "Benoue": ["Bascheo", "Bibemi", "Dembo", "Demsa", "Garoua I", "Garoua II", "Garoua III", "Lagdo", "Mayo-Hourna", "Pitoa", "Tcheboa", "Touroua"],
        "Faro": ["Beka", "Poli"],
        "Mayo-Louti": ["Figuil", "Guider", "Mayo-Oulo"],
        "Mayo-Rey": ["Madingring", "Rey-Bouba", "Tchollire", "Touboro"]
      },
      "North-West": {
        "Boyo": ["Belo", "Bum", "Fundong", "Njinikom"],
        "Bui": ["Jakiri", "Kumbo", "Mbven", "Nkum", "Noni", "Oku"],
        "Donga-Mantung": ["Ako", "Misaje", "Ndu", "Nkambe", "Nwa"],
        "Menchum": ["Fungom", "Furu-Awa", "Menchum Valley", "Wum"],
        "Mezam": ["Bafut", "Bali", "Bamenda I", "Bamenda II", "Bamenda III", "Santa", "Tubah"],
        "Momo": ["Batibo", "Mbengwi", "Ngie", "Njikwa", "Widikum-Menka"],
        "Ngo-Ketunjia": ["Babessi", "Balikumbat", "Ndop"]
      },
      South: {
        "Dja-et-Lobo": ["Bengbis", "Djoum", "Meyomessala", "Meyomessi", "Mintom", "Oveng", "Sangmelima", "Zoetele"],
        "Mvila": ["Biwong-Bane", "Biwong-Bulu", "Ebolowa I", "Ebolowa II", "Efoulan", "Mengong", "Mvangan", "Ngoulemakong"],
        "Ocean": ["Akom II", "Bipindi", "Campo", "Kribi I", "Kribi II", "Lokoundje", "Lolodorf", "Mvengue", "Niete"],
        "Vallee-du-Ntem": ["Ambam", "Kye-Ossi", "Maan", "Olamze"]
      },
      "South-West": {
        "Fako": ["Buea", "Limbe I", "Limbe II", "Limbe III", "Muyuka", "Tiko", "West Coast"],
        "Koupe-Manengouba": ["Bangem", "Nguti", "Tombel"],
        "Lebialem": ["Alou", "Fontem", "Wabane"],
        "Manyu": ["Akwaya", "Eyumodjock", "Mamfe Central", "Upper Banyang"],
        "Meme": ["Konye", "Kumba I", "Kumba II", "Kumba III", "Mbonge"],
        "Ndian": ["Bamusso", "Dikome-Balue", "Ekondo-Titi", "Idabato", "Isanguele", "Kombo-Abedimo", "Kombo-Itindi", "Mundemba", "Toko"]
      },
      West: {
        "Bamboutos": ["Babadjou", "Batcham", "Galim", "Mbouda"],
        "Haut-Nkam": ["Bafang", "Bakou", "Bana", "Bandja", "Banka", "Banwa", "Kekem"],
        "Hauts-Plateaux": ["Baham", "Bamendjou", "Bangou", "Batie"],
        "Koung-Khi": ["Bayangam", "Djebem", "Poumougne"],
        "Menoua": ["Dschang", "Fokoue", "Fongo-Tongo", "Nkong-Ni", "Penka-Michel", "Santchou"],
        "Mifi": ["Bafoussam I", "Bafoussam II", "Bafoussam III"],
        "Nde": ["Bangangte", "Bassamba", "Bazou", "Tonga"],
        "Noun": ["Bangourain", "Foumban", "Foumbot", "Kouoptamo", "Koutaba", "Magba", "Malentouen", "Massangam", "Njimom"]
      }
    }
  };
  var countryCodeByName = {};
  var countryListCache = null;

  var store = {
    workspaceProfiles: [{ id: "ORG/CMR/2026", organizationName: "NutVitaGlobalis Programme Office", organizationType: "Organisation nutritionnelle", country: "Cameroon", headquartersLocation: "Douala", mandate: "Coordonner des projets de nutrition, securite alimentaire et renforcement des systemes.", governanceModel: "Comite de pilotage mensuel avec validation technique et financiere", focalPointName: "Paul Zebaze", focalPointFunction: "Portfolio Lead", phone: "+237 000 000 000", email: "contact@nutvitaglobalis.com", status: "Validated" }],
    fieldOffices: [{ id: "001/CMR/2026", country: "Cameroon", officeType: "Bureau Terrain", name: "Buea Office", location: "Buea", staffTotal: 24, male: 14, female: 10, activeVehicles: 5, assetCount: 12, focalPointName: "Nora Atem", focalPointFunction: "Head of Office", phone: "+237 000 000 001", email: "buea.office@example.org", status: "Approved" }],
    sites: [{ id: "001/CMR/SW/2026", country: "Cameroon", region: "South-West", department: "Fako", arrondissement: "Buea", accessLevel: "Medium", securityPhase: "Watch", status: "Approved" }],
    fdps: [{ id: "001/Buea", name: "Buea Community FDP", fdpType: "Communautaire", otherType: "", arrondissement: "Buea", siteFocalPointName: "Nora Atem", siteFocalPointSex: "Female", phone: "+237 600 000 020", email: "fdp.buea@example.org", status: "Validated" }],
    partners: [{ vendor: "10004567", name: "Local Relief Initiative", nature: "ONG Nationale", resourcePerson: "Grace M.", phone: "+237 600 000 000", email: "contact@lri.org", address: "Buea", status: "Active" }],
    cooperativePartners: [],
    strategicDocuments: [{ id: "DOC001/05/2026", name: "CSP2", validFrom: "2026-01", validTo: "2030-12", soIds: ["SO1", "SO2"], cspActivityIds: ["A1", "A2"], status: "Validated" }],
    grants: [{ code: "CMR-CERF-2026-001", donor: "CERF", grantModality: "Cash", valueUsd: 1200000, tdd: "2026-12-31", grantStatus: "Actif", foodItems: [], comment: "Emergency response window", status: "Validated" }],
    staffs: [{ id: "STF001", lastName: "Atem", firstName: "Nora", sex: "Female", functionName: "Programme Associate", fieldOfficeId: "001/CMR/2026", contractType: "SC", otherContract: "", email: "nora.atem@example.org", phone: "+237 600 000 010", startDate: "2026-01-01", endDate: "2026-12-31", staffStatus: "Actif", reportsTo: "" }],
    partnerStaffs: [],
    portfolios: [{ id: "PORT-NUT-2026", title: "Nutrition and food security portfolio", strategicDocumentId: "DOC001/05/2026", ownerId: "STF001", priority: "High", valueStatement: "Contribuer a la securite alimentaire, a la prevention de la malnutrition et a la resilience communautaire.", governanceCadence: "Monthly portfolio review", status: "Validated" }],
    programmes: [{ id: "PRG-NUT-2026", portfolioId: "PORT-NUT-2026", title: "Community nutrition and food assistance programme", strategicDocumentId: "DOC001/05/2026", managerId: "STF001", startDate: "2026-05-01", endDate: "2026-12-31", expectedBenefits: "Amelioration de l'acces alimentaire et du suivi nutritionnel dans les zones ciblees.", status: "Validated" }],
    projects: [{ id: "P001A", title: "Buea emergency food assistance", portfolioId: "PORT-NUT-2026", programmeId: "PRG-NUT-2026", flaNumber: "AGR/CMR/2026/001", soaNumber: "SOA/CMR/2026/001", poNumber: "4500012345", strategicDocumentId: "DOC001/05/2026", startDate: "2026-05-01", endDate: "2026-12-31", currency: "XAF", budgetXaf: 275000000, partnerVendor: "10004567", grantCodes: ["CMR-CERF-2026-001"], fdpIds: ["001/Buea"], projectFdps: [{ fdpId: "001/Buea", fdpType: "Communautaire", beneficiaries: 12000 }], soIds: ["SO1"], cspActivityIds: ["A1", "A2"] }],
    stakeholders: [],
    implementationPlans: [{ id: "IMP/P001A/2026", projectId: "P001A", planType: "Integrated implementation plan", workstream: "Coordination generale", ownerId: "STF001", startDate: "2026-05-01", endDate: "2026-12-31", milestone: "Distribution mensuelle et rapport de performance valides", deliverable: "Plan integre consolide avec budget, calendrier, M&E et preuves", dependencies: "Grant actif, partenaire valide, sites accessibles", acceptanceCriteria: "Livrables valides, ecarts documentes et actions correctives suivies", status: "Validated" }],
    communicationPlans: [],
    procurementPlans: [],
    riskRegisters: [{ id: "RISK/P001A/001", projectId: "P001A", riskCategory: "Access", riskStatement: "Restriction d'acces aux sites de distribution", probability: "Medium", impact: "High", responseStrategy: "Mitigate", ownerId: "STF001", mitigationAction: "Adapter le calendrier et confirmer les sites de repli avec les autorites locales", reviewDate: "2026-06-30", riskStatus: "Open", status: "Validated" }],
    qualityPlans: [],
    resourcePlans: [],
    projectActivities: [{ id: "Act001/P001A", projectId: "P001A", modality: "Cash", grantCodes: ["CMR-CERF-2026-001"], label: "Monthly food assistance distribution in Buea", cspActivityIds: ["A1"], startDate: "2026-05-01", endDate: "2026-05-31", partnerFocalPoint: "Grace M.", phone: "+237 600 000 000", email: "contact@lri.org" }],
    projectSubActivities: [{ id: "SAct001/Act001/P001A", projectId: "P001A", activityId: "Act001/P001A", label: "Community mobilization before distribution", kpiIds: ["Ind001/Act001/P001A/P001A"], status: "Draft" }],
    kpis: [{ id: "Ind001/Act001/P001A/P001A", activityId: "Act001/P001A", label: "Number of beneficiaries assisted", verificationSource: "Partner report", frequency: "Mensuelle", otherFrequency: "", pamOwner: "STF001", target: "12000", comment: "Monthly distribution target" }],
    budgets: [{ id: "001/P001A", projectId: "P001A", partnerVendor: "10004567", costCategory: "Food transfer MT Based", subCategory: "Transport", label: "Transport and delivery for monthly distribution", cspActivityId: "A1", amountXaf: 90000000 }],
    grantInKinds: [],
    baselines: [],
    monthlyPlans: [],
    monthlyReports: [],
    monthlyExpenses: [],
    processIndicators: [],
    processReports: [],
    recommendations: [],
    distributionReports: [],
    nfis: [],
    nfiDistributions: [],
    nfiInventories: [],
    partnerInvoices: [],
    partnerInvoicePayments: [],
    amendments: [],
    distributionCycles: [],
    savedProgressReports: [],
    savedInvoices: [],
    hgsfIngredients: [],
    hgsfMenus: [],
    hgsfSchoolMenus: [],
    hgsfEstimations: [],
    hgsfPurchaseOrders: [],
    hgsfDeliveries: [],
    hgsfDeliveryInvoices: [],
    hgsfInvoicePayments: [],
    hgsfSchoolCoopPayments: [],
    assistanceRations: [],
    gfdNeeds: [],
    cbtNeeds: [],
    nutritionNeeds: [],
    users: []
  };
  var storageKey = "op-management-store-v1";
  var authStorageKey = "op-management-current-user";
  var adminEmail = "pauln.zebaze@gmail.com";
  var adminDefaultPassword = "admin@123";

  var pages = [
    ["home", "Accueil", "A"],
    ["operationsDashboard", "Dashboard portefeuille", "O"],
    ["workspaceProfiles", "Organisation / structure", "W"],
    ["fieldOffices", "Office in charge", "O"],
    ["fdps", "Final Distribution Point", "D"],
    ["sites", "Sites administratifs", "S"],
    ["partners", "Partenaire cooperant", "P"],
    ["cooperativePartners", "Coops/GICs et autres", "C"],
    ["strategicDocuments", "Documents strategiques", "G"],
    ["grants", "Grants", "$"],
    ["staffs", "Staffs", "H"],
    ["portfolios", "Portefeuilles", "F"],
    ["programmes", "Programmes", "M"],
    ["projects", "Projets", "J"],
    ["projectPlan", "Plan du projet", "P"],
    ["stakeholders", "Parties prenantes", "E"],
    ["implementationPlans", "Plans integres", "I"],
    ["communicationPlans", "Plan communication", "C"],
    ["procurementPlans", "Plan procurement", "P"],
    ["riskRegisters", "Registre risques", "R"],
    ["qualityPlans", "Plan qualite", "Q"],
    ["resourcePlans", "Plan ressources", "H"],
    ["projectActivities", "Activites projet", "A"],
    ["monthlyPlans", "Plan mensuel", "M"],
    ["monthlyReports", "Reporting Quantitatif Mensuel", "R"],
    ["monthlyExpenses", "Depenses mensuelles", "D"],
    ["recommendations", "Suivi recommandations", "S"],
    ["distributionReports", "Bulk distributions IK/CBT", "L"],
    ["nfis", "NFI", "N"],
    ["nfiDistributions", "Distribution NFI", "D"],
    ["nfiInventories", "Inventaire NFI", "I"],
    ["progressReport", "Progress report", "Y"],
    ["partnerInvoice", "Facture partenaire", "N"],
    ["partnerInvoices", "Enregistrer une facture", "F"],
    ["partnerInvoicePayments", "Paiement factures", "P"],
    ["hgsfIngredients", "HGSF - Ingredients", "I"],
    ["hgsfMenus", "HGSF - Menus", "M"],
    ["hgsfSchoolMenus", "HGSF - Ecoles/Menu", "E"],
    ["hgsfEstimations", "HGSF - Estimation", "H"],
    ["hgsfPurchaseOrders", "HGSF - Bon commande", "C"],
    ["hgsfDeliveries", "HGSF - Reception", "R"],
    ["hgsfDeliveryInvoices", "HGSF - Facture livraison", "F"],
    ["hgsfInvoicePayments", "HGSF - Paiement facture", "P"],
    ["hgsfSchoolCoopPayments", "HGSF - Paiement ecole/coop", "S"],
    ["assistanceRations", "Rations assistance", "A"],
    ["gfdNeeds", "Besoins GFD In kind", "G"],
    ["cbtNeeds", "Besoins CBT", "C"],
    ["nutritionNeeds", "Besoins Nutrition", "N"],
    ["processIndicators", "Process monitoring", "Q"],
    ["processReports", "Rapport process", "T"],
    ["amendments", "Amendements", "U"],
    ["kpis", "KPIs", "K"],
    ["projectSubActivities", "Sous activites", "S"],
    ["budgets", "Budget projet", "B"],
    ["grantInKinds", "Grants en nature", "G"],
    ["baselines", "Baseline", "I"],
    ["monthlyPlanning", "Planification mensuelle", "M"],
    ["executionWorkspace", "Execution", "X"],
    ["reportingWorkspace", "Reporting", "R"],
    ["invoiceWorkspace", "Facturation partenaires", "F"],
    ["nfiWorkspace", "Gestion NFI", "N"],
    ["users", "Utilisateurs", "U"]
  ];

  var navGroups = [
    { title: "Accueil", className: "group-home", pages: ["operationsDashboard"] },
    { title: "Espace de travail", className: "group-setup", pages: ["workspaceProfiles", "fieldOffices", "fdps", "sites", "partners", "cooperativePartners", "strategicDocuments", "grants", "staffs"] },
    { title: "Gouvernance", className: "group-framework", pages: ["portfolios", "programmes", "projects", "projectPlan"] },
    { title: "Plans integres", className: "group-planning", pages: ["implementationPlans", "budgets", "monthlyPlanning", "processIndicators", "communicationPlans", "procurementPlans", "riskRegisters", "qualityPlans", "resourcePlans"] },
    { title: "Execution", className: "group-execution", pages: ["executionWorkspace"] },
    { title: "Reporting", className: "group-reporting", pages: ["reportingWorkspace"] },
    { title: "Facturation partenaires", className: "group-reporting", pages: ["invoiceWorkspace"] },
    { title: "Gestion NFI", className: "group-setup", pages: ["nfiWorkspace"] },
    { title: "Estimateur besoins", className: "group-needs", pages: ["hgsfIngredients", "hgsfMenus", "hgsfSchoolMenus", "hgsfEstimations", "hgsfPurchaseOrders", "hgsfDeliveries", "hgsfDeliveryInvoices", "hgsfInvoicePayments", "hgsfSchoolCoopPayments", "gfdNeeds", "assistanceRations", "cbtNeeds", "nutritionNeeds"] },
    { title: "Ajustements", className: "group-adjustments", pages: ["amendments", "users"] }
  ];

  var state = { page: "home", query: "", editingId: "", formOpen: false, contextCountry: "Cameroon", contextFieldOffice: "", contextProjectId: "", workspaceBackPage: "", currentUserEmail: "" };
  var cpContributionGrantCode = "CONTRIBUTION_CP";
  var cpContributionGrantLabel = "Contribution CP";
  var costSubCategories = {
    "Food transfer MT Based": ["Staff Salary", "Staff related cost", "Transport", "Storage", "Food management and Transformation service", "Other delivery cost"],
    "Food transfer Non MT Based": ["Staff Salary", "Staff related cost", "Transport", "Storage", "Other delivery cost"],
    "Cash transfer": ["Staff Salary", "Staff related cost", "Financial service provider cost", "Distribution cost", "Reconciliation cost", "Other delivery cost"],
    "Capacity Strengthening": ["Staff Salary", "Staff related cost", "Training/Meeting/Workshop", "Equipment and supply", "Contracted service", "Transport", "Other cost"],
    "Technical service": ["Staff Salary", "Staff related cost", "Mid-Term evaluation cost", "Assessment cost", "Evaluation cost", "Monitoring Cost", "Other contracted service"],
    "CP Direct support cost": ["Staff Salary", "Staff related cost", "Office Rent and Running cost", "Vehicle", "Equipment and supplies", "Communication", "Utilities"],
    "Management fee": ["Non applicable"]
  };

  var elements = {};
  var configs = {};

  startWhenReady();

  function startWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }

  function init() {
    try {
      bindElements();
      loadStoredData();
      ensureAdminUser();
      loadCurrentUser();
      buildConfigs();
      migrateWorkflowStatuses();
      window.OPMProgressAction = handleSavedProgressAction;
      renderNav();
      elements.search.oninput = function () {
        state.query = elements.search.value.toLowerCase();
        render();
      };
      if (elements.contextCountry) elements.contextCountry.onchange = function () {
        state.contextCountry = elements.contextCountry.value;
        var offices = fieldOfficesForCountry(state.contextCountry);
        state.contextFieldOffice = offices.length ? offices[0].id : "";
        render();
      };
      if (elements.contextFieldOffice) elements.contextFieldOffice.onchange = function () {
        state.contextFieldOffice = elements.contextFieldOffice.value;
        render();
      };
      render();
    } catch (error) {
      showAppError(error);
    }
  }

  function bindElements() {
    elements.nav = document.getElementById("nav-list");
    elements.title = document.getElementById("view-title");
    elements.kicker = document.getElementById("view-kicker");
    elements.formKicker = document.getElementById("form-kicker");
    elements.formTitle = document.getElementById("form-title");
    elements.form = document.getElementById("record-form");
    elements.formPanel = document.getElementById("form-panel");
    elements.layout = document.getElementById("config-layout");
    elements.closeForm = document.getElementById("close-form");
    elements.tableTitle = document.getElementById("table-title");
    elements.tableCount = document.getElementById("table-count");
    elements.tableHead = document.getElementById("table-head");
    elements.tableBody = document.getElementById("table-body");
    elements.search = document.getElementById("search-input");
    elements.contextCountry = document.getElementById("context-country");
    elements.contextFieldOffice = document.getElementById("context-field-office");
    elements.metricFo = document.getElementById("metric-fo");
    elements.metricPartners = document.getElementById("metric-partners");
    elements.metricProjects = document.getElementById("metric-projects");
    elements.metricBudget = document.getElementById("metric-budget");
    elements.metricKpis = document.getElementById("metric-kpis");
    elements.portfolioCount = document.getElementById("portfolio-count");
  }

  function loadStoredData() {
    try {
      if (!window.localStorage) return;
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      var saved = JSON.parse(raw);
      for (var key in store) {
        if (Object.prototype.hasOwnProperty.call(store, key) && Object.prototype.toString.call(saved[key]) === "[object Array]") store[key] = saved[key];
      }
      ensureAdminUser();
      migrateWorkflowStatuses();
    } catch (error) {
      showAppError(new Error("Impossible de charger les donnees sauvegardees: " + error.message));
    }
  }

  function saveStoredData() {
    try {
      if (window.localStorage) window.localStorage.setItem(storageKey, JSON.stringify(store));
    } catch (error) {
      showAppError(new Error("Impossible de sauvegarder les donnees localement: " + error.message));
    }
  }

  function buildConfigs() {
    configs.users = cfg("Gestion des utilisateurs", "Administration des acces", "Enregistrer l'utilisateur", ["id", "lastName", "firstName", "email", "role", "managerEmail", "status"], [
      input("id", "ID utilisateur", "text", false, "Auto: USR001/05/2026"),
      input("lastName", "Nom", "text", true),
      input("firstName", "Prenom", "text", true),
      select("sex", "Sexe", true, ["Female", "Male", "Other / prefer not to say"]),
      select("ageCategory", "Categorie d'age", true, ["18-35 ans", "36-45 ans", "46-55 ans", "55 et plus"]),
      input("email", "Adresse email", "email", true),
      input("password", "Mot de passe", "password", true),
      select("role", "Niveau d'acces", true, ["Visitor", "Creator", "Editor", "Validator", "Deputy Admin", "Admin"]),
      select("managerEmail", "Rattache a", false, function () { return userManagerOptions(); }, true),
      multi("accessPages", "Elements de parametrage / modules autorises", function () { return assignableAccessPageOptions(); }, true),
      multi("accessProjects", "Projets autorises", function () { return assignableProjectOptions(); }, true),
      multi("accessRegions", "Region(s) autorisee(s)", function () { return assignableRegionOptions(); }, true),
      multi("accessDepartments", "Departement(s) autorise(s)", function () { return assignableDepartmentOptions(); }, true),
      multi("accessArrondissements", "Arrondissement(s) autorise(s)", function () { return assignableArrondissementOptions(); }, true),
      multi("accessFdps", "FDP(s) autorise(s)", function () { return assignableFdpOptions(); }, true),
      select("status", "Statut du compte", true, ["Active", "Inactive"]),
      textarea("accessComment", "Commentaire / justification des acces")
    ]);
    configs.workspaceProfiles = cfg("Registre organisation / structure", "Configuration de l'espace de travail", "Enregistrer l'organisation", ["id", "organizationName", "organizationType", "country", "headquartersLocation", "focalPointName", "governanceModel", "status"], [
      input("id", "ID organisation", "text", false, "Auto: ORG/CMR/2026"),
      input("organizationName", "Nom officiel de l'organisation / structure", "text", true),
      select("organizationType", "Type de structure", true, ["ONG", "Entreprise", "Institution publique", "Programme pays", "Cabinet / bureau projet", "Association", "Fondation", "Autre"]),
      country("country", "Pays principal", true),
      input("headquartersLocation", "Siege / localisation principale", "text", true),
      textarea("mandate", "Mandat et champ d'intervention"),
      textarea("governanceModel", "Modele de gouvernance et cadence de decision", "Ex: comite de pilotage mensuel, revue budgetaire trimestrielle, validation technique."),
      input("focalPointName", "Point focal organisation", "text", true),
      input("focalPointFunction", "Fonction du point focal", "text"),
      input("phone", "Telephone", "tel"),
      input("email", "Email institutionnel", "email")
    ]);
    configs.portfolios = cfg("Registre des portefeuilles", "Alignement strategique", "Enregistrer le portefeuille", ["id", "title", "strategicDocumentId", "ownerId", "priority", "governanceCadence", "status"], [
      input("id", "ID portefeuille", "text", false, "Auto: PORT-001"),
      input("title", "Nom du portefeuille", "text", true),
      select("strategicDocumentId", "Document strategique de reference", true, function () { return optionPairs(store.strategicDocuments, "id", "name"); }),
      select("ownerId", "Responsable portefeuille", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      select("priority", "Priorite strategique", true, ["Critical", "High", "Medium", "Low"]),
      textarea("valueStatement", "Valeur attendue / contribution aux objectifs strategiques"),
      input("governanceCadence", "Cadence de revue", "text", false, "Monthly portfolio review"),
      textarea("decisionRules", "Regles de priorisation et d'arbitrage")
    ]);
    configs.programmes = cfg("Registre des programmes", "Coordination des benefices", "Enregistrer le programme", ["id", "portfolioId", "title", "strategicDocumentId", "managerId", "startDate", "endDate", "status"], [
      input("id", "ID programme", "text", false, "Auto: PRG-001"),
      select("portfolioId", "Portefeuille rattache", true, function () { return optionPairs(store.portfolios, "id", "title"); }, true),
      input("title", "Nom du programme", "text", true),
      select("strategicDocumentId", "Document strategique de reference", true, function () { return optionPairs(store.strategicDocuments, "id", "name"); }),
      select("managerId", "Programme manager", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      input("startDate", "Date de debut", "date", true),
      input("endDate", "Date de fin", "date", true),
      textarea("expectedBenefits", "Benefices attendus et indicateurs de valeur"),
      textarea("coordinationMechanism", "Mecanisme de coordination entre projets")
    ]);
    configs.fieldOffices = cfg("Creation des Offices in charge", "Referentiel terrain", "Enregistrer l'office", ["id", "country", "officeType", "name", "location", "staffTotal", "activeVehicles", "assetCount", "status"], [
      input("id", "ID Office", "text", false, "Auto: 001/CMR/2026", "", "Genere automatiquement: 03 chiffres / initiales pays / annee de creation."),
      country("country", "Pays", true),
      select("officeType", "Type de bureau", true, ["Head Quarter", "Country Office", "Bureau Terrain"]),
      input("name", "Nom de l'office", "text", true), input("location", "Localisation", "text", true),
      input("staffTotal", "Nombre de staff", "number", true), input("male", "Homme", "number", true), input("female", "Femme", "number", true),
      input("activeVehicles", "Nombre de vehicules actifs", "number", true), input("assetCount", "Nombre d'assets en possession", "number", true),
      input("focalPointName", "Nom du Point focal FO", "text"), input("focalPointFunction", "Fonction du Point focal FO", "text"),
      input("phone", "Contact telephonique", "tel"), input("email", "Email", "email")
    ]);
    configs.sites = cfg("Creation des sites administratifs", "Referentiel geographique", "Enregistrer le site administratif", ["id", "country", "region", "department", "arrondissement", "arrondissementFocalPointName", "arrondissementFocalPointPhone", "accessLevel", "status"], [
      input("id", "ID du site administratif", "text", false, "Auto: 001/CMR/SW/2026", "", "Genere automatiquement: 03 chiffres / initiales pays / initiales region / annee de creation."),
      select("country", "Pays", true, function () { return Object.keys(countryTree); }),
      select("region", "Region / Province / Etat", true, function (draft) { return Object.keys(countryTree[draft.country] || {}); }, false, "country"),
      select("department", "Departement / District", true, function (draft) { return Object.keys(regionTree(draft) || {}); }, false, "region"),
      select("arrondissement", "Arrondissement / Commune", true, function (draft) { return (regionTree(draft)[draft.department] || []); }, false, "department"),
      input("arrondissementFocalPointName", "Nom du PF arrondissement", "text"),
      input("arrondissementFocalPointPhone", "Contact du PF arrondissement", "tel"),
      select("accessLevel", "Niveau d'acces", false, ["High", "Medium", "Low", "No access"]),
      select("securityPhase", "Niveau securite", false, ["Normal", "Watch", "Restricted", "Suspended"])
    ]);
    configs.fdps = cfg("Final Distribution Point (FDP)", "Referentiel distribution", "Enregistrer le FDP", ["id", "name", "fdpType", "arrondissement", "siteFocalPointName", "siteFocalPointSex", "phone", "status"], [
      input("id", "ID FDP", "text", false, "Auto: 001/Buea", "", "Genere automatiquement: 03 chiffres / nom de l'arrondissement."),
      input("name", "Nom du FDP", "text", true),
      select("fdpType", "Type", true, ["Communautaire", "Ecole", "FOSA", "Autre"]),
      input("otherType", "Autre a preciser", "text", false, "", "", "", "otherFdpType"),
      search("arrondissement", "Arrondissement rattache", true, function () { return arrondissementOptions(); }),
      input("studentCount", "Nombre d'eleves / beneficiaires", "number"),
      input("siteFocalPointName", "Nom du PF site", "text", true),
      select("siteFocalPointSex", "Sexe du PF site", true, ["Female", "Male", "Other / prefer not to say"]),
      input("phone", "Contact Telephone", "tel", true),
      input("email", "Adresse email disponible", "email")
    ]);
    configs.partners = cfg("Creation des partenaires cooperants", "Partenaire cooperant", "Enregistrer le partenaire cooperant", ["vendor", "name", "nature", "resourcePerson", "phone", "bankingInformation"], [
      input("vendor", "Numero Vendor du partenaire", "text", true), input("name", "Nom du partenaire", "text", true),
      select("nature", "Nature", true, ["ONGI", "ONG Nationale", "Association", "CBO", "Red Cross / Red Crescent", "UN Agency", "Government entity", "Private service provider", "Faith-based organization", "Research institution", "Other"]),
      input("resourcePerson", "Personne ressource", "text", true), input("phone", "Contact organisation", "tel", true), input("email", "Email", "email"), input("address", "Adresse", "text"),
      textarea("bankingInformation", "BANKING INFORMATION"),
      select("status", "Statut", false, ["Active", "Prequalified", "Suspended", "Closed"])
    ]);
    configs.cooperativePartners = cfg("Creation des Coops/GICs et autres", "Referentiel partenaires locaux", "Enregistrer l'organisation", ["id", "name", "organizationType", "arrondissement", "schoolFdpIds", "focalPointName", "phone", "status"], [
      input("id", "ID organisation", "text", false, "Auto: COOP001"),
      input("name", "Nom de l'organisation", "text", true),
      select("organizationType", "Type d'organisation", true, ["Cooperative", "GIC", "Association locale", "Groupe communautaire", "Supplier", "Autre"]),
      input("otherType", "Autre a preciser", "text", false, "", "", "", "otherCoopType"),
      country("country", "Pays", true),
      select("region", "Region / Province / Etat", true, function (draft) { return Object.keys(countryTree[draft.country] || {}); }, false, "country"),
      select("department", "Departement / District", true, function (draft) { return Object.keys(regionTree(draft) || {}); }, false, "region"),
      select("arrondissement", "Arrondissement / Commune", true, function (draft) { return (regionTree(draft)[draft.department] || []); }, false, "department"),
      multi("localizationRegions", "Regions des ecoles rattachees", hgsfRegionOptions, false, "country"),
      multi("localizationDepartments", "Departements des ecoles", hgsfDepartmentOptions, false, "localizationRegions"),
      multi("localizationArrondissements", "Arrondissements des ecoles", hgsfArrondissementOptions, false, "localizationDepartments"),
      multi("schoolFdpIds", "Ecoles rattachees", hgsfSchoolHierarchyOptions, false, "localizationArrondissements"),
      input("focalPointName", "Nom du point focal", "text", true),
      input("focalPointFunction", "Fonction du point focal", "text"),
      input("phone", "Contact telephone", "tel", true),
      input("email", "Email", "email"),
      input("address", "Adresse", "text"),
      textarea("comment", "Commentaire"),
      select("status", "Statut", false, ["Active", "Submitted", "Validated", "Suspended", "Closed"])
    ]);
    configs.strategicDocuments = cfg("Documents strategiques utilises", "Parametrage strategique", "Enregistrer le document", ["id", "name", "validFrom", "validTo", "soIds", "cspActivityIds", "status"], [
      input("id", "ID document", "text", false, "Auto: DOC001/05/2026", "", "Genere automatiquement avec le mois et l'annee."),
      input("name", "Nom du document strategique", "text", true, "CSP2"),
      input("validFrom", "Valide pour la periode de", "month", true),
      input("validTo", "A", "month", true),
      multi("soIds", "SO associes au document strategique", function () { return cspOutcomes.map(function (so) { return { value: so.id, label: so.id + " - " + so.name }; }); }),
      multi("cspActivityIds", "Activites associees au document strategique", function (draft) { return cspActivities.filter(function (a) { return !(draft.soIds || []).length || (draft.soIds || []).indexOf(a.so) > -1; }).map(activityOption); }, false, "soIds"),
      textarea("comment", "Commentaire")
    ]);
    configs.grants = cfg("Enregistrement des Grants", "Financement", "Enregistrer le grant", ["code", "donor", "grantModality", "valueUsd", "tdd", "grantStatus"], [
      input("code", "Code du Grant", "text", true), input("donor", "Donateur", "text", true),
      select("grantModality", "Modalite du grant", true, ["Cash", "Vivre", "Capacity Strengthening", "Technical service"]),
      input("valueUsd", "Valeur en USD", "number", false, "", "", "", "cash"), input("tdd", "TDD", "date", false, "", "", "", "cash"),
      foodItems("foodItems", "Quantites par type de vivres"),
      select("grantStatus", "Statut du grant", true, ["Actif", "Inactif"]), textarea("comment", "Commentaire")
    ]);
    configs.staffs = cfg("Creation des staffs", "Ressources humaines", "Enregistrer le staff", ["id", "lastName", "firstName", "sex", "functionName", "staffAffiliation", "zoningLevel", "fieldOfficeId", "staffStatus", "reportsTo"], [
      input("id", "ID staff", "text", true, "STF002"), input("lastName", "Nom", "text", true), input("firstName", "Prenom", "text", true),
      select("sex", "Sexe", true, ["Female", "Male", "Other / prefer not to say"]), input("functionName", "Fonction", "text", true),
      select("staffAffiliation", "Rattachement staff", true, ["Country Office", "Office in charge", "Partenaire"]),
      select("partnerVendor", "Partenaire rattache", false, function () { return optionPairs(store.partners, "vendor", "name"); }, true, "", "partnerStaff"),
      select("fieldOfficeId", "Office in charge", false, function () { return optionPairs(store.fieldOffices, "id", "name"); }, true, "", "fieldOfficeStaff"),
      select("zoningLevel", "Zonage", false, ["Pays", "Regional", "Departemental", "Arrondissement"], true, "", "fieldOrPartnerStaff"),
      country("zoningCountry", "Pays de rattachement", false, "countryZoning"),
      search("zoningRegion", "Region de rattachement", false, function () { return regionOptions({ country: "Cameroon" }); }, "regionZoning"),
      search("zoningDepartment", "Departement de rattachement", false, function () { return departmentOptions({ country: "Cameroon" }); }, "departmentZoning"),
      multi("zoningArrondissements", "Arrondissements de rattachement", function () { return arrondissementOptions(); }, true, "", "arrondissementZoning"),
      multi("fdpIds", "FDP rattaches", function (draft) { return fdpsForArrondissements(draft.zoningArrondissements); }, true, "zoningArrondissements", "arrondissementZoning"),
      select("contractType", "Type de contract", true, ["Volontaire", "SSA", "SC", "FT", "Autre"]), input("otherContract", "Autre a preciser", "text", false, "", "", "", "otherContract"),
      input("email", "Email", "email"), input("phone", "Contact telephonique", "tel"), input("startDate", "Date debut contract", "date"), input("endDate", "Date fin contract", "date"),
      select("staffStatus", "Statut du staff", true, ["Actif", "Inactif"]),
      select("reportsTo", "Rapporte a", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true)
    ]);
    configs.projects = cfg("Enregistrement des projets", "Projet", "Enregistrer le projet", ["id", "title", "portfolioId", "programmeId", "strategicDocumentId", "startDate", "endDate", "currency", "partnerVendor", "grantCodes", "fdpIds", "budgetXaf"], [
      input("id", "ID du projet", "text", true, "P001A"), input("title", "Titre du projet", "text", true),
      select("portfolioId", "Portefeuille rattache", false, function () { return optionPairs(store.portfolios, "id", "title"); }, true),
      select("programmeId", "Programme rattache", false, function (draft) { return programmeOptionsForPortfolio(draft.portfolioId); }, true, "portfolioId"),
      select("strategicDocumentId", "Document strategique rattache", true, function () { return optionPairs(store.strategicDocuments, "id", "name"); }),
      input("agreementNumber", "Numero d'accord / contrat", "text"), input("soaNumber", "SOA Number", "text"), input("poNumber", "PO Number", "text"),
      input("startDate", "Date de debut du projet", "date", true), input("endDate", "Date de fin du projet", "date", true),
      select("currency", "Monnaie du projet", true, currencyOptions()),
      input("budgetXaf", "Budget total du projet", "number", true, "", "", "La monnaie selectionnee sera appliquee aux pages et elements rattaches au projet."),
      select("partnerVendor", "Partenaire de mise en oeuvre", true, function () { return optionPairs(store.partners, "vendor", "name"); }),
      multi("grantCodes", "Grants", function () { return activeGrantOptions(); }, true),
      multi("subActivityTypes", "Sous activites retenues", ["GFA", "Nutrition", "FFA", "HGSF", "Autre"], true),
      multi("modalities", "Modalites retenues", ["CBT", "In Kind", "Voucher"], true),
      projectFdps("projectFdps", "FDP rattaches et beneficiaires", "grantCodes"),
      multi("soIds", "SO associes", function (draft) { return strategicSoOptions(draft.strategicDocumentId); }, false, "strategicDocumentId"),
      multi("cspActivityIds", "Activites associees", function (draft) { return strategicActivityOptions(draft.strategicDocumentId, draft.soIds); }, false, "soIds")
    ]);
    configs.stakeholders = cfg("Registre des parties prenantes et staff partenaire", "Stakeholders", "Enregistrer la partie prenante", ["id", "projectId", "type", "lastName", "firstName", "partnerVendor", "isPartnerStaff", "localizedStakeholder", "localizationLevel", "fdpIds"], [
      select("projectId", "ID Project", true, function () { return optionPairs(store.projects, "id", "title"); }), input("id", "ID partie prenante", "text", false, "Auto: 001/P001A"), input("lastName", "Nom", "text", true), input("firstName", "Prenom", "text", true),
      select("isPartnerStaff", "Staff du partenaire implique dans le projet ?", true, ["Non", "Oui"]),
      select("partnerVendor", "Partenaire cooperant", false, function (draft) { return partnerOptionsForProject(draft.projectId); }, true, "projectId"),
      select("sex", "Sexe", false, ["Female", "Male", "Other / prefer not to say"], true, "", "partnerStaffStakeholder"),
      input("startDate", "Date debut implication", "date", false, "", "", "", "partnerStaffStakeholder"),
      input("endDate", "Date fin implication", "date", false, "", "", "", "partnerStaffStakeholder"),
      select("staffStatus", "Statut du staff partenaire", false, ["Actif", "Inactif"], true, "", "partnerStaffStakeholder"),
      select("localizedStakeholder", "Partie prenante localisee ?", true, ["Non", "Oui"]),
      select("localizationLevel", "Niveau de localisation", false, ["Pays", "Region", "Departement", "Arrondissement", "FDP"], true, "", "localizedStakeholder"),
      select("localizationCountry", "Pays concerne", false, function () { return Object.keys(countryTree); }, true, "", "stakeholderCountrySites"),
      multi("localizationRegions", "Regions concernees", function (draft) { return monthlyRegionOptions(draft); }, true, "localizationCountry", "stakeholderRegionSites"),
      multi("localizationDepartments", "Departements concernes", function (draft) { return monthlyDepartmentOptions(draft); }, true, "localizationRegions", "stakeholderDepartmentSites"),
      multi("localizationArrondissements", "Arrondissements concernes", function (draft) { return monthlyArrondissementHierarchyOptions(draft); }, true, "localizationDepartments", "stakeholderArrondissementSites"),
      multi("fdpIds", "FDP rattaches", function (draft) { return monthlyFdpHierarchyOptions(draft); }, true, "localizationArrondissements", "stakeholderFdpSites"),
      select("type", "Type de partie prenante", false, ["Government", "Traditional authority", "Community leader", "Donor", "Sector coordination", "Local NGO", "Private sector", "Media", "Beneficiary representative", "UN Agency", "Supplier", "Municipality Autorities", "Local Comittee", "International NGO", "Association/OSC", "Other"]),
      input("functionName", "Fonction", "text"), input("email", "Email", "email"), input("phone", "Contact telephonique", "tel"),
      multi("interests", "Interet majeur", ["Food assistance", "Nutrition", "Protection", "Accountability", "Funding", "Access", "Social cohesion", "Resilience", "Supply chain", "Visibility", "Autre"]),
      input("otherInterest", "Autre a preciser", "text", false, "", "", "", "otherStakeholderInterest"),
      textarea("roleComment", "Commentaire / role de la partie prenante")
    ]);
    configs.partnerStaffs = cfg("Creation de la liste de staff associee au partenaire", "Staff partenaire", "Enregistrer le staff partenaire", ["id", "projectId", "partnerVendor", "lastName", "firstName", "sex", "functionName", "email", "phone", "staffStatus"], [
      input("id", "ID staff partenaire", "text", false, "Auto: 001/05/2026/LRI", "", "Genere automatiquement: 03 chiffres / mois creation / annee creation / initiales CP."),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("partnerVendor", "Partenaire de mise en oeuvre", false, function (draft) { return partnerOptionsForProject(draft.projectId); }, false, "projectId"),
      input("lastName", "Nom", "text", true),
      input("firstName", "Prenom", "text", true),
      select("sex", "Sexe", true, ["Female", "Male", "Other / prefer not to say"]),
      input("functionName", "Fonction", "text", true),
      input("email", "Email", "email"),
      input("phone", "Contact telephonique", "tel"),
      input("startDate", "Date debut", "date"),
      input("endDate", "Date fin", "date"),
      select("staffStatus", "Statut du staff", true, ["Actif", "Inactif"]),
      textarea("comment", "Commentaire")
    ]);
    configs.implementationPlans = cfg("Plans integres de mise en oeuvre", "Integration, calendrier et livrables", "Enregistrer le plan integre", ["id", "projectId", "planType", "workstream", "ownerId", "startDate", "endDate", "milestone", "status"], [
      input("id", "ID plan", "text", false, "Auto: IMP/P001A/2026"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("planType", "Type de plan", true, ["Integrated implementation plan", "Chronogramme de mise en oeuvre", "M&E plan", "Budget execution plan", "Communication plan", "Procurement plan", "Risk response plan", "Quality management plan", "Resource management plan", "Change management plan"]),
      input("workstream", "Composante / workstream", "text", true),
      select("ownerId", "Responsable du plan", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      input("startDate", "Debut prevu", "date", true),
      input("endDate", "Fin prevue", "date", true),
      input("milestone", "Jalon principal", "text", true),
      textarea("deliverable", "Livrable attendu"),
      textarea("dependencies", "Dependances critiques"),
      textarea("acceptanceCriteria", "Criteres d'acceptation / Definition of Done"),
      textarea("controlMethod", "Methode de controle et frequence de revue")
    ]);
    configs.communicationPlans = cfg("Plan de communication", "Parties prenantes et information", "Enregistrer la ligne de communication", ["id", "projectId", "audience", "messageType", "channel", "frequency", "ownerId", "status"], [
      input("id", "ID communication", "text", false, "Auto: COM/P001A/001"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("stakeholderId", "Partie prenante cible", false, function (draft) { return projectStakeholderOptions(draft.projectId); }, true, "projectId"),
      input("audience", "Audience / groupe cible", "text", true),
      select("messageType", "Type de message", true, ["Decision", "Progress update", "Risk alert", "Community engagement", "Donor reporting", "Technical coordination", "Complaint feedback", "Other"]),
      select("channel", "Canal", true, ["Email", "Reunion", "Telephone", "WhatsApp", "Rapport PDF", "Dashboard", "Atelier", "Radio communautaire", "Other"]),
      input("frequency", "Frequence", "text", true, "Hebdomadaire / mensuelle / ad hoc"),
      select("ownerId", "Responsable communication", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      textarea("contentStandard", "Format attendu, pieces jointes et niveau de validation")
    ]);
    configs.procurementPlans = cfg("Plan procurement", "Achats, contrats et fournisseurs", "Enregistrer le package procurement", ["id", "projectId", "packageName", "procurementMethod", "estimatedAmount", "plannedAwardDate", "ownerId", "status"], [
      input("id", "ID package", "text", false, "Auto: PROC/P001A/001"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      input("packageName", "Package / besoin a acheter", "text", true),
      select("procurementMethod", "Methode procurement", true, ["Request for quotation", "Competitive bidding", "Direct contracting", "Framework agreement", "Purchase order", "Service contract", "Community procurement", "Other"]),
      input("estimatedAmount", "Montant estime", "number", true),
      select("currency", "Monnaie", true, currencyOptions()),
      input("plannedLaunchDate", "Date lancement prevue", "date"),
      input("plannedAwardDate", "Date attribution prevue", "date", true),
      select("ownerId", "Responsable procurement", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      textarea("selectionCriteria", "Criteres de selection et conformite"),
      textarea("deliveryRequirements", "Exigences de livraison / reception")
    ]);
    configs.riskRegisters = cfg("Registre des risques", "Risque, reponse et escalation", "Enregistrer le risque", ["id", "projectId", "riskCategory", "riskStatement", "probability", "impact", "responseStrategy", "ownerId", "riskStatus"], [
      input("id", "ID risque", "text", false, "Auto: RISK/P001A/001"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("riskCategory", "Categorie", true, ["Strategic", "Operational", "Financial", "Security", "Access", "Procurement", "Quality", "Safeguarding", "Data", "Stakeholder", "Other"]),
      textarea("riskStatement", "Enonce du risque", "Formule: si [cause], alors [evenement], avec impact sur [objectif]."),
      select("probability", "Probabilite", true, ["Low", "Medium", "High", "Very high"]),
      select("impact", "Impact", true, ["Low", "Medium", "High", "Critical"]),
      select("responseStrategy", "Strategie de reponse", true, ["Avoid", "Mitigate", "Transfer", "Accept", "Escalate"]),
      select("ownerId", "Risk owner", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      textarea("mitigationAction", "Action de mitigation / contingence"),
      input("reviewDate", "Date prochaine revue", "date"),
      select("riskStatus", "Statut du risque", true, ["Open", "Monitoring", "Escalated", "Closed"])
    ]);
    configs.qualityPlans = cfg("Plan qualite", "Criteres, controles et acceptation", "Enregistrer le controle qualite", ["id", "projectId", "deliverable", "qualityStandard", "controlMethod", "ownerId", "reviewFrequency", "status"], [
      input("id", "ID controle qualite", "text", false, "Auto: QLT/P001A/001"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      input("deliverable", "Livrable / produit a controler", "text", true),
      textarea("qualityStandard", "Standard qualite / criteres d'acceptation"),
      select("controlMethod", "Methode de controle", true, ["Checklist", "Spot check", "Data quality review", "Field monitoring", "Peer review", "Beneficiary feedback", "Audit trail", "Other"]),
      select("ownerId", "Responsable qualite", true, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      input("reviewFrequency", "Frequence de controle", "text", true, "Mensuelle / trimestrielle / a chaque livraison"),
      textarea("evidenceRequired", "Preuves attendues")
    ]);
    configs.resourcePlans = cfg("Plan des ressources", "Equipe, capacite et responsabilites", "Enregistrer la ressource", ["id", "projectId", "resourceType", "roleOrAsset", "quantity", "ownerId", "availabilityWindow", "status"], [
      input("id", "ID ressource", "text", false, "Auto: RES/P001A/001"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("resourceType", "Type de ressource", true, ["Human resource", "Vehicle", "Asset", "Equipment", "Consultant", "Partner capacity", "Budget support", "Other"]),
      input("roleOrAsset", "Role / asset / capacite", "text", true),
      input("quantity", "Quantite / niveau de capacite", "number", true),
      select("ownerId", "Responsable ressource", false, function () { return optionPairs(store.staffs, "id", staffFullName); }, true),
      input("availabilityWindow", "Fenetre de disponibilite", "text", false, "Mai-Decembre 2026"),
      textarea("constraints", "Contraintes, dependances et besoin de renforcement")
    ]);
    configs.projectActivities = cfg("Creation des activites associees au projet", "Plan de travail", "Enregistrer l'activite", ["id", "projectId", "modality", "grantCodes", "label", "startDate"], [
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }), input("id", "ID activite", "text", false, "Auto: Act001/P001A"), input("label", "Libelle", "text", true),
      select("modality", "Modalite", true, ["Cash", "Vivre", "Capacity Strengthening", "Technical service"]),
      multi("grantCodes", "Grants rattaches", function (draft) { return activeGrantOptions(draft.modality); }, true, "modality"),
      multi("cspActivityIds", "Activite CSP contributrice", function (draft) { return cspActivitiesForProject(draft.projectId); }, false, "projectId"),
      input("startDate", "Date de debut", "date"), input("endDate", "Date de fin", "date"),
      select("partnerFocalPoint", "Point focal cote partenaire", false, function (draft) { return projectStakeholderOptions(draft.projectId); }, true, "projectId"),
      input("phone", "Contact phone", "tel"), input("email", "Adresse email", "email")
    ]);
    configs.projectSubActivities = cfg("Creation des sous activites", "Plan de travail", "Enregistrer la sous activite", ["id", "projectId", "activityId", "label", "kpiIds"], [
      search("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("activityId", "Activite rattachee", true, function (draft) { return projectActivitiesForProject(draft.projectId); }, false, "projectId"),
      input("id", "ID sous activite", "text", false, "Auto: SAct001/Act001/P001A"),
      input("label", "Libelle", "text", true),
      multi("kpiIds", "KPIs associes", function (draft) { return kpisForActivity(draft.activityId); }, true, "activityId")
    ]);
    configs.monthlyPlans = cfg("Planification mensuelle des activites", "Mise en oeuvre mensuelle", "Enregistrer la planification", ["id", "month", "projectId", "subActivityLabel", "kpiLabel", "grantContributions", "target"], [
      input("id", "ID plan mensuel", "text", false, "Auto: 001/05/2026"),
      input("month", "Mois de planification", "month", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("activityId", "Activite planifiee", true, function (draft) { return projectActivitiesForProject(draft.projectId); }, false, "projectId"),
      select("subActivityId", "Sous activite planifiee", false, function (draft) { return subActivitiesForActivity(draft.activityId); }, true, "activityId", "activityHasSubActivities"),
      select("kpiId", "KPI associe", true, function (draft) { return monthlyPlanKpiOptions(draft); }, false, "activityId"),
      monthlyGrantContributions("grantContributions", "Grants rattaches et contribution (%)", function (draft) { return monthlyGrantOptions(draft); }, "projectId"),
      input("target", "Cible mensuelle", "text", true),
      select("localizedActivity", "Activite localisee ?", true, ["Non", "Oui"]),
      select("localizationLevel", "Niveau de localisation", false, ["Pays", "Region", "Departement", "Arrondissement", "FDP"], true, "", "localizedMonthlyActivity"),
      select("localizationCountry", "Pays concerne", false, function () { return Object.keys(countryTree); }, true, "", "monthlyCountrySites"),
      multi("localizationRegions", "Regions concernees", function (draft) { return monthlyRegionOptions(draft); }, true, "localizationCountry", "monthlyRegionSites"),
      multi("localizationDepartments", "Departements concernes", function (draft) { return monthlyDepartmentOptions(draft); }, true, "localizationRegions", "monthlyDepartmentSites"),
      multi("localizationArrondissements", "Arrondissements concernes", function (draft) { return monthlyArrondissementHierarchyOptions(draft); }, true, "localizationDepartments", "monthlyArrondissementSites"),
      multi("fdpIds", "FDP concernes", function (draft) { return monthlyFdpHierarchyOptions(draft); }, true, "localizationArrondissements", "monthlyFdpSites"),
      input("plannedStartDate", "Date debut prevue", "date"),
      input("plannedEndDate", "Date fin prevue", "date"),
      select("pamFocalPoint", "Point focal organisation", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      select("partnerFocalPoint", "Point focal partenaire", false, function (draft) { return projectPartnerStaffOptions(draft.projectId); }, true, "projectId"),
      select("status", "Statut de planification", false, ["Draft", "Submitted", "Approved", "Returned for revision"]),
      textarea("comment", "Commentaire")
    ]);
    configs.monthlyReports = cfg("Reporting Quantitatif Mensuel", "Realisation mensuelle", "Enregistrer le reporting", ["id", "planId", "month", "achieved", "status"], [
      input("id", "ID rapport mensuel", "text", true, "MR/2026-05/P001A"),
      select("planId", "Activite planifiee", true, function () { return optionPairs(store.monthlyPlans, "id", monthlyPlanLabel); }),
      input("month", "Mois de reporting", "month", true),
      input("achieved", "Realisation du mois", "text", true),
      input("achievementRate", "Taux de realisation (%)", "number"),
      textarea("narrative", "Resume des realisations"),
      textarea("challenges", "Contraintes / defis"),
      textarea("correctiveActions", "Actions correctives"),
      input("evidence", "Lien ou reference de preuve", "text"),
      select("reportedBy", "Rapporte par", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      input("reportDate", "Date de soumission", "date"),
      select("status", "Statut du rapport", false, ["Draft", "Submitted", "Validated", "Returned for correction"])
    ]);
    configs.monthlyExpenses = cfg("Enregistrement des depenses mensuelles", "Execution budgetaire", "Enregistrer la depense", ["id", "month", "projectId", "costCategory", "subCategory", "budgetLineId", "grantCode", "amountXaf", "status"], [
      input("id", "ID depense mensuelle", "text", true, "EXP/2026-05/P001A"),
      input("month", "Mois de depense", "month", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("costCategory", "Categorie du cout", true, function (draft) { return budgetCategoriesForProject(draft.projectId); }, false, "projectId"),
      select("subCategory", "Sous categorie", false, function (draft) { return budgetSubCategoriesForExpense(draft); }, true, "costCategory"),
      select("budgetLineId", "Ligne budgetaire rattachee", true, function (draft) { return budgetLinesForExpense(draft); }, true, "subCategory"),
      select("grantCode", "Grant rattache", true, function (draft) { return grantOptionsForBudgetLine(draft.budgetLineId, draft.projectId); }, true, "budgetLineId"),
      input("amountXaf", "Montant depense (XAF)", "number", true),
      select("paidBy", "Depense effectuee par", false, ["Partenaire", "Organisation", "Autre"], true),
      select("validatedBy", "Validee par", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      select("status", "Statut", false, ["Draft", "Submitted", "Validated", "Rejected", "Paid"]),
      textarea("comment", "Commentaire")
    ]);
    configs.recommendations = cfg("Suivi des recommandations", "Execution", "Enregistrer la recommandation", ["id", "date", "projectId", "cspActivityId", "subActivityType", "modality", "whatWhere", "siteId", "recommendationStatus", "actionUpdate"], [
      input("id", "ID recommandation", "text", false, "Auto: REC001/05/2026"),
      input("date", "Date", "date", true),
      select("projectId", "Project", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("cspActivityId", "L'activite du CSP", true, cspActivities.map(activityOption)),
      select("subActivityType", "Sous activites", true, function (draft) { return recommendationSubActivityOptions(draft.projectId); }, true, "projectId"),
      input("otherSubActivity", "Autre a preciser", "text", false, "", "", "", "otherRecommendationSubActivity"),
      select("modality", "Modalite", true, function (draft) { return recommendationModalityOptions(draft.projectId); }, true, "projectId"),
      select("whatWhere", "What and Where", true, ["All staff meeting", "Program/Recommandation follow up meeting", "Distribution monitoring", "Post-distribution monitoring", "Coordination meeting", "Complaint follow up", "Autre"]),
      input("otherWhatWhere", "Autre a preciser", "text", false, "", "", "", "otherRecommendationWhatWhere"),
      select("siteId", "Site / FDP", true, function (draft) { return recommendationSiteOptions(draft); }, true, "projectId"),
      textarea("why", "Why"),
      select("unit", "Unit", true, ["Organisation", "Cooperating partner", "Autre"]),
      input("otherUnit", "Autre a preciser", "text", false, "", "", "", "otherRecommendationUnit"),
      select("personResponsible", "Person responsible", true, function (draft) { return recommendationResponsibleOptions(draft); }, true, "unit"),
      input("timelineForAction", "Timeline for action", "date"),
      select("recommendationStatus", "Status de la recommandation", true, ["Not started", "Ongoing", "Completed"]),
      input("completionDate", "Date of completion", "date", false, "", "", "", "recommendationCompleted"),
      textarea("comment", "Commentaire")
    ]);
    configs.processIndicators = cfg("Creation des indicateurs de Process monitoring", "Process monitoring", "Enregistrer l'indicateur process", ["id", "projectId", "label", "frequency", "target"], [
      input("id", "ID indicateur process", "text", false, "Auto: PMI001/P001A"),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      multi("kpiIds", "Libelle de l'indicateur - selectionner parmi les KPIs du projet", function (draft) { return kpisForProject(draft.projectId); }, true, "projectId"),
      processKpiDetails("processKpiDetails", "Details des indicateurs process", "kpiIds")
    ]);
    configs.processReports = cfg("Renseignement mensuel du Process monitoring", "Suivi mensuel process", "Enregistrer le rapport process", ["id", "month", "processIndicatorId", "value", "status"], [
      input("id", "ID rapport process", "text", true, "PMR/2026-05/P001A"),
      input("month", "Mois de reporting", "month", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("processIndicatorId", "Indicateur process", true, function (draft) { return processIndicatorsForProject(draft.projectId); }, false, "projectId"),
      input("value", "Valeur observee", "text", true),
      textarea("findings", "Constats principaux"),
      textarea("recommendations", "Recommandations"),
      input("evidence", "Lien ou reference de preuve", "text"),
      select("reportedBy", "Rapporte par", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      select("status", "Statut", false, ["Draft", "Submitted", "Reviewed", "Approved", "Returned"]),
      textarea("comment", "Commentaire")
    ]);
    configs.distributionReports = cfg("Bulk report distributions IK/CBT par FDP", "Execution", "Enregistrer le reporting distribution", ["id", "month", "projectId", "planId", "modality", "distributionLines", "status"], [
      input("id", "ID reporting distribution", "text", false, "Auto: DISTREP001/05/2026"),
      input("month", "Mois", "month", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("planId", "Plan mensuel valide rattache", true, function (draft) { return validatedMonthlyPlanOptions(draft); }, true, "projectId"),
      select("modality", "Modalite", true, ["In Kind", "CBT"]),
      distributionLines("distributionLines", "Reporting par FDP", "planId"),
      textarea("comment", "Commentaire")
    ]);
    configs.nfis = cfg("Creation des NFI", "Gestion NFI", "Enregistrer le NFI", ["id", "projectId", "name", "valueXaf", "purchaseDate", "status"], [
      input("id", "ID NFI", "text", false, "Auto: NFI001/05/2026"),
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      input("name", "Nom NFI", "text", true),
      input("valueXaf", "Valeur en XAF", "number", true),
      input("purchaseDate", "Date d'achat", "date"),
      textarea("comment", "Commentaires")
    ]);
    configs.nfiDistributions = cfg("Distribution des NFI", "Gestion NFI", "Enregistrer la distribution", ["id", "distributionDate", "projectId", "fdpId", "nfiId", "quantitySupplied", "status"], [
      input("id", "Distribution ID", "text", false, "Auto: NFIDIST001/05/2026"),
      input("distributionDate", "Date de la distribution", "date", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("fdpId", "FDP", true, function (draft) { return projectFdpOptions(draft.projectId); }, true, "projectId"),
      select("nfiId", "Nom NFI", true, function (draft) { return nfiOptionsForProject(draft.projectId); }, true, "projectId"),
      input("quantitySupplied", "Quantite approvisionnee", "number", true),
      input("receivedCertifiedBy", "Recu certifie conforme par", "text"),
      input("phone", "Contact Telephonique", "tel"),
      textarea("comment", "Commentaire")
    ]);
    configs.nfiInventories = cfg("Inventaire des NFI", "Gestion NFI", "Enregistrer l'inventaire", ["id", "projectId", "fdpId", "inventoryItems", "status"], [
      input("id", "Inventaire ID", "text", false, "Auto: NFIINV001/05/2026"),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("fdpId", "FDP", true, function (draft) { return projectFdpOptions(draft.projectId); }, true, "projectId"),
      nfiInventoryItems("inventoryItems", "Liste des NFI sur site", "fdpId"),
      textarea("comment", "Commentaire")
    ]);
    configs.partnerInvoices = cfg("Enregistrement des factures partenaires", "Gestion factures partenaires", "Enregistrer la facture", ["id", "projectId", "invoiceSystemId", "partnerVendor", "submittedToFoDate", "submittedToCoDate", "invoiceTotalXaf", "status"], [
      input("id", "ID Facture", "text", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("invoiceSystemId", "ID Facture generee dans le systeme", true, function (draft) { return savedInvoiceOptionsForProject(draft.projectId); }, true, "projectId"),
      select("partnerVendor", "Partenaire cooperant", true, function (draft) { return partnerOptionsForProject(draft.projectId); }, true, "projectId"),
      input("submittedToFoDate", "Date de soumission au bureau terrain", "date"),
      input("submittedToCoDate", "Date de soumission au CO", "date"),
      partnerInvoiceAmounts("activityGrantAmounts", "Montant attendu / facture par activite ou grant", "invoiceSystemId"),
      input("invoiceTotalXaf", "Total facture XAF", "number"),
      textarea("comment", "Commentaire")
    ]);
    configs.partnerInvoicePayments = cfg("Suivi paiement des factures partenaires", "Gestion factures partenaires", "Enregistrer le paiement", ["id", "invoiceId", "paymentDate", "invoiceAmountXaf", "amountPaidXaf", "balanceXaf", "status"], [
      input("id", "ID Paiement", "text", false, "Auto: PAYINV001/05/2026"),
      select("invoiceId", "ID Facture", true, function () { return optionPairs(store.partnerInvoices, "id", function (inv) { return inv.id + " - " + moneyText(Number(inv.invoiceTotalXaf || 0), recordCurrency(inv, "partnerInvoices")); }); }, true),
      input("paymentDate", "Date de Paiement", "date", true),
      input("invoiceAmountXaf", "Montant facture", "number"),
      input("amountPaidXaf", "Montant paye", "number"),
      input("balanceXaf", "Solde", "number"),
      textarea("comment", "Commentaire")
    ]);
    configs.amendments = cfg("Gestion des amendements projet", "Budget et activites", "Enregistrer l'amendement", ["id", "projectId", "amendmentType", "changeType", "status"], [
      input("id", "ID amendement", "text", true, "AMD/001/P001A"),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("amendmentType", "Type d'amendement", true, ["Budget", "Activite", "Budget et Activite"]),
      select("changeType", "Nature du changement", true, ["Add", "Revise", "Suspend", "Cancel"]),
      select("budgetLineId", "Ligne budgetaire concernee", false, function (draft) { return budgetLinesForProject(draft.projectId); }, true, "projectId"),
      input("budgetDeltaXaf", "Variation budgetaire (XAF)", "number"),
      input("newBudgetAmountXaf", "Nouveau montant de la ligne (XAF)", "number"),
      select("activityId", "Activite concernee", false, function (draft) { return projectActivitiesForProject(draft.projectId); }, true, "projectId"),
      input("newActivityLabel", "Nouvelle activite / libelle revise", "text"),
      input("effectiveDate", "Date d'effet", "date"),
      textarea("justification", "Justification"),
      select("requestedBy", "Demande par", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      select("status", "Statut", false, ["Draft", "Submitted", "Reviewed", "Approved", "Returned", "Rejected"]),
      textarea("decisionComment", "Commentaire de decision")
    ]);
    configs.distributionCycles = cfg("Gestion du cycle de distribution", "Planning - Execution - Reconciliation", "Enregistrer le cycle", ["id", "month", "projectId", "stage", "status"], [
      input("id", "ID cycle distribution", "text", true, "DIST/2026-05/P001A"),
      input("month", "Mois", "month", true),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("activityId", "Activite du projet", true, function (draft) { return projectActivitiesForProject(draft.projectId); }, false, "projectId"),
      select("planId", "Plan mensuel rattache", false, function (draft) { return monthlyPlansForProject(draft.projectId); }, true, "projectId"),
      select("stage", "Etape du cycle", true, ["Planning", "Execution", "Reconciliation"]),
      input("plannedBeneficiaries", "Beneficiaires planifies", "number"),
      input("plannedQuantityMt", "Quantite planifiee (MT)", "number"),
      input("dispatchDate", "Date dispatch", "date"),
      input("distributionStartDate", "Date debut distribution", "date"),
      input("distributionEndDate", "Date fin distribution", "date"),
      input("servedBeneficiaries", "Beneficiaires servis", "number"),
      input("distributedQuantityMt", "Quantite distribuee (MT)", "number"),
      input("lossesMt", "Pertes / ecarts (MT)", "number"),
      input("returnedQuantityMt", "Quantite retournee (MT)", "number"),
      textarea("reconciliationComment", "Commentaire reconciliation"),
      select("status", "Statut", false, ["Draft", "Planned", "In progress", "Completed", "Reconciled", "Issue flagged"])
    ]);
    configs.kpis = cfg("Creation des KPIs", "Suivi performance", "Enregistrer le KPI", ["id", "projectId", "activityId", "label", "verificationSource", "frequency", "target", "pamOwner"], [
      search("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("activityId", "Activite rattachee", true, function (draft) { return projectActivitiesForProject(draft.projectId); }, false, "projectId"),
      input("id", "ID KPI", "text", false, "Auto: Ind001/Act001/P001A/P001A"), input("label", "Libelle du KPI", "text", true),
      input("verificationSource", "Source de verification", "text"),
      select("frequency", "Frequence de collecte des donnees/renseignement", true, ["Journaliere", "Hebdomadaire", "Mensuelle", "Trimestrielle", "Semestrielle", "Anuelle", "Autre"]),
      input("otherFrequency", "Autre a preciser", "text", false, "", "", "", "otherKpiFrequency"),
      select("pamOwner", "Personne en charge du suivi cote organisation", false, function () { return optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }); }, true),
      input("target", "Cible KPI", "text"), textarea("comment", "Commentaire")
    ]);
    configs.budgets = cfg("Creation du budget detaille", "Budget projet", "Enregistrer la ligne budgetaire", ["id", "projectId", "partnerVendor", "costCategory", "subCategory", "label", "amountXaf"], [
      select("projectId", "ID project rattache", true, function () { return optionPairs(store.projects, "id", "title"); }), input("id", "ID ligne budgetaire", "text", false, "Auto: 001/SS/FTMB/P001A"),
      select("partnerVendor", "Partenaire", false, function (draft) { return partnerOptionsForProject(draft.projectId); }, false, "projectId"),
      select("costCategory", "Categorie du cout", true, Object.keys(costSubCategories)), select("subCategory", "Sous categorie", false, function (draft) { return costSubCategories[draft.costCategory] || []; }, false, "costCategory"),
      input("label", "Libelle de la ligne budgetaire", "text", true), select("cspActivityId", "Activite CSP rattachee", false, function (draft) { return cspActivitiesForProject(draft.projectId); }, true, "projectId"),
      budgetGrantAmounts("grantAmounts", "Montants par grant", "projectId"),
      input("amountXaf", "Montant total", "number", false)
    ]);
    configs.grantInKinds = cfg("Parametrage des grants en nature", "Budget projet", "Enregistrer le parametrage in kind", ["id", "projectId", "grantCode", "hasInKind", "plannedTonnageMt", "kpiIds", "rateScope", "ratePerMt"], [
      select("projectId", "Projet rattache", true, function () { return optionPairs(store.projects, "id", "title"); }),
      input("id", "ID parametrage", "text", false, "Auto: IK/P001/GRANT"),
      select("grantCode", "Grant rattache au projet", true, function (draft) { return invoiceGrantOptionsForProject(draft.projectId); }, true, "projectId"),
      select("hasInKind", "Ce grant inclut-il la modalite in kind ?", true, ["Non", "Oui"]),
      input("plannedTonnageMt", "Tonnage planifie pour le projet (MT)", "number"),
      multi("kpiIds", "KPIs sources du tonnage distribue a considerer pour la facturation", function (draft) { return kpisForProject(draft.projectId); }, true, "projectId", "grantInKindYes"),
      select("rateScope", "Le rate/MT est-il applicable a tous les mois ?", true, ["Oui", "Non"], false, "", "grantInKindYes"),
      input("ratePerMt", "Rate / MT applicable a tous les mois", "number", false, "", "", "", "grantRateAllMonths"),
      textarea("monthlyRates", "Rate / MT par mois", "Format: 2026-05=12500; 2026-06=13000", "grantRateByMonth"),
      textarea("comment", "Commentaire")
    ]);
    configs.baselines = cfg("Indicateurs baseline du projet", "Baseline", "Enregistrer l'indicateur baseline", ["id", "projectId", "label", "value", "source"], [
      select("projectId", "ID Project", true, function () { return optionPairs(store.projects, "id", "title"); }), input("id", "ID Indicateur", "text", true, "001/Ind/P001A"), input("label", "Libelle", "text", true), input("value", "Valeur", "text", true),
      select("source", "Source", false, ["Enquete", "Revue documentaire", "Monitoring data", "Partner report", "Government source", "Autre"]), input("otherSource", "Autre a preciser", "text"), textarea("comment", "Commentaire")
    ]);
    configs.hgsfIngredients = cfg("Creation des ingredients et prix HGSF", "Besoins pour le HGSF", "Enregistrer l'ingredient", ["id", "name", "unit", "priceEntries", "status"], [
      input("id", "Numero d'ordre", "text", false, "Auto: ING001"),
      input("name", "Nom de l'ingredient", "text", true),
      select("unit", "Unite d'estimation", true, ["Kg", "Litre", "Piece", "Sachet", "Carton", "Autre"]),
      country("country", "Pays", true),
      multi("localizationRegions", "Regions ou l'ingredient est utilise", hgsfRegionOptions, true, "country"),
      multi("localizationDepartments", "Departements rattaches", hgsfDepartmentOptions, true, "localizationRegions"),
      multi("localizationArrondissements", "Arrondissements rattaches", hgsfArrondissementOptions, true, "localizationDepartments"),
      hgsfIngredientPrices("priceEntries", "Prix par arrondissement"),
      input("effectiveDate", "Date d'effet du prix", "date"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfMenus = cfg("Creation des menus HGSF", "Besoins pour le HGSF", "Enregistrer le menu", ["id", "name", "menuItems", "status"], [
      input("id", "ID menu", "text", false, "Auto: MENU001"),
      input("name", "Nom du menu", "text", true),
      textarea("description", "Description"),
      hgsfMenuItems("menuItems", "Ingredients du menu et quantite par eleve (grammes)"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfSchoolMenus = cfg("Rattachement des menus aux ecoles", "Besoins pour le HGSF", "Enregistrer le rattachement", ["id", "localizationRegions", "localizationDepartments", "localizationArrondissements", "schoolFdpIds", "menuIds", "status"], [
      input("id", "ID rattachement", "text", false, "Auto: SCHMENU001"),
      multi("localizationRegions", "Regions", hgsfRegionOptions, true, "localizationCountry"),
      multi("localizationDepartments", "Departements", hgsfDepartmentOptions, true, "localizationRegions"),
      multi("localizationArrondissements", "Arrondissements", hgsfArrondissementOptions, true, "localizationDepartments"),
      multi("schoolFdpIds", "Ecoles / FDP", hgsfSchoolHierarchyOptions, true, "localizationArrondissements"),
      multi("menuIds", "Menus disponibles pour cette ecole", function () { return optionPairs(store.hgsfMenus, "id", "name"); }, true),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfEstimations = cfg("Estimation des besoins HGSF", "Besoins pour le HGSF", "Enregistrer l'estimation", ["id", "createdAt", "schoolFdpIds", "initiatorEmail", "periodType", "periodValue", "periodStartDate", "coveredDays", "schoolRows", "status"], [
      input("id", "ID estimation", "text", false, "Auto: HGSF/2026/001"),
      select("periodType", "Periode", true, ["Journaliere", "Hebdomadaire", "Mensuelle", "Trimestrielle", "Semestrielle", "Annuelle"]),
      input("periodValue", "Mois / periode de reference", "month", true),
      input("periodStartDate", "Date de debut de la periode", "date", true),
      input("coveredDays", "Nombre de jours couverts", "number", true),
      select("workdaysOnly", "Selectionner uniquement les jours ouvrables ?", true, ["Oui", "Non"]),
      hgsfApplicableDays("applicableDays", "Jours applicables"),
      multi("localizationRegions", "Regions", hgsfRegionOptions, false, "periodValue"),
      multi("localizationDepartments", "Departements", hgsfDepartmentOptions, false, "localizationRegions"),
      multi("localizationArrondissements", "Arrondissements", hgsfArrondissementOptions, false, "localizationDepartments"),
      multi("schoolFdpIds", "Ecoles a ajouter", hgsfSchoolHierarchyOptions, false, "localizationArrondissements"),
      select("informationVaries", "Les informations different selon les jours / semaines / mois ?", true, ["Non", "Oui"]),
      hgsfEstimationRows("schoolRows", "Ecoles, effectifs, jours et menus"),
      select("useFallbackPrice", "Si prix absent dans l'arrondissement de l'ecole, utiliser un autre arrondissement ?", true, ["Non", "Oui"]),
      select("fallbackPriceArrondissement", "Arrondissement de prix alternatif", false, hgsfPriceArrondissementOptions, true, "", "hgsfPriceFallback"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfPurchaseOrders = cfg("Generation du bon de commande HGSF", "Besoins pour le HGSF", "Enregistrer le bon de commande", ["id", "schoolFdpIds", "estimationId", "cooperativePartnerId", "periodFrom", "periodTo", "applicableDaysCount", "initiatorName", "status"], [
      input("id", "ID bon de commande", "text", false, "Auto: BCHGSF001"),
      multi("localizationRegions", "Regions des ecoles", hgsfRegionOptions, false),
      multi("localizationDepartments", "Departements des ecoles", hgsfDepartmentOptions, false, "localizationRegions"),
      multi("localizationArrondissements", "Arrondissements des ecoles", hgsfArrondissementOptions, false, "localizationDepartments"),
      multi("schoolFdpIds", "Ecoles rattachees au bon de commande", hgsfSchoolHierarchyOptions, true, "localizationArrondissements"),
      select("estimationId", "Estimation rattachee", true, hgsfEstimationOptionsForPurchaseOrder, true, "schoolFdpIds"),
      select("cooperativePartnerId", "Cooperative / GIC", true, hgsfCooperativeOptionsForSchools, true, "schoolFdpIds"),
      input("periodFrom", "Periode couverte - Du", "date", true),
      input("periodTo", "Periode couverte - A", "date", true),
      input("applicableDaysCount", "Nombre de jours applicable", "number", true),
      input("desiredDeliveryDate", "Date de livraison souhaitee", "date", true),
      hgsfPurchaseOrderLines("orderLines", "Ingredients et quantites commandees"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfDeliveries = cfg("Reception des livraisons HGSF", "Besoins pour le HGSF", "Enregistrer la reception", ["id", "purchaseOrderId", "deliveryDate", "receivedBy", "status"], [
      input("id", "ID reception", "text", false, "Auto: DELHGSF001"),
      select("purchaseOrderId", "Bon de commande rattache", true, function () { return optionPairs(store.hgsfPurchaseOrders, "id", function (o) { return o.cooperativePartnerId + " / " + (o.periodFrom || "") + "-" + (o.periodTo || ""); }); }, true),
      input("deliveryDate", "Date de livraison", "date", true),
      input("receivedBy", "Receptionne par", "text"),
      hgsfPurchaseOrderLines("receivedLines", "Quantites recues par ingredient"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfDeliveryInvoices = cfg("Enregistrement facture suite livraison HGSF", "Besoins pour le HGSF", "Enregistrer la facture", ["id", "deliveryId", "invoiceNumber", "invoiceAmount", "submittedToFoDate", "submittedToCoDate", "status"], [
      input("id", "ID facture livraison", "text", false, "Auto: FACHGSF001"),
      select("deliveryId", "Reception rattachee", true, function () { return optionPairs(store.hgsfDeliveries, "id", "purchaseOrderId"); }, true),
      input("invoiceNumber", "Numero de facture", "text", true),
      input("invoiceDate", "Date facture", "date"),
      input("invoiceAmount", "Montant facture", "number", true),
      input("submittedToFoDate", "Date de soumission au FO", "date"),
      input("submittedToCoDate", "Date de soumission au CO", "date"),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfInvoicePayments = cfg("Paiement des factures HGSF", "Besoins pour le HGSF", "Enregistrer le paiement", ["id", "invoiceId", "transactionNumber", "transactionDate", "amountTransferredToSchool", "status"], [
      input("id", "ID paiement facture", "text", false, "Auto: PAYHGSF001"),
      select("invoiceId", "Numero de facture", true, function () { return optionPairs(store.hgsfDeliveryInvoices, "id", function (f) { return (f.invoiceNumber || f.id) + " - " + formatNumber(Number(f.invoiceAmount || 0)) + " XAF"; }); }, true),
      input("transactionNumber", "Numero de transaction vers l'ecole", "text", true),
      input("transactionDate", "Date de la transaction", "date", true),
      input("amountTransferredToSchool", "Montant transfere a l'ecole", "number", true),
      textarea("comment", "Commentaire")
    ]);
    configs.hgsfSchoolCoopPayments = cfg("Suivi paiement ecole a cooperative", "Besoins pour le HGSF", "Enregistrer le suivi paiement", ["id", "invoiceId", "schoolTransactionNumber", "cooperativePartnerId", "amountDue", "amountPaidToCoop", "balanceToPay", "status"], [
      input("id", "ID suivi paiement", "text", false, "Auto: SCHPAY001"),
      select("invoiceId", "Numero de facture", true, function () { return optionPairs(store.hgsfDeliveryInvoices, "id", function (f) { return f.invoiceNumber || f.id; }); }, true),
      select("schoolTransactionNumber", "Numero transaction ecole", true, function () { return optionPairs(store.hgsfInvoicePayments, "transactionNumber", "transactionNumber"); }, true),
      select("cooperativePartnerId", "Cooperative / GIC", true, function () { return optionPairs(store.cooperativePartners, "id", "name"); }, true),
      input("amountDue", "Montant du", "number", true),
      input("amountPaidToCoop", "Montant paye a la cooperative", "number", true),
      input("paymentDate", "Date paiement ecole a cooperative", "date"),
      input("balanceToPay", "Solde a payer", "number"),
      textarea("comment", "Commentaire")
    ]);
    configs.assistanceRations = cfg("Creation des rations d'assistance alimentaire", "Estimateur besoins", "Enregistrer la ration", ["id", "cspActivityId", "subActivityType", "modality", "reference", "status"], [
      input("id", "ID ration", "text", false, "Auto: RAT001"),
      select("cspActivityId", "Act CSP", true, cspActivities.map(activityOption)),
      select("subActivityType", "Sous activite", true, ["GFA", "Nutrition", "FFA"]),
      select("modality", "Modalite", true, ["In kind", "CBT", "Voucher"]),
      rationItems("rationItems", "Quantites / Amount"),
      select("reference", "Reference", true, ["CSP 2", "Autre"]),
      input("otherReference", "Autre a preciser", "text", false, "", "", "", "otherRationReference"),
      textarea("comment", "Commentaire")
    ]);
    configs.gfdNeeds = needEstimateConfig("Estimation des besoins GFD In kind", "GFD");
    configs.cbtNeeds = needEstimateConfig("Estimation des besoins CBT", "CBT");
    configs.nutritionNeeds = needEstimateConfig("Estimation des besoins Nutrition", "Nutrition");
  }

  function needEstimateConfig(title, type) {
    return cfg(title, "Estimateur besoins", "Enregistrer l'estimation", ["id", "projectId", "rationId", "periodType", "coveredDays", "fdpIds", "status"], [
      input("id", "ID estimation", "text", false, "Auto"),
      select("needType", "Type de besoin", true, [type]),
      select("projectId", "Projet", true, function () { return optionPairs(store.projects, "id", "title"); }),
      select("modality", "Modalite", true, ["In kind", "CBT", "Voucher"]),
      select("rationId", "Ration / assistance", true, function (draft) { return rationOptionsForNeed(draft.needType || type, draft.modality); }, true, "modality"),
      select("periodType", "Periode", true, ["Journaliere", "Mensuelle", "Trimestrielle", "Annuelle"]),
      input("coveredDays", "Nombre de jours a couvrir", "number", true),
      needCommodityPercents("commodityPercents", "Pourcentage de ration par commodite", "rationId"),
      select("needScope", "Type d'estimation", true, ["FDP du projet", "Besoin isole"]),
      input("isolatedBeneficiaries", "Nombre de beneficiaires", "number", false, "", "", "", "isolatedNeed"),
      multi("localizationRegions", "Regions", needProjectRegionOptions, false, "projectId", "projectNeedScope"),
      multi("localizationDepartments", "Departements", needProjectDepartmentOptions, false, "localizationRegions", "projectNeedScope"),
      multi("localizationArrondissements", "Arrondissements", needProjectArrondissementOptions, false, "localizationDepartments", "projectNeedScope"),
      multi("fdpIds", "FDPs", needProjectFdpOptions, false, "localizationArrondissements", "projectNeedScope"),
      needBeneficiaryRows("beneficiaryRows", "FDPs et beneficiaires", "projectNeedScope"),
      textarea("comment", "Commentaire")
    ]);
  }

  function cfg(title, kicker, submit, columns, fields) {
    if (columns.indexOf("status") < 0) columns = columns.concat(["status"]);
    return { title: title, kicker: kicker, submit: submit, columns: columns, fields: fields };
  }

  function input(name, label, type, required, placeholder, pattern, hint, visibleWhen) {
    return { name: name, label: label, type: type, required: !!required, placeholder: placeholder || "", pattern: pattern || "", hint: hint || "", visibleWhen: visibleWhen || "" };
  }

  function textarea(name, label, hint, visibleWhen) {
    return { name: name, label: label, type: "textarea", hint: hint || "", visibleWhen: visibleWhen || "" };
  }

  function country(name, label, required, visibleWhen) {
    return { name: name, label: label, type: "country", required: !!required, visibleWhen: visibleWhen || "" };
  }

  function search(name, label, required, options, visibleWhen, dependsOn) {
    return { name: name, label: label, type: "search", required: !!required, options: options, visibleWhen: visibleWhen || "", dependsOn: dependsOn || "" };
  }

  function foodItems(name, label) {
    return { name: name, label: label, type: "foodItems", visibleWhen: "food" };
  }

  function projectFdps(name, label, dependsOn) {
    return { name: name, label: label, type: "projectFdps", dependsOn: dependsOn || "" };
  }

  function projectPartnerStaff(name, label, options, dependsOn) {
    return { name: name, label: label, type: "projectPartnerStaff", options: options, dependsOn: dependsOn || "" };
  }

  function monthlyGrantContributions(name, label, options, dependsOn) {
    return { name: name, label: label, type: "monthlyGrantContributions", options: options, dependsOn: dependsOn || "" };
  }

  function processKpiDetails(name, label, dependsOn) {
    return { name: name, label: label, type: "processKpiDetails", dependsOn: dependsOn || "" };
  }

  function budgetGrantAmounts(name, label, dependsOn) {
    return { name: name, label: label, type: "budgetGrantAmounts", dependsOn: dependsOn || "" };
  }

  function hgsfMenuItems(name, label) {
    return { name: name, label: label, type: "hgsfMenuItems" };
  }

  function hgsfEstimationRows(name, label) {
    return { name: name, label: label, type: "hgsfEstimationRows", dependsOn: "schoolFdpIds" };
  }

  function hgsfApplicableDays(name, label) {
    return { name: name, label: label, type: "hgsfApplicableDays", dependsOn: "periodValue" };
  }

  function hgsfIngredientPrices(name, label) {
    return { name: name, label: label, type: "hgsfIngredientPrices", dependsOn: "localizationArrondissements" };
  }

  function hgsfPurchaseOrderLines(name, label) {
    return { name: name, label: label, type: "hgsfPurchaseOrderLines", dependsOn: "estimationId" };
  }

  function rationItems(name, label) {
    return { name: name, label: label, type: "rationItems", dependsOn: "modality" };
  }

  function needCommodityPercents(name, label, dependsOn) {
    return { name: name, label: label, type: "needCommodityPercents", dependsOn: dependsOn || "", visibleWhen: "needInKind" };
  }

  function needBeneficiaryRows(name, label, visibleWhen) {
    return { name: name, label: label, type: "needBeneficiaryRows", dependsOn: "fdpIds", visibleWhen: visibleWhen || "" };
  }

  function distributionLines(name, label, dependsOn) {
    return { name: name, label: label, type: "distributionLines", dependsOn: dependsOn || "" };
  }

  function nfiInventoryItems(name, label, dependsOn) {
    return { name: name, label: label, type: "nfiInventoryItems", dependsOn: dependsOn || "" };
  }

  function partnerInvoiceAmounts(name, label, dependsOn) {
    return { name: name, label: label, type: "partnerInvoiceAmounts", dependsOn: dependsOn || "" };
  }

  function select(name, label, required, options, allowBlank, dependsOn, visibleWhen) {
    return { name: name, label: label, type: "select", required: !!required, options: options, allowBlank: !!allowBlank, dependsOn: dependsOn || "", visibleWhen: visibleWhen || "" };
  }

  function multi(name, label, options, searchable, dependsOn, visibleWhen) {
    return { name: name, label: label, type: "multi", options: options, searchable: !!searchable, dependsOn: dependsOn || "", visibleWhen: visibleWhen || "" };
  }

  function currencyOptions() {
    return ["XAF", "USD", "EUR", "GBP", "NGN", "GHS", "KES", "UGX", "TZS", "RWF", "CDF", "XOF", "ZAR", "MAD", "DZD", "ETB"];
  }

  function renderNav() {
    var html = "";
    if (!currentUser()) {
      elements.nav.innerHTML = '<div class="nav-group group-home"><p class="nav-group-title">Accueil</p><button class="nav-item active" data-page="home"><span class="icon" aria-hidden="true">A</span>Accueil</button></div>';
      return;
    }
    for (var g = 0; g < navGroups.length; g += 1) {
      html += '<div class="nav-group ' + navGroups[g].className + '"><p class="nav-group-title">' + navGroups[g].title + "</p>";
      for (var i = 0; i < navGroups[g].pages.length; i += 1) {
        var page = pageById(navGroups[g].pages[i]);
        if (page && !userCanAccessPage(page[0])) continue;
        if (page) html += '<button class="nav-item ' + (page[0] === state.page ? "active" : "") + '" data-page="' + page[0] + '"><span class="icon" aria-hidden="true">' + page[2] + "</span>" + page[1] + "</button>";
      }
      html += "</div>";
    }
    elements.nav.innerHTML = html;
    var buttons = elements.nav.querySelectorAll(".nav-item");
    for (var b = 0; b < buttons.length; b += 1) {
      buttons[b].onclick = function () {
        state.page = this.getAttribute("data-page");
        state.query = "";
        state.editingId = "";
        state.formOpen = false;
        state.workspaceBackPage = "";
        elements.search.value = "";
        renderNav();
        render();
      };
    }
  }

  function render() {
    clearAppError();
    ensureAdminUser();
    if (!currentUser() && state.page !== "home") state.page = "home";
    if (currentUser() && state.page === "home") state.page = "operationsDashboard";
    if (currentUser() && !userCanAccessPage(state.page)) state.page = "operationsDashboard";
    setRegisterHeaderLabel("Registre");
    document.body.setAttribute("data-page", state.page);
    refreshGrantStatuses();
    refreshStaffStatuses();
    saveStoredData();
    syncContextDefaults();
    renderContextControls();
    renderMetrics();
    syncAdministrativeSitesFromFdps();
    renderAuthControls();
    if (state.page === "home") renderHome();
    else if (state.page === "overview") renderOverview();
    else if (state.page === "operationsDashboard") renderOperationsDashboard();
    else if (state.page === "projectPlan") renderProjectWorkspace("Plan integre du projet", "Gouvernance et plans PMBOK", ["stakeholders", "implementationPlans", "projectActivities", "kpis", "projectSubActivities", "budgets", "processIndicators", "communicationPlans", "riskRegisters", "procurementPlans", "qualityPlans", "resourcePlans", "grantInKinds", "baselines"]);
    else if (state.page === "monthlyPlanning") renderProjectWorkspace("Planification mensuelle", "Planification", ["monthlyPlans", "processIndicators"]);
    else if (state.page === "executionWorkspace") renderProjectWorkspace("Execution", "Execution", ["monthlyReports", "monthlyExpenses", "recommendations", "processReports", "distributionReports"]);
    else if (state.page === "reportingWorkspace") renderProjectWorkspace("Reporting", "Reporting", ["progressReport", "partnerInvoice"]);
    else if (state.page === "invoiceWorkspace") renderProjectWorkspace("Facturation partenaires", "Facturation partenaires", ["partnerInvoices", "partnerInvoicePayments"]);
    else if (state.page === "nfiWorkspace") renderProjectWorkspace("Gestion NFI", "Gestion NFI", ["nfis", "nfiDistributions", "nfiInventories"]);
    else if (state.page === "monthlyFollowUp") renderMonthlyFollowUp();
    else if (state.page === "customReports") renderCustomReports();
    else if (state.page === "progressReport") renderProgressReport();
    else if (state.page === "partnerInvoice") renderPartnerInvoice();
    else renderPage();
    addWorkspaceBackButton();
  }

  function renderProjectWorkspace(title, kicker, pageIds) {
    setFormPanelMode(false, true);
    removeFilters();
    removeWorkspaceBackButton();
    state.contextProjectId = state.contextProjectId || firstProjectId();
    state.workspaceBackPage = "";
    elements.title.textContent = title;
    elements.kicker.textContent = kicker;
    elements.formKicker.textContent = "Projet noyau";
    elements.formTitle.textContent = "Selectionner le projet";
    elements.tableTitle.textContent = title + " - modules";
    elements.form.innerHTML = '<label>Projet<select id="workspace-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), state.contextProjectId) + '</select></label>';
    var selector = document.getElementById("workspace-project");
    if (selector) selector.onchange = function () { state.contextProjectId = this.value; renderProjectWorkspace(title, kicker, pageIds); };
    elements.tableHead.innerHTML = "";
    elements.tableCount.textContent = pageIds.length;
    var cards = "";
    for (var i = 0; i < pageIds.length; i += 1) {
      var page = pageById(pageIds[i]);
      if (!page) continue;
      var meta = workspaceModuleMeta(page[0]);
      cards += '<button type="button" class="workspace-module-card" data-open-scoped-page="' + escapeHtml(page[0]) + '">' +
        '<span class="workspace-icon" aria-hidden="true">' + escapeHtml(meta.icon) + '</span>' +
        '<span class="workspace-card-title">' + escapeHtml(meta.title || page[1]) + '</span>' +
        '<span class="workspace-card-subtitle">' + escapeHtml(meta.subtitle || nextAction(page[0])) + '</span>' +
        '</button>';
    }
    elements.tableBody.innerHTML = '<tr><td><div class="workspace-card-shell"><div class="workspace-card-grid">' + (cards || '<div class="empty-state">Aucun module configure.</div>') + '</div></div></td></tr>';
    var buttons = elements.tableBody.querySelectorAll("[data-open-scoped-page]");
    for (var b = 0; b < buttons.length; b += 1) {
      buttons[b].onclick = function () {
        state.workspaceBackPage = state.page;
        state.page = this.getAttribute("data-open-scoped-page");
        state.query = "";
        state.editingId = "";
        state.formOpen = false;
        renderNav();
        render();
      };
    }
  }

  function workspaceModuleMeta(pageId) {
    var page = pageById(pageId) || ["", pageId, ""];
    var map = {
      implementationPlans: { icon: "I", title: "Plans integres", subtitle: "Consolider chronogramme, livrables, dependances et controles" },
      communicationPlans: { icon: "C", title: "Communication", subtitle: "Definir audience, canal, frequence et validation" },
      riskRegisters: { icon: "R", title: "Risques", subtitle: "Identifier, coter, assigner et suivre les reponses" },
      procurementPlans: { icon: "P", title: "Procurement", subtitle: "Planifier packages, methode, montant et attribution" },
      qualityPlans: { icon: "Q", title: "Qualite", subtitle: "Fixer criteres, controles et preuves d'acceptation" },
      resourcePlans: { icon: "H", title: "Ressources", subtitle: "Planifier equipe, capacites, assets et contraintes" },
      stakeholders: { icon: "👥", title: "Parties prenantes", subtitle: "Cartographier les acteurs, roles et staffs partenaires" },
      projectActivities: { icon: "🧭", title: "Activites projet", subtitle: "Structurer les activites et les modalites" },
      kpis: { icon: "📊", title: "KPIs", subtitle: "Definir les indicateurs, cibles et sources" },
      projectSubActivities: { icon: "🧩", title: "Sous activites", subtitle: "Relier les sous activites aux KPIs" },
      budgets: { icon: "💰", title: "Budget projet", subtitle: "Construire le budget et ses lignes detaillees" },
      grantInKinds: { icon: "🌾", title: "Grants en nature", subtitle: "Parametrer tonnages, rates et KPIs de facturation" },
      baselines: { icon: "📌", title: "Baseline", subtitle: "Documenter les valeurs de reference" },
      monthlyPlans: { icon: "🗓️", title: "Plans mensuels", subtitle: "Planifier les activites du mois" },
      processIndicators: { icon: "🔎", title: "Process monitoring", subtitle: "Creer les indicateurs de suivi process" },
      monthlyReports: { icon: "✅", title: "Reporting quantitatif", subtitle: "Reporter les realisations mensuelles" },
      monthlyExpenses: { icon: "💳", title: "Depenses mensuelles", subtitle: "Suivre l execution budgetaire" },
      recommendations: { icon: "📝", title: "Recommandations", subtitle: "Tracer les actions et leur statut" },
      processReports: { icon: "📋", title: "Rapport process", subtitle: "Reporter les indicateurs de process monitoring" },
      distributionReports: { icon: "🚚", title: "Distributions IK/CBT", subtitle: "Reporter les distributions par FDP" },
      progressReport: { icon: "📈", title: "Progress report", subtitle: "Generer le rapport narratif du projet" },
      partnerInvoice: { icon: "🧾", title: "Generer la facture", subtitle: "Produire la facture partenaire" },
      partnerInvoices: { icon: "📥", title: "Enregistrer une facture", subtitle: "Saisir et suivre les factures recues" },
      partnerInvoicePayments: { icon: "🏦", title: "Paiements", subtitle: "Suivre les paiements et soldes" },
      nfis: { icon: "📦", title: "NFI", subtitle: "Creer les articles NFI du projet" },
      nfiDistributions: { icon: "📤", title: "Distribution NFI", subtitle: "Enregistrer les distributions par FDP" },
      nfiInventories: { icon: "🧮", title: "Inventaire NFI", subtitle: "Verifier les quantites et etats sur site" }
    };
    return map[pageId] || { icon: page[2] || "•", title: page[1], subtitle: nextAction(pageId) };
  }

  function renderHome() {
    setFormPanelMode(false, true);
    removeFilters();
    removeCreateButton();
    elements.title.textContent = "Project, Programme and Portfolio Management";
    elements.kicker.textContent = "Strategie, gouvernance, execution, finances et reporting";
    elements.formKicker.textContent = "Connexion";
    elements.formTitle.textContent = "Accéder à l'application";
    setRegisterHeaderLabel("Accueil");
    elements.tableTitle.textContent = "Bienvenue sur Project, Programme and Portfolio Management";
    elements.tableCount.textContent = "";
    elements.form.innerHTML =
      '<div class="auth-panel active">' +
      '<label>Email<input name="loginEmail" type="email" placeholder="email@organisation.org"></label>' +
      '<label>Mot de passe<input name="loginPassword" type="password" placeholder="Mot de passe"></label>' +
      '<button type="button" class="primary-action" id="login-button">Se connecter</button>' +
      '<button type="button" class="secondary-action full-width-action" id="open-register-button">Créer un compte</button>' +
      '<button type="button" class="link-action" id="forgot-password-button">Mot de passe oublié ?</button>' +
      '<small>Les nouveaux comptes sont créés avec le niveau Visiteur. Un administrateur attribue ensuite les accès.</small>' +
      '<div class="service-access-help"><strong>Votre compte n&rsquo;est pas rattach&eacute; &agrave; Project, Programme and Portfolio Management ?</strong><span>Consultez les autres espaces NutVitaGlobalis auxquels vous avez acc&egrave;s.</span><div><a href="/services" target="_top">Tous les services</a><a href="/connexion" target="_top">Espace client</a><a href="/partenaire/connexion" target="_top">Espace nutritionniste</a><a href="/maximus/login" target="_top">Maximus</a></div></div>' +
      '</div>';
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td><section class="landing-hero">' +
      '<div><p class="eyebrow">Plateforme P3M</p><h2>Une application modulable pour piloter portefeuilles, programmes et projets.</h2><p>Elle relie la strategie aux registres, plans integres, risques, budget, procurement, execution, preuves et rapports de progression.</p><div class="landing-icon-row"><span>Portefeuille</span><span>Plans</span><span>Risques</span><span>Reporting</span></div></div>' +
      '<div class="landing-product-visual" aria-hidden="true">' +
      '<div class="product-window"><div class="window-dots"><span></span><span></span><span></span></div><div class="window-title">Vue projet consolidée</div>' +
      '<div class="product-kpis"><span><strong>24</strong><small>Activités</small></span><span><strong>86%</strong><small>Réalisation</small></span><span><strong>12</strong><small>Sites</small></span></div>' +
      '<div class="product-chart"><i style="height:42%"></i><i style="height:68%"></i><i style="height:54%"></i><i style="height:82%"></i><i style="height:63%"></i></div>' +
      '<div class="product-flow"><span>Planification</span><b></b><span>Exécution</span><b></b><span>Reporting</span></div>' +
      '</div>' +
      '<div class="floating-panel panel-a"><strong>Budget</strong><span>Plan vs réalisé</span></div><div class="floating-panel panel-b"><strong>Risques</strong><span>Actions suivies</span></div>' +
      '</div>' +
      '<div class="landing-mini-dashboard">' +
      dashboardCard("Utilisateurs", String(store.users.length), "Comptes actuellement créés") +
      dashboardCard("Projets gérés", String(store.projects.length), "Portefeuille actif dans l'application") +
      dashboardCard("Partenaires", String(store.partners.length), "Organisations coopérantes") +
      '</div></section><section class="landing-capabilities">' +
      '<article><i aria-hidden="true">P</i><strong>Planifier</strong><span>Plans mensuels, KPIs, sous-activités, grants et sites rattachés.</span></article>' +
      '<article><i aria-hidden="true">E</i><strong>Exécuter</strong><span>Reporting quantitatif, distributions IK/CBT, dépenses et recommandations.</span></article>' +
      '<article><i aria-hidden="true">R</i><strong>Rendre compte</strong><span>Dashboards, progress reports, facturation et rapports financiers.</span></article>' +
      '</section><footer class="landing-legal"><p>En continuant à naviguer dans cette application, l’utilisateur consent aux conditions d’utilisation.</p><div><button type="button" data-home-info="copyright">Copyright</button><button type="button" data-home-info="catalogue">Catalogue d’utilisation</button><button type="button" data-home-info="terms">Conditions d’utilisation</button></div></footer></td></tr>';
    elements.tableBody.innerHTML = homeLandingHtml();
    wireHomeAuth();
    handleResetHashIfPresent();
  }

  function homeLandingHtml() {
    return '<tr><td><section class="landing-banner" aria-hidden="true"></section><section class="landing-hero">' +
      '<div><p class="eyebrow">Plateforme P3M</p><div class="landing-statement"><h2>Une application modulable pour piloter portefeuilles, programmes et projets.</h2></div><p>Elle relie la strat&eacute;gie aux registres, plans int&eacute;gr&eacute;s, risques, budget, procurement, ex&eacute;cution, preuves et rapports de progression.</p><div class="landing-icon-row"><span>Portefeuille</span><span>Plans</span><span>Risques</span><span>Reporting</span></div></div>' +
      '<div class="landing-feature-stack" aria-label="Capacit&eacute;s cl&eacute;s">' +
      '<article><i aria-hidden="true">&#8761;</i><strong>Donn&eacute;es consolid&eacute;es</strong><span>Suivi clair des projets, sites, grants, activit&eacute;s et rapports.</span></article>' +
      '<article><i aria-hidden="true">&#9670;</i><strong>D&eacute;cision rapide</strong><span>Tableaux de bord, alertes, filtres et comparaisons planifi&eacute; versus r&eacute;alis&eacute;.</span></article>' +
      '<article><i aria-hidden="true">&#10003;</i><strong>Tra&ccedil;abilit&eacute;</strong><span>Soumission, v&eacute;rification, validation, renvoi et historique des actions.</span></article>' +
      '</div>' +
      '<div class="landing-mini-dashboard">' +
      dashboardCard("Utilisateurs", String(store.users.length), "Comptes actuellement crees") +
      dashboardCard("Projets geres", String(store.projects.length), "Portefeuille actif dans l'application") +
      dashboardCard("Partenaires", String(store.partners.length), "Organisations cooperantes") +
      '</div></section><section class="landing-capabilities">' +
      '<article><i aria-hidden="true">P</i><strong>Planifier</strong><span>Plans mensuels, KPIs, sous-activit&eacute;s, grants et sites rattach&eacute;s.</span></article>' +
      '<article><i aria-hidden="true">E</i><strong>Ex&eacute;cuter</strong><span>Reporting quantitatif, distributions IK/CBT, d&eacute;penses et recommandations.</span></article>' +
      '<article><i aria-hidden="true">R</i><strong>Rendre compte</strong><span>Dashboards, progress reports, facturation et rapports financiers.</span></article>' +
      '</section><footer class="landing-legal"><div><button type="button" data-home-info="copyright">Copyright</button><button type="button" data-home-info="catalogue">Catalogue d&rsquo;utilisation</button><button type="button" data-home-info="terms">Conditions d&rsquo;utilisation</button></div></footer></td></tr>';
  }

  function setRegisterHeaderLabel(value) {
    var label = document.querySelector(".register-panel .panel-header .eyebrow");
    if (label) label.textContent = value || "Registre";
  }

  function wireHomeAuth() {
    var login = document.getElementById("login-button");
    if (login) login.onclick = handleLogin;
    var forgot = document.getElementById("forgot-password-button");
    if (forgot) forgot.onclick = openForgotPasswordModal;
    var register = document.getElementById("open-register-button");
    if (register) register.onclick = openCreateAccountModal;
    var infoLinks = elements.tableBody.querySelectorAll("[data-home-info]");
    for (var l = 0; l < infoLinks.length; l += 1) {
      infoLinks[l].onclick = function () { openHomeInfoModal(this.getAttribute("data-home-info")); };
    }
  }

  function openHomeInfoModal(type) {
    closeHomeInfoModal();
    var content = homeInfoContent(type);
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "home-info-modal";
    backdrop.innerHTML = '<div class="modal-card home-info-card" role="dialog" aria-modal="true">' +
      '<div class="modal-header"><div><p>Project, Programme and Portfolio Management</p><h3>' + escapeHtml(content.title) + '</h3></div><button type="button" class="modal-close" data-close-home-info>x</button></div>' +
      '<div class="home-info-body">' + content.html + '</div>' +
      '<div class="modal-actions"><button type="button" class="primary-action" data-close-home-info>J ai compris</button></div></div>';
    document.body.appendChild(backdrop);
    var buttons = backdrop.querySelectorAll("[data-close-home-info]");
    for (var i = 0; i < buttons.length; i += 1) buttons[i].onclick = closeHomeInfoModal;
  }

  function closeHomeInfoModal() {
    var modal = document.getElementById("home-info-modal");
    if (modal) modal.parentNode.removeChild(modal);
  }

  function openCreateAccountModal() {
    closeHomeInfoModal();
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "home-info-modal";
    backdrop.innerHTML = '<div class="modal-card account-modal-card" role="dialog" aria-modal="true">' +
      '<div class="modal-header"><div><p>Accès utilisateur</p><h3>Créer un compte</h3></div><button type="button" class="modal-close" data-close-home-info>x</button></div>' +
      '<form id="create-account-form" class="modal-form account-form">' +
      '<div class="account-intro"><span aria-hidden="true">+</span><div><strong>Bienvenue dans Project, Programme and Portfolio Management</strong><small>Créez votre profil. Vos accès seront ensuite attribués par un administrateur selon votre périmètre d’intervention.</small></div></div>' +
      '<div class="form-grid">' +
      '<label>Nom<input name="regLastName" type="text" required></label>' +
      '<label>Prénom<input name="regFirstName" type="text" required></label>' +
      '<label>Email<input name="regEmail" type="email" required></label>' +
      '<label>Sexe<select name="regSex" required><option>Female</option><option>Male</option><option>Other / prefer not to say</option></select></label>' +
      '<label>Catégorie d’âge<select name="regAgeCategory" required><option>18-35 ans</option><option>36-45 ans</option><option>46-55 ans</option><option>55 et plus</option></select></label>' +
      '<label>Mot de passe<input name="regPassword" type="password" required minlength="6"></label>' +
      '<label>Confirmer le mot de passe<input name="regPasswordConfirm" type="password" required minlength="6"></label>' +
      '</div>' +
      '<p class="muted">Le compte sera créé avec le niveau Visiteur. Un administrateur devra ensuite attribuer les accès.</p>' +
      '<div class="modal-actions"><button type="button" data-close-home-info>Annuler</button><button class="primary-action" type="submit">Créer le compte</button></div></form></div>';
    document.body.appendChild(backdrop);
    var closeButtons = backdrop.querySelectorAll("[data-close-home-info]");
    for (var i = 0; i < closeButtons.length; i += 1) closeButtons[i].onclick = closeHomeInfoModal;
    var form = document.getElementById("create-account-form");
    if (form) form.onsubmit = handlePublicRegistration;
  }

  function openForgotPasswordModal() {
    closeHomeInfoModal();
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "home-info-modal";
    backdrop.innerHTML = '<div class="modal-card home-info-card" role="dialog" aria-modal="true">' +
      '<div class="modal-header"><div><p>Securite du compte</p><h3>Reinitialiser le mot de passe</h3></div><button type="button" class="modal-close" data-close-home-info>x</button></div>' +
      '<form id="forgot-password-form" class="modal-form">' +
      '<label>Adresse email du compte<input name="resetEmail" type="email" required placeholder="email@organisation.org"></label>' +
      '<p class="muted">Un lien de reinitialisation sera prepare pour cette adresse email. Dans cette version locale, le lien s ouvre via votre client email.</p>' +
      '<div class="modal-actions"><button type="button" data-close-home-info>Annuler</button><button class="primary-action" type="submit">Envoyer le lien</button></div></form></div>';
    document.body.appendChild(backdrop);
    var closeButtons = backdrop.querySelectorAll("[data-close-home-info]");
    for (var i = 0; i < closeButtons.length; i += 1) closeButtons[i].onclick = closeHomeInfoModal;
    var form = document.getElementById("forgot-password-form");
    if (form) form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      var email = normalizeEmail(form.elements.resetEmail.value);
      var user = findUserByEmail(email);
      if (!user) {
        window.alert("Aucun compte actif ne correspond a cette adresse email.");
        return false;
      }
      var token = createPasswordResetToken(user);
      saveStoredData();
      var link = resetPasswordLink(token);
      var subject = encodeURIComponent("Reinitialisation du mot de passe - Project, Programme and Portfolio Management");
      var body = encodeURIComponent("Bonjour,\n\nVeuillez utiliser ce lien pour initialiser votre mot de passe Project, Programme and Portfolio Management:\n" + link + "\n\nSi vous n'avez pas demande cette action, ignorez ce message.");
      window.location.href = "mailto:" + encodeURIComponent(user.email) + "?subject=" + subject + "&body=" + body;
      window.alert("Le lien de reinitialisation a ete prepare dans votre client email.");
      closeHomeInfoModal();
      return false;
    };
  }

  function createPasswordResetToken(user) {
    var token = "RST-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
    user.resetToken = token;
    user.resetTokenAt = new Date().toISOString();
    return token;
  }

  function resetPasswordLink(token) {
    var base = String(window.location.href || "").split("#")[0];
    return base + "#reset=" + encodeURIComponent(token);
  }

  function handleResetHashIfPresent() {
    var hash = String(window.location.hash || "");
    if (hash.indexOf("#reset=") !== 0) return;
    var token = decodeURIComponent(hash.replace("#reset=", ""));
    window.location.hash = "";
    setTimeout(function () { openPasswordResetModal(token); }, 50);
  }

  function openPasswordResetModal(token) {
    closeHomeInfoModal();
    var user = userByResetToken(token);
    if (!user) {
      window.alert("Lien de reinitialisation invalide ou deja utilise.");
      return;
    }
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "home-info-modal";
    backdrop.innerHTML = '<div class="modal-card home-info-card" role="dialog" aria-modal="true">' +
      '<div class="modal-header"><div><p>Securite du compte</p><h3>Nouveau mot de passe</h3></div><button type="button" class="modal-close" data-close-home-info>x</button></div>' +
      '<form id="reset-password-form" class="modal-form">' +
      '<p>Compte: <strong>' + escapeHtml(user.email) + '</strong></p>' +
      '<label>Nouveau mot de passe<input name="newPassword" type="password" required minlength="6"></label>' +
      '<label>Confirmer le mot de passe<input name="confirmPassword" type="password" required minlength="6"></label>' +
      '<div class="modal-actions"><button type="button" data-close-home-info>Annuler</button><button class="primary-action" type="submit">Initialiser le mot de passe</button></div></form></div>';
    document.body.appendChild(backdrop);
    var closeButtons = backdrop.querySelectorAll("[data-close-home-info]");
    for (var i = 0; i < closeButtons.length; i += 1) closeButtons[i].onclick = closeHomeInfoModal;
    var form = document.getElementById("reset-password-form");
    if (form) form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      var next = form.elements.newPassword.value;
      var confirm = form.elements.confirmPassword.value;
      if (next !== confirm) {
        window.alert("Les deux mots de passe ne correspondent pas.");
        return false;
      }
      user.password = next;
      user.resetToken = "";
      user.resetTokenAt = "";
      saveStoredData();
      window.alert("Mot de passe initialise. Vous pouvez maintenant vous connecter.");
      closeHomeInfoModal();
      return false;
    };
  }

  function userByResetToken(token) {
    for (var i = 0; i < store.users.length; i += 1) if (store.users[i].resetToken === token) return store.users[i];
    return null;
  }

  function homeInfoContent(type) {
    if (type === "catalogue") {
      return {
        title: "Catalogue d utilisation",
        html: '<p>Ce catalogue sert de guide rapide pour comprendre comment interagir avec l application du parametrage jusqu au reporting.</p><ol><li><strong>Se connecter ou creer un compte.</strong> L utilisateur renseigne ses informations de base. Un administrateur attribue ensuite le role et le perimetre d acces.</li><li><strong>Configurer les referentiels.</strong> Creer les offices en charge, sites administratifs, FDP, partenaires cooperants, grants, staffs, documents strategiques, cooperatives/GICs et autres donnees de base.</li><li><strong>Creer un projet.</strong> Selectionner le document strategique, la monnaie du projet, les dates, le partenaire, les grants, les sites/FDP et les informations structurantes.</li><li><strong>Construire le plan du projet.</strong> Depuis le projet selectionne, renseigner parties prenantes, activites, KPIs, sous-activites, budget, grants en nature et baseline.</li><li><strong>Planifier le mois.</strong> Creer un plan mensuel, choisir les activites ou sous-activites applicables, les KPIs, cibles, grants, sites concernes et points focaux.</li><li><strong>Executer et reporter.</strong> Renseigner les realisations quantitatives, distributions IK/CBT, depenses, rapports process, recommandations, NFI et suivis operationnels.</li><li><strong>Verifier, valider ou renvoyer.</strong> Les donnees suivent la logique Draft, Submitted, Verified, Validated ou Returned. Les raisons de renvoi sont conservees dans l historique.</li><li><strong>Analyser les resultats.</strong> Utiliser le dashboard avec les filtres projet, periode, grant et localisation pour comparer planifie et realise.</li><li><strong>Produire les documents.</strong> Generer progress reports, factures partenaires, rapports financiers, bons de commande et impressions de registre.</li><li><strong>Exporter ou importer.</strong> Utiliser les boutons d import/export lorsque les champs correspondent au modele du registre concerne.</li></ol><p>Conseil: commencer toujours par selectionner le projet lorsque la page le propose. Le projet pilote ensuite les listes dynamiques, les monnaies, les grants, les sites et les donnees associees.</p>'
      };
    }
    if (type === "terms") {
      return {
        title: "Conditions d utilisation",
        html: '<p>Cette application est destinee a la gestion operationnelle de projets. L utilisateur s engage a saisir des informations exactes, a respecter la confidentialite des donnees et a utiliser uniquement les modules et donnees correspondant a ses droits d acces.</p><p>Les informations enregistrees localement dans l application servent au suivi, a la planification, au reporting et a la production de documents de gestion. Toute modification, validation, renvoi ou suppression peut etre tracee par l application.</p><p><strong>En continuant a naviguer, l utilisateur reconnait avoir pris connaissance de ces conditions et consent a leur application.</strong></p>'
      };
    }
    return {
      title: "Copyright",
      html: '<p>Copyright (c) ' + new Date().getFullYear() + ' Project, Programme and Portfolio Management. Tous droits reserves.</p><p>L application, sa structure, ses formulaires, ses tableaux de bord et ses modeles de rapports sont destines a l usage autorise de l organisation qui l exploite. Toute reproduction, redistribution ou adaptation non autorisee est interdite sans accord prealable.</p>'
    };
  }

  function handleLogin() {
    var email = normalizeEmail(formValue("loginEmail"));
    var password = formValue("loginPassword");
    var user = findUserByEmail(email);
    if (!user) {
      window.alert("Ce compte ne dispose pas d'un acces a Project, Programme and Portfolio Management. Verifiez l'adresse utilisee pour ce service ou consultez les autres services NutVitaGlobalis proposes sous le formulaire.");
      return;
    }
    if (user.status === "Inactive") {
      window.alert("Votre acces a Project, Programme and Portfolio Management est inactif. Contactez l'administrateur du service.");
      return;
    }
    if (user.password !== password) {
      window.alert("Mot de passe Project, Programme and Portfolio Management incorrect.");
      return;
    }
    saveCurrentUser(user.email);
    state.page = "operationsDashboard";
    renderNav();
    render();
  }

  function handlePublicRegistration() {
    var form = document.getElementById("create-account-form") || elements.form;
    var email = normalizeEmail(form.elements.regEmail ? form.elements.regEmail.value : "");
    if (!email) {
      window.alert("Veuillez renseigner une adresse email.");
      return;
    }
    if (findUserByEmail(email)) {
      window.alert("Un compte existe deja avec cette adresse email.");
      return;
    }
    var password = form.elements.regPassword ? form.elements.regPassword.value : "";
    var confirm = form.elements.regPasswordConfirm ? form.elements.regPasswordConfirm.value : password;
    if (password !== confirm) {
      window.alert("Les deux mots de passe ne correspondent pas.");
      return false;
    }
    var user = {
      id: generatedUserId(todayIsoDate(), ""),
      lastName: form.elements.regLastName ? form.elements.regLastName.value : "",
      firstName: form.elements.regFirstName ? form.elements.regFirstName.value : "",
      sex: form.elements.regSex ? form.elements.regSex.value : "",
      ageCategory: form.elements.regAgeCategory ? form.elements.regAgeCategory.value : "",
      email: email,
      password: password || "password",
      role: "Visitor",
      status: "Active",
      createdAt: new Date().toISOString(),
      createdByEmail: email
    };
    store.users.push(user);
    saveStoredData();
    saveCurrentUser(email);
    state.page = "operationsDashboard";
    closeHomeInfoModal();
    renderNav();
    render();
    return false;
  }

  function renderAuthControls() {
    var actions = document.querySelector(".topbar-actions");
    if (!actions) return;
    var old = document.getElementById("auth-status");
    if (old) old.parentNode.removeChild(old);
    var user = currentUser();
    if (!user) return;
    var box = document.createElement("div");
    box.id = "auth-status";
    box.className = "auth-status";
    box.innerHTML = '<span><strong>' + escapeHtml(user.firstName || user.email) + '</strong><small>' + escapeHtml(user.role || "Visitor") + '</small></span><button type="button" id="logout-button">Sortir</button>';
    actions.insertBefore(box, actions.firstChild);
    var logout = document.getElementById("logout-button");
    if (logout) logout.onclick = function () {
      saveCurrentUser("");
      state.page = "home";
      state.contextProjectId = "";
      renderNav();
      render();
    };
  }

  function renderOverview() {
    setFormPanelMode(false, false);
    removeFilters();
    elements.title.textContent = "Configuration Project, Programme and Portfolio";
    elements.kicker.textContent = "Organisation, strategie, gouvernance, plans et suivi";
    elements.formKicker.textContent = "Flux recommande";
    elements.formTitle.textContent = "Ordre de configuration";
    elements.tableTitle.textContent = "Synthese des registres";
    elements.tableCount.textContent = "52";
    elements.form.innerHTML = '<div class="empty-state"><strong>1. Configurer l organisation</strong><p>Enregistrer la structure, ses bureaux, ses staffs, ses partenaires, ses sites et ses documents strategiques.</p><strong>2. Structurer la gouvernance</strong><p>Creer les portefeuilles, programmes et projets; relier chaque projet a la strategie, au financement, aux sites et au partenaire.</p><strong>3. Construire les plans PMBOK</strong><p>Documenter le plan integre, le chronogramme, le budget, le plan M&E, les risques, la communication, le procurement, la qualite et les ressources.</p><strong>4. Suivre l execution</strong><p>Renseigner les plans mensuels, realisations, depenses, process monitoring, recommandations, distributions et preuves de mise en oeuvre.</p><strong>5. Produire les rapports</strong><p>Generer les progress reports par periode ajustable, rapports financiers, factures et impressions de registres.</p></div>';
    elements.tableHead.innerHTML = "<tr><th>Module</th><th>Enregistrements</th><th>Action utile</th></tr>";
    var rows = "";
    var keys = ["workspaceProfiles", "fieldOffices", "sites", "fdps", "partners", "cooperativePartners", "strategicDocuments", "grants", "staffs", "partnerStaffs", "portfolios", "programmes", "projects", "stakeholders", "implementationPlans", "projectActivities", "projectSubActivities", "monthlyPlans", "monthlyReports", "monthlyExpenses", "recommendations", "distributionReports", "nfis", "nfiDistributions", "nfiInventories", "partnerInvoices", "partnerInvoicePayments", "processIndicators", "processReports", "communicationPlans", "procurementPlans", "riskRegisters", "qualityPlans", "resourcePlans", "amendments", "users", "kpis", "budgets", "grantInKinds", "baselines", "hgsfIngredients", "hgsfMenus", "hgsfSchoolMenus", "hgsfEstimations", "hgsfPurchaseOrders", "hgsfDeliveries", "hgsfDeliveryInvoices", "hgsfInvoicePayments", "hgsfSchoolCoopPayments", "assistanceRations", "gfdNeeds", "cbtNeeds", "nutritionNeeds"];
    for (var i = 0; i < keys.length; i += 1) rows += "<tr><td>" + pageLabel(keys[i]) + "</td><td>" + store[keys[i]].length + "</td><td>" + nextAction(keys[i]) + "</td></tr>";
    elements.tableBody.innerHTML = rows;
  }

  function renderPage() {
    var config = configs[state.page];
    var records = filteredRecords(state.page);
    var editRecord = state.editingId ? findByRecordId(store[state.page] || [], state.editingId) : null;
    setFormPanelMode(true, state.formOpen);
    elements.title.textContent = config.title;
    elements.kicker.textContent = config.kicker;
    elements.formKicker.textContent = config.kicker;
    elements.formTitle.textContent = config.title;
    elements.tableTitle.textContent = config.title;
    elements.tableCount.textContent = records.length;
    if (state.formOpen) renderForm(config, editRecord);
    else elements.form.innerHTML = "";
    renderFilters(config);
    renderTable(config, records);
    addCreateButton(config);
    addWorkspaceBackButton();
  }

  function renderMonthlyFollowUp() {
    setFormPanelMode(false, false);
    removeFilters();
    elements.title.textContent = "Suivi des ecarts mensuels";
    elements.kicker.textContent = "Planifie vs realise";
    elements.formKicker.textContent = "Lecture operationnelle";
    elements.formTitle.textContent = "Points d'attention";
    elements.tableTitle.textContent = "Ecarts par activite planifiee";
    elements.form.innerHTML = '<div class="empty-state"><strong>Comparer les realisations aux cibles</strong><p>Cette page consolide les plans mensuels et les rapports soumis.</p><strong>Utilisation</strong><p>Commencer par creer un plan mensuel, puis enregistrer le reporting correspondant.</p></div>';
    elements.tableHead.innerHTML = "<tr><th>Plan</th><th>Mois</th><th>KPI</th><th>Cible</th><th>Realisation</th><th>Ecart</th><th>Statut</th></tr>";
    elements.tableBody.innerHTML = monthlyGapRows();
    elements.tableCount.textContent = store.monthlyPlans.length;
  }

  function renderOperationsDashboard() {
    setFormPanelMode(false, true);
    removeFilters();
    elements.form.onchange = null;
    elements.form.oninput = null;
    elements.form.onsubmit = null;
    elements.title.textContent = "Dashboard de suivi des operations";
    elements.kicker.textContent = "Pilotage operationnel multi-organisation";
    elements.formKicker.textContent = "Filtres";
    elements.formTitle.textContent = "Periode et projet";
    elements.tableTitle.textContent = "Vue consolidee";
    elements.form.innerHTML =
      '<label>Projet<select name="projectId">' + optionsHtml(optionPairs(store.projects, "id", "title"), state.contextProjectId || "") + '</select></label>' +
      '<label>Periode debut<input name="startMonth" type="month" /></label>' +
      '<label>Periode fin<input name="endMonth" type="month" /></label>' +
      '<label>Statut<select name="status"><option value="">Tous</option><option>Draft</option><option>Submitted</option><option>Approved</option><option>Validated</option><option>Completed</option><option>Reconciled</option><option>Issue flagged</option></select></label>' +
      '<label>Axe du graphe<select name="chartAxis"><option value="month">Mois</option><option value="quarter">Trimestre</option><option value="year">Annee</option><option value="csp">Activite CSP</option><option value="project">Projet</option><option value="grant">Grant</option></select></label>' +
      '<label>Cooperative / GIC<select name="cooperativePartnerId"></select></label>' +
      '<label>Grant<select name="grantCode"></select></label>' +
      '<fieldset class="dashboard-check-filter"><legend>Region(s)</legend><div class="check-list dashboard-check-list" data-dashboard-filter="regions"></div></fieldset>' +
      '<fieldset class="dashboard-check-filter"><legend>Departement(s)</legend><div class="check-list dashboard-check-list" data-dashboard-filter="departments"></div></fieldset>' +
      '<fieldset class="dashboard-check-filter"><legend>Arrondissement(s)</legend><div class="check-list dashboard-check-list" data-dashboard-filter="arrondissements"></div></fieldset>' +
      '<fieldset class="dashboard-check-filter"><legend>FDP(s)</legend><div class="check-list dashboard-check-list" data-dashboard-filter="fdps"></div></fieldset>' +
      '<div class="form-actions"><button class="primary-action" type="submit">Filtrer</button><button type="button" id="reset-dashboard">Effacer</button></div>';
    syncDashboardFilterOptions();
    elements.form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      renderDashboardBody(readDashboardParams());
      return false;
    };
    elements.form.onchange = function (event) {
      var target = event.target || event.srcElement;
      if (target && (target.name === "projectId" || target.name === "dashboard-region" || target.name === "dashboard-department" || target.name === "dashboard-arrondissement")) syncDashboardFilterOptions();
      renderDashboardBody(readDashboardParams());
    };
    document.getElementById("reset-dashboard").onclick = function () {
      elements.form.reset();
      syncDashboardFilterOptions();
      renderDashboardBody(readDashboardParams());
    };
    renderDashboardBody(readDashboardParams());
  }

  function loadCurrentUser() {
    try {
      state.currentUserEmail = window.localStorage ? (window.localStorage.getItem(authStorageKey) || "") : "";
    } catch (error) {
      state.currentUserEmail = "";
    }
    if (state.currentUserEmail && !findUserByEmail(state.currentUserEmail)) state.currentUserEmail = "";
    state.page = state.currentUserEmail ? "operationsDashboard" : "home";
  }

  function saveCurrentUser(email) {
    state.currentUserEmail = email || "";
    try {
      if (window.localStorage) {
        if (state.currentUserEmail) window.localStorage.setItem(authStorageKey, state.currentUserEmail);
        else window.localStorage.removeItem(authStorageKey);
      }
    } catch (error) {
      state.currentUserEmail = email || "";
    }
  }

  function ensureAdminUser() {
    if (!store.users) store.users = [];
    var admin = findUserByEmail(adminEmail);
    if (!admin) {
      store.users.unshift({
        id: generatedUserId(todayIsoDate(), ""),
        lastName: "Zebaze",
        firstName: "Paul",
        sex: "",
        ageCategory: "",
        email: adminEmail,
        password: adminDefaultPassword,
        role: "Admin",
        status: "Active",
        createdAt: new Date().toISOString(),
        createdByEmail: adminEmail
      });
    } else {
      admin.role = "Admin";
      admin.status = "Active";
      if (!admin.password) admin.password = adminDefaultPassword;
    }
  }

  function readDashboardParams() {
    return {
      projectId: elements.form.elements.projectId ? elements.form.elements.projectId.value : "",
      startMonth: elements.form.elements.startMonth ? elements.form.elements.startMonth.value : "",
      endMonth: elements.form.elements.endMonth ? elements.form.elements.endMonth.value : "",
      status: elements.form.elements.status ? elements.form.elements.status.value : ""
      ,
      chartAxis: elements.form.elements.chartAxis ? elements.form.elements.chartAxis.value : "month",
      cooperativePartnerId: elements.form.elements.cooperativePartnerId ? elements.form.elements.cooperativePartnerId.value : "",
      grantCode: elements.form.elements.grantCode ? elements.form.elements.grantCode.value : "",
      regions: dashboardCheckedValues("dashboard-region"),
      departments: dashboardCheckedValues("dashboard-department"),
      arrondissements: dashboardCheckedValues("dashboard-arrondissement"),
      fdpIds: dashboardCheckedValues("dashboard-fdp")
    };
  }

  function selectedControlValues(control) {
    var values = [];
    if (!control) return values;
    if (!control.options) return control.value ? [control.value] : values;
    for (var i = 0; i < control.options.length; i += 1) if (control.options[i].selected && control.options[i].value) values.push(control.options[i].value);
    return values;
  }

  function dashboardCheckedValues(name) {
    var out = [];
    var boxes = elements.form ? elements.form.querySelectorAll('input[name="' + name + '"]:checked') : [];
    for (var i = 0; i < boxes.length; i += 1) out.push(boxes[i].value);
    return out;
  }

  function syncDashboardFilterOptions() {
    if (!elements.form || state.page !== "operationsDashboard") return;
    var projectId = elements.form.elements.projectId ? elements.form.elements.projectId.value : "";
    updateSelectOptions(elements.form.elements.grantCode, projectId ? grantOptionsForProject(projectId) : allGrantOptions());
    updateSelectOptions(elements.form.elements.cooperativePartnerId, dashboardCooperativeOptions(projectId));
    var currentRegions = dashboardCheckedValues("dashboard-region");
    var regionOpts = dashboardRegionOptions(projectId);
    currentRegions = filterValidValues(currentRegions, regionOpts);
    setDashboardCheckGroup("regions", "dashboard-region", regionOpts, currentRegions);
    var currentDepartments = dashboardCheckedValues("dashboard-department");
    var departmentOpts = dashboardDepartmentOptions(projectId, currentRegions);
    currentDepartments = filterValidValues(currentDepartments, departmentOpts);
    setDashboardCheckGroup("departments", "dashboard-department", departmentOpts, currentDepartments);
    var currentArrondissements = dashboardCheckedValues("dashboard-arrondissement");
    var arrondissementOpts = dashboardArrondissementOptions(projectId, currentRegions, currentDepartments);
    currentArrondissements = filterValidValues(currentArrondissements, arrondissementOpts);
    setDashboardCheckGroup("arrondissements", "dashboard-arrondissement", arrondissementOpts, currentArrondissements);
    var currentFdps = dashboardCheckedValues("dashboard-fdp");
    var fdpOpts = dashboardFdpOptions(projectId, currentRegions, currentDepartments, currentArrondissements);
    currentFdps = filterValidValues(currentFdps, fdpOpts);
    setDashboardCheckGroup("fdps", "dashboard-fdp", fdpOpts, currentFdps);
  }

  function setDashboardCheckGroup(key, name, options, selectedValues) {
    var holder = elements.form.querySelector('[data-dashboard-filter="' + key + '"]');
    if (!holder) return;
    var selected = {};
    selectedValues = selectedValues || [];
    for (var i = 0; i < selectedValues.length; i += 1) selected[selectedValues[i]] = true;
    var normalized = normalizeOptions(options || []);
    if (!normalized.length) {
      holder.innerHTML = '<p class="muted-inline">Aucun element disponible pour le projet selectionne.</p>';
      return;
    }
    var html = "";
    for (var j = 0; j < normalized.length; j += 1) {
      var option = normalized[j];
      html += '<label><input type="checkbox" name="' + name + '" value="' + escapeHtml(option.value) + '"' + (selected[option.value] ? " checked" : "") + "><span>" + escapeHtml(option.label) + "</span></label>";
    }
    holder.innerHTML = html;
  }

  function dashboardFdpsForProject(projectId) {
    if (!projectId) return store.fdps.slice();
    var project = findByRecordId(store.projects, projectId);
    if (!project) return [];
    var items = projectFdpsForRecord(project);
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId);
      if (fdp) out.push(fdp);
    }
    return out;
  }

  function dashboardFdpMeta(fdp) {
    fdp = fdp || {};
    var meta = adminMetaForArrondissement(fdp && fdp.arrondissement, "Cameroon") || {};
    return {
      country: fdp.country || meta.country || "Cameroon",
      region: fdp.region || meta.region || "",
      department: fdp.department || meta.department || "",
      arrondissement: fdp.arrondissement || meta.arrondissement || ""
    };
  }

  function dashboardRegionOptions(projectId) {
    var seen = {};
    var out = [];
    var fdps = dashboardFdpsForProject(projectId);
    for (var i = 0; i < fdps.length; i += 1) {
      var meta = dashboardFdpMeta(fdps[i]);
      if (meta.region && !seen[meta.region]) {
        seen[meta.region] = true;
        out.push({ value: meta.region, label: meta.region });
      }
    }
    out.sort(sortOptionsByLabel);
    return out;
  }

  function dashboardDepartmentOptions(projectId, regions) {
    var seen = {};
    var out = [];
    var fdps = dashboardFdpsForProject(projectId);
    regions = regions || [];
    for (var i = 0; i < fdps.length; i += 1) {
      var meta = dashboardFdpMeta(fdps[i]);
      if (regions.length && regions.indexOf(meta.region) < 0) continue;
      if (meta.department && !seen[meta.department]) {
        seen[meta.department] = true;
        out.push({ value: meta.department, label: meta.department + (meta.region ? " / " + meta.region : "") });
      }
    }
    out.sort(sortOptionsByLabel);
    return out;
  }

  function dashboardArrondissementOptions(projectId, regions, departments) {
    var seen = {};
    var out = [];
    var fdps = dashboardFdpsForProject(projectId);
    regions = regions || [];
    departments = departments || [];
    for (var i = 0; i < fdps.length; i += 1) {
      var meta = dashboardFdpMeta(fdps[i]);
      if (regions.length && regions.indexOf(meta.region) < 0) continue;
      if (departments.length && departments.indexOf(meta.department) < 0) continue;
      if (meta.arrondissement && !seen[meta.arrondissement]) {
        seen[meta.arrondissement] = true;
        out.push({ value: meta.arrondissement, label: meta.arrondissement + (meta.department ? " / " + meta.department : "") });
      }
    }
    out.sort(sortOptionsByLabel);
    return out;
  }

  function dashboardFdpOptions(projectId, regions, departments, arrondissements) {
    var out = [];
    var fdps = dashboardFdpsForProject(projectId);
    regions = regions || [];
    departments = departments || [];
    arrondissements = arrondissements || [];
    for (var i = 0; i < fdps.length; i += 1) {
      var meta = dashboardFdpMeta(fdps[i]);
      if (regions.length && regions.indexOf(meta.region) < 0) continue;
      if (departments.length && departments.indexOf(meta.department) < 0) continue;
      if (arrondissements.length && arrondissements.indexOf(meta.arrondissement) < 0) continue;
      out.push({ value: fdps[i].id, label: fdpLabel(fdps[i]) });
    }
    out.sort(sortOptionsByLabel);
    return out;
  }

  function dashboardCooperativeOptions(projectId) {
    if (!projectId) return optionPairs(store.cooperativePartners, "id", "name");
    var fdps = dashboardFdpsForProject(projectId).map(function (fdp) { return fdp.id; });
    var out = [];
    for (var i = 0; i < store.cooperativePartners.length; i += 1) {
      var coop = store.cooperativePartners[i];
      if (arraysOverlap(coop.schoolFdpIds || [], fdps)) out.push({ value: coop.id, label: coop.name || coop.id });
    }
    return out.length ? out : optionPairs(store.cooperativePartners, "id", "name");
  }

  function sortOptionsByLabel(a, b) {
    return String(a.label || "").localeCompare(String(b.label || ""));
  }

  function renderDashboardBody(params) {
    var planned = filteredByParams(store.monthlyPlans, params).length;
    var reports = filteredByParams(store.monthlyReports, params).length;
    var expenses = filteredByParams(store.monthlyExpenses, params);
    var distributions = distributionReportsForDashboard(params);
    var spent = sumField(expenses, "amountXaf");
    var currency = projectCurrency(params.projectId);
    var completion = planned ? Math.round((reports / planned) * 100) : 0;
    var distTotals = distributionTotals(distributions, params);
    elements.tableCount.textContent = planned + reports + expenses.length + distributions.length;
    elements.tableHead.innerHTML = "";
    var hasLocation = dashboardHasLocationFilter(params);
    var topCards = hasLocation ?
      dashboardCard("FDPs reportes", distTotals.sites, "Apres filtres localisation") +
      dashboardCard("BNF distribution", formatNumber(distTotals.beneficiaries), "Max assiste sur la periode") +
      dashboardCard("Vivres distribues", formatDecimal(distTotals.food, 3) + " MT", "Somme sur la periode") +
      dashboardCard("Cash transfere", moneyText(distTotals.cash, currency), "Somme sur la periode") :
      dashboardCard("Activites planifiees", planned, "Plans mensuels dans la periode") +
      dashboardCard("Rapports recus", reports, completion + "% de couverture reporting") +
      dashboardCard("Depenses", moneyText(spent, currency), "Execution mensuelle renseignee") +
      dashboardCard("BNF distribution", formatNumber(distTotals.beneficiaries), "Max assiste sur la periode");
    var sections = "";
    if (!hasLocation) sections += '<div class="dashboard-section chart-panel"><h3>Reporting Quantitatif Mensuel</h3>' + dashboardKpiSection(params) + '</div>';
    sections += '<div class="dashboard-section chart-panel"><h3>Distributions IK / CBT</h3>' + dashboardDistributionSection(params, distributions) + '</div>';
    if (!hasLocation) sections += '<div class="dashboard-section chart-panel"><h3>Depenses du projet</h3>' + dashboardBudgetSection(params) + '</div>';
    if (!hasLocation) sections += '<div class="dashboard-section chart-panel"><h3>Facturation</h3>' + dashboardInvoiceSection(params) + '</div>';
    if (hasLocation) sections += '<p class="alert-inline">Les sections KPI, depenses et facturation sont masquees car le filtre de localisation ne s applique pas de facon fiable a ces donnees.</p>';
    sections += '<div class="dashboard-section"><h3>Vue consolidee dynamique</h3>' + dashboardTables(params) + '</div>';
    elements.tableBody.innerHTML =
      '<tr><td><div class="dashboard-grid">' + topCards + '</div>' + sections +
      "</td></tr>";
  }

  function dashboardHasLocationFilter(params) {
    return (params.regions && params.regions.length) || (params.departments && params.departments.length) || (params.arrondissements && params.arrondissements.length) || (params.fdpIds && params.fdpIds.length);
  }

  function dashboardCard(title, value, note) {
    return '<div class="dash-card"><span>' + escapeHtml(title) + '</span><strong>' + escapeHtml(value) + '</strong><small>' + escapeHtml(note) + '</small></div>';
  }

  function dashboardKpiSection(params) {
    var grouped = {};
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (!recordMatchesDashboard(plan, params)) continue;
      var label = kpiLabel(plan.kpiId) || plan.kpiId || "KPI";
      if (!grouped[label]) grouped[label] = { planned: 0, achieved: 0 };
      grouped[label].planned += progressNumericValue(plan.target);
    }
    for (var r = 0; r < store.monthlyReports.length; r += 1) {
      var report = store.monthlyReports[r];
      var linkedPlan = findByRecordId(store.monthlyPlans, report.planId);
      if (!linkedPlan || !recordMatchesDashboard(linkedPlan, params)) continue;
      var kpi = kpiLabel(linkedPlan.kpiId) || linkedPlan.kpiId || "KPI";
      if (!grouped[kpi]) grouped[kpi] = { planned: 0, achieved: 0 };
      grouped[kpi].achieved += progressNumericValue(report.achieved);
    }
    return comparisonChart(grouped, "KPI", "Planifie", "Realise", "kpi");
  }

  function dashboardDistributionSection(params, records) {
    var sites = {};
    var bnf = {};
    var food = {};
    var cash = {};
    var currency = projectCurrency(params.projectId);
    for (var i = 0; i < records.length; i += 1) {
      var lines = records[i].distributionLines || [];
      for (var l = 0; l < lines.length; l += 1) {
        if (!distributionLineMatchesLocation(lines[l], params)) continue;
        var key = params.chartAxis === "month" ? records[i].month || "Sans mois" : resolveReferenceLabel("fdpId", lines[l].fdpId);
        if (!sites[key]) sites[key] = { planned: 0, achieved: 0 };
        if (!bnf[key]) bnf[key] = { planned: 0, achieved: 0 };
        if (!food[key]) food[key] = { planned: 0, achieved: 0 };
        if (!cash[key]) cash[key] = { planned: 0, achieved: 0 };
        sites[key].planned += 1;
        if (Number(lines[l].totalAssisted || 0) > 0 || Number(lines[l].cashTransferredXaf || 0) > 0 || lines[l].commodityQuantities) sites[key].achieved += 1;
        bnf[key].planned += Number(lines[l].plannedBeneficiaries || 0);
        bnf[key].achieved = Math.max(bnf[key].achieved, Number(lines[l].totalAssisted || 0));
        food[key].achieved += commodityTextTotal(lines[l].commodityQuantities);
        cash[key].achieved += Number(lines[l].cashTransferredXaf || 0);
      }
    }
    return '<div class="dashboard-chart-grid">' +
      comparisonChart(sites, "Sites", "Plan", "Real", "site") +
      comparisonChart(bnf, "BNF", "Plan", "Real", "bnf") +
      singleSeriesChart(food, "Vivres distribues (MT)", "MT") +
      singleSeriesChart(cash, "Cash transfere (" + currency + ")", currency) +
      "</div>";
  }

  function dashboardBudgetSection(params) {
    var grouped = {};
    var totalBudget = 0;
    var totalSpent = 0;
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (params.projectId && line.projectId !== params.projectId) continue;
      if (!budgetRecordHasGrant(line, params.grantCode)) continue;
      var key = (line.costCategory || "Categorie") + " / " + (line.subCategory || "Sous categorie");
      if (!grouped[key]) grouped[key] = { planned: 0, achieved: 0 };
      var lineTotal = budgetLineContributionTotals(line, params.grantCode).total;
      grouped[key].planned += lineTotal;
      totalBudget += lineTotal;
    }
    for (var e = 0; e < store.monthlyExpenses.length; e += 1) {
      var expense = store.monthlyExpenses[e];
      if (!recordMatchesDashboard(expense, params)) continue;
      var budget = findByRecordId(store.budgets, expense.budgetLineId) || {};
      var expKey = (budget.costCategory || expense.costCategory || "Categorie") + " / " + (budget.subCategory || expense.subCategory || "Sous categorie");
      if (!grouped[expKey]) grouped[expKey] = { planned: 0, achieved: 0 };
      var expenseAmount = Number(expense.amountXaf || 0);
      grouped[expKey].achieved += expenseAmount;
      totalSpent += expenseAmount;
    }
    if (totalBudget || totalSpent) grouped["Budget total"] = { planned: totalBudget, achieved: totalSpent };
    return comparisonChart(grouped, "Categorie / Sous categorie", "Budget", "Depense", "budget");
  }

  function dashboardInvoiceSection(params) {
    var budgeted = 0;
    for (var i = 0; i < store.budgets.length; i += 1) if ((!params.projectId || store.budgets[i].projectId === params.projectId) && budgetRecordHasGrant(store.budgets[i], params.grantCode)) budgeted += budgetLineContributionTotals(store.budgets[i], params.grantCode).total;
    var invoiced = 0;
    for (var j = 0; j < store.partnerInvoices.length; j += 1) {
      if (params.projectId && store.partnerInvoices[j].projectId !== params.projectId) continue;
      invoiced += Number(store.partnerInvoices[j].invoiceTotalXaf || 0);
    }
    var paid = 0;
    for (var p = 0; p < store.partnerInvoicePayments.length; p += 1) paid += Number(store.partnerInvoicePayments[p].amountPaidXaf || 0);
    return singleSeriesChart({ "Budgetise": { achieved: budgeted }, "Facture": { achieved: invoiced }, "Paye": { achieved: paid } }, "Facturation", projectCurrency(params.projectId));
  }

  function comparisonChart(grouped, firstLabel, planLabel, realLabel, className) {
    var series = comparisonSeries(grouped);
    if (!series.length) return '<div class="chart-empty-box">Aucune donnee disponible.</div>';
    var max = 1;
    for (var i = 0; i < series.length; i += 1) max = Math.max(max, series[i].planned, series[i].achieved);
    var rows = "";
    var single = className === "single";
    for (var s = 0; s < series.length; s += 1) {
      var plannedPct = Math.max(2, Math.round((series[s].planned / max) * 100));
      var achievedPct = Math.max(2, Math.round((series[s].achieved / max) * 100));
      var realizationRate = series[s].planned ? Math.round((series[s].achieved / series[s].planned) * 1000) / 10 : 0;
      var rateBadge = !single ? '<span class="chart-rate">' + formatDecimal(realizationRate, 1) + '%</span>' : "";
      rows += '<div class="horizontal-chart-row"><div class="horizontal-chart-label">' + escapeHtml(series[s].label) + '</div><div class="horizontal-chart-bars">' +
        (single ? "" : '<div class="horizontal-bar-line"><span class="bar-caption">' + escapeHtml(planLabel) + '</span><div class="bar-track"><span class="bar-fill planned" style="width:' + plannedPct + '%"></span></div><strong>' + formatNumber(series[s].planned) + '</strong></div>') +
        '<div class="horizontal-bar-line"><span class="bar-caption">' + escapeHtml(realLabel) + '</span><div class="bar-track"><span class="bar-fill achieved" style="width:' + achievedPct + '%"></span></div><strong>' + formatNumber(series[s].achieved) + '</strong>' + rateBadge + '</div>' +
        '</div></div>';
    }
    return '<div class="dashboard-chart horizontal ' + escapeHtml(className || "") + '"><div class="chart-title-row"><strong>' + escapeHtml(firstLabel) + '</strong><span>' + (single ? '<i class="legend achieved"></i>' + escapeHtml(realLabel) : '<i class="legend planned"></i>' + escapeHtml(planLabel) + ' <i class="legend achieved"></i>' + escapeHtml(realLabel)) + '</span></div><div class="horizontal-chart-list">' + rows + '</div></div>';
  }

  function singleSeriesChart(grouped, title, unit) {
    var normalized = {};
    for (var key in grouped) if (Object.prototype.hasOwnProperty.call(grouped, key)) normalized[key] = { planned: 0, achieved: Number(grouped[key].achieved || 0) };
    return comparisonChart(normalized, title, "", unit || "Valeur", "single");
  }

  function comparisonSeries(grouped) {
    var series = [];
    for (var key in grouped) if (Object.prototype.hasOwnProperty.call(grouped, key)) series.push({ label: key, planned: Number(grouped[key].planned || 0), achieved: Number(grouped[key].achieved || 0) });
    series.sort(function (a, b) {
      if (a.label === "Budget total") return -1;
      if (b.label === "Budget total") return 1;
      return (b.planned + b.achieved) - (a.planned + a.achieved);
    });
    return series.slice(0, 30);
  }

  function dashboardTables(params) {
    var plans = filteredByParams(store.monthlyPlans, params).length;
    var reports = filteredByParams(store.monthlyReports, params).length;
    var distributions = distributionReportsForDashboard(params);
    var lines = 0;
    for (var i = 0; i < distributions.length; i += 1) {
      var items = distributions[i].distributionLines || [];
      for (var j = 0; j < items.length; j += 1) if (distributionLineMatchesLocation(items[j], params)) lines += 1;
    }
    if (dashboardHasLocationFilter(params)) {
      return '<div class="dashboard-grid compact">' +
        dashboardCard("Lignes distribution", lines, "FDPs applicables aux filtres") +
        dashboardCard("Rapports distribution", distributions.length, "Rapports dans la periode") +
        dashboardCard("Filtre localisation", "Actif", "Sections non applicables masquees") +
        "</div>";
    }
    return '<div class="dashboard-grid compact">' +
      dashboardCard("Plans retenus", plans, "Apres filtres actifs") +
      dashboardCard("Rapports retenus", reports, "Apres filtres actifs") +
      dashboardCard("Lignes distribution", lines, "FDPs applicables aux filtres") +
      dashboardCard("Depenses retenues", filteredByParams(store.monthlyExpenses, params).length, "Lignes financieres") +
      "</div>";
  }

  function dashboardChartHtml(params) {
    var data = dashboardChartData(params);
    var bars = "";
    var labels = "";
    var max = 1;
    for (var i = 0; i < data.length; i += 1) if (data[i].value > max) max = data[i].value;
    var chartWidth = 760;
    var chartHeight = 250;
    var gap = 12;
    var barWidth = data.length ? Math.max(18, Math.floor((chartWidth - gap * (data.length + 1)) / data.length)) : 40;
    for (var b = 0; b < data.length; b += 1) {
      var h = Math.round((data[b].value / max) * 170);
      var x = gap + b * (barWidth + gap);
      var y = 205 - h;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + h + '" rx="4"></rect>';
      bars += '<text x="' + (x + barWidth / 2) + '" y="' + (y - 6) + '" text-anchor="middle" class="chart-value">' + shortNumber(data[b].value) + "</text>";
      labels += '<text x="' + (x + barWidth / 2) + '" y="232" text-anchor="middle" class="chart-label">' + escapeHtml(shortLabel(data[b].label)) + "</text>";
    }
    if (!data.length) {
      bars = '<text x="30" y="120" class="chart-empty">Aucune donnee pour les filtres selectionnes.</text>';
    }
    return '<div class="dashboard-section chart-panel"><h3>Graphique operationnel</h3><p class="muted">' + escapeHtml(chartMetricLabel(params.chartMetric)) + " par " + escapeHtml(chartAxisLabel(params.chartAxis)) + '</p><svg class="ops-chart" viewBox="0 0 780 260" role="img" aria-label="Graphique operationnel"><line x1="20" y1="205" x2="760" y2="205"></line>' + bars + labels + "</svg></div>";
  }

  function dashboardChartData(params) {
    var grouped = {};
    if (params.chartMetric === "expenses") collectExpenseChartData(grouped, params);
    else if (params.chartMetric === "reported") collectReportChartData(grouped, params);
    else if (params.chartMetric === "achieved") collectAchievementChartData(grouped, params);
    else collectPlanChartData(grouped, params);
    return groupedToSeries(grouped);
  }

  function collectPlanChartData(grouped, params) {
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (!recordMatchesDashboard(plan, params)) continue;
      addGroupedValue(grouped, chartKeyForPlan(plan, params), 1);
    }
  }

  function collectReportChartData(grouped, params) {
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      var plan = findById(store.monthlyPlans, "id", report.planId);
      if (!plan || !recordMatchesDashboard(plan, params)) continue;
      addGroupedValue(grouped, chartKeyForPlan(plan, params), 1);
    }
  }

  function collectAchievementChartData(grouped, params) {
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      var plan = findById(store.monthlyPlans, "id", report.planId);
      if (!plan || !recordMatchesDashboard(plan, params)) continue;
      addGroupedValue(grouped, chartKeyForPlan(plan, params), progressNumericValue(report.achieved));
    }
  }

  function collectExpenseChartData(grouped, params) {
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var expense = store.monthlyExpenses[i];
      if (!recordMatchesDashboard(expense, params)) continue;
      addGroupedValue(grouped, chartKeyForExpense(expense, params), Number(expense.amountXaf || 0));
    }
  }

  function recordMatchesDashboard(record, params) {
    if (!userCanAccessRecord(record, "operationsDashboard") && !isAdminUser(currentUser())) {
      var projectIdForAccess = record.projectId || (record.planId ? (findByRecordId(store.monthlyPlans, record.planId) || {}).projectId : "");
      if (projectIdForAccess && !userCanAccessRecord({ projectId: projectIdForAccess }, "projects")) return false;
    }
    var projectId = record.projectId || "";
    if (!projectId && record.planId) {
      var plan = findByRecordId(store.monthlyPlans, record.planId);
      projectId = plan ? plan.projectId : "";
    }
    if (params.projectId && projectId !== params.projectId) return false;
    if (params.status && record.status !== params.status) return false;
    if (params.startMonth && record.month && record.month < params.startMonth) return false;
    if (params.endMonth && record.month && record.month > params.endMonth) return false;
    if (params.grantCode && !dashboardRecordHasGrant(record, params.grantCode)) return false;
    return true;
  }

  function dashboardRecordHasGrant(record, grantCode) {
    if (!grantCode) return true;
    if (record.grantCode) return record.grantCode === grantCode;
    if (record.grantCodes && record.grantCodes.indexOf(grantCode) > -1) return true;
    if (record.budgetLineId) return budgetRecordHasGrant(findByRecordId(store.budgets, record.budgetLineId), grantCode);
    var plan = record.planId ? findByRecordId(store.monthlyPlans, record.planId) : record;
    if (plan && plan.grantContributions) {
      for (var i = 0; i < plan.grantContributions.length; i += 1) if (plan.grantContributions[i].grantCode === grantCode) return true;
    }
    if (plan && plan.activityId) return activityHasGrant(findByRecordId(store.projectActivities, plan.activityId), grantCode);
    return false;
  }

  function distributionReportsForDashboard(params) {
    var out = [];
    for (var i = 0; i < store.distributionReports.length; i += 1) {
      var localParams = {
        projectId: params.projectId,
        startMonth: params.startMonth,
        endMonth: params.endMonth,
        status: params.status
      };
      if (recordMatchesDashboard(store.distributionReports[i], localParams)) out.push(store.distributionReports[i]);
    }
    return out;
  }

  function distributionTotals(records, params) {
    var maxBnf = 0;
    var sites = 0;
    var food = 0;
    var cash = 0;
    for (var i = 0; i < records.length; i += 1) {
      var lines = records[i].distributionLines || [];
      for (var l = 0; l < lines.length; l += 1) {
        if (params && !distributionLineMatchesLocation(lines[l], params)) continue;
        sites += 1;
        maxBnf = Math.max(maxBnf, Number(lines[l].totalAssisted || 0));
        food += commodityTextTotal(lines[l].commodityQuantities);
        cash += Number(lines[l].cashTransferredXaf || 0);
      }
    }
    return { beneficiaries: maxBnf, sites: sites, food: food, cash: cash };
  }

  function distributionLineMatchesLocation(line, params) {
    if (params.fdpIds && params.fdpIds.length && params.fdpIds.indexOf(line.fdpId) === -1) return false;
    var fdp = findByRecordId(store.fdps, line.fdpId) || {};
    var meta = adminMetaForArrondissement(fdp.arrondissement, "Cameroon") || {};
    if (params.arrondissements && params.arrondissements.length && params.arrondissements.indexOf(fdp.arrondissement) === -1) return false;
    if (params.departments && params.departments.length && params.departments.indexOf(meta.department) === -1) return false;
    if (params.regions && params.regions.length && params.regions.indexOf(meta.region) === -1) return false;
    if (params.grantCode && line.grantCode !== params.grantCode && (line.grantCodes || []).indexOf(params.grantCode) < 0) return false;
    return true;
  }

  function commodityTextTotal(text) {
    var total = 0;
    String(text || "").split(/[;|]/).forEach(function (part) {
      var pieces = part.split(":");
      if (pieces.length > 1) total += Number(String(pieces[1]).replace(",", ".") || 0);
    });
    return total;
  }

  function minDateValue(current, next) {
    if (!next) return current || "";
    if (!current) return next;
    return next < current ? next : current;
  }

  function maxDateValue(current, next) {
    if (!next) return current || "";
    if (!current) return next;
    return next > current ? next : current;
  }

  function chartKeyForPlan(plan, params) {
    if (params.chartAxis === "month") return plan.month || "No month";
    if (params.chartAxis === "quarter") return quarterFromMonth(plan.month);
    if (params.chartAxis === "year") return plan.month ? plan.month.substring(0, 4) : "No year";
    if (params.chartAxis === "project") return plan.projectId || "No project";
    if (params.chartAxis === "grant") return grantForActivity(plan.activityId);
    if (params.chartAxis === "csp") return cspForActivity(plan.activityId);
    return plan.month || "Other";
  }

  function chartKeyForExpense(expense, params) {
    if (params.chartAxis === "month") return expense.month || "No month";
    if (params.chartAxis === "quarter") return quarterFromMonth(expense.month);
    if (params.chartAxis === "year") return expense.month ? expense.month.substring(0, 4) : "No year";
    if (params.chartAxis === "project") return expense.projectId || "No project";
    if (params.chartAxis === "grant") return grantForExpense(expense);
    if (params.chartAxis === "csp") return cspForExpense(expense);
    return expense.month || "Other";
  }

  function addGroupedValue(grouped, key, value) {
    if (!grouped[key]) grouped[key] = 0;
    grouped[key] += value;
  }

  function groupedToSeries(grouped) {
    var series = [];
    for (var key in grouped) if (Object.prototype.hasOwnProperty.call(grouped, key)) series.push({ label: key, value: grouped[key] });
    series.sort(function (a, b) { return a.label > b.label ? 1 : -1; });
    return series;
  }

  function quarterFromMonth(month) {
    if (!month || month.length < 7) return "No quarter";
    var m = Number(month.substring(5, 7));
    if (m <= 3) return month.substring(0, 4) + " Q1";
    if (m <= 6) return month.substring(0, 4) + " Q2";
    if (m <= 9) return month.substring(0, 4) + " Q3";
    return month.substring(0, 4) + " Q4";
  }

  function grantForActivity(activityId) {
    var activity = findById(store.projectActivities, "id", activityId);
    var codes = activityGrantCodes(activity);
    return codes.length ? codes.join(", ") : "No grant";
  }

  function cspForActivity(activityId) {
    var activity = findById(store.projectActivities, "id", activityId);
    return activity && activity.cspActivityIds && activity.cspActivityIds.length ? activity.cspActivityIds[0] : "No CSP";
  }

  function grantForExpense(expense) {
    var activity = findById(store.projectActivities, "id", expense.activityId);
    var activityCodes = activityGrantCodes(activity);
    if (activityCodes.length) return activityCodes.join(", ");
    var project = findById(store.projects, "id", expense.projectId);
    var codes = projectGrantCodes(project);
    return codes.length ? codes.join(", ") : "No grant";
  }

  function cspForExpense(expense) {
    var activity = findById(store.projectActivities, "id", expense.activityId);
    if (activity && activity.cspActivityIds && activity.cspActivityIds.length) return activity.cspActivityIds[0];
    var line = findById(store.budgets, "id", expense.budgetLineId);
    return line && line.cspActivityId ? line.cspActivityId : "No CSP";
  }

  function chartMetricLabel(metric) {
    if (metric === "expenses") return "Depenses";
    if (metric === "reported") return "Rapports recus";
    if (metric === "achieved") return "Realisations";
    return "Activites planifiees";
  }

  function chartAxisLabel(axis) {
    if (axis === "quarter") return "trimestre";
    if (axis === "year") return "annee";
    if (axis === "csp") return "activite CSP";
    if (axis === "project") return "projet";
    if (axis === "grant") return "grant";
    return "mois";
  }

  function shortNumber(value) {
    if (value >= 1000000) return Math.round(value / 1000000) + "M";
    if (value >= 1000) return Math.round(value / 1000) + "K";
    return String(value);
  }

  function shortLabel(label) {
    return String(label).length > 12 ? String(label).substring(0, 11) + "." : label;
  }

  function renderPartnerInvoice() {
    setFormPanelMode(false, true);
    removeFilters();
    elements.title.textContent = "Template de facturation partenaire";
    elements.kicker.textContent = "Cooperating Partner Invoice";
    elements.formKicker.textContent = "Parametres";
    elements.formTitle.textContent = "Generer la facture";
    elements.tableTitle.textContent = "Apercu facture et rapport financier";
    elements.tableCount.textContent = "1";
    elements.form.innerHTML =
      '<label>Projet<select name="projectId">' + optionsHtml(optionPairs(store.projects, "id", "title"), state.contextProjectId || "") + '</select></label>' +
      '<label>Partenaire<select name="partnerVendor">' + optionsHtml(optionPairs(store.partners, "vendor", "name"), "") + '</select></label>' +
      '<label>Invoice Reference<input name="invoiceRef" type="text" readonly /></label>' +
      '<label>Invoice Date<input name="invoiceDate" type="date" /></label>' +
      '<label>Type de periode<select name="periodType"><option value="monthly">Mensuel</option><option value="quarterly">Trimestriel</option><option value="semester">Semestriel</option><option value="annual">Annuel</option></select></label>' +
      '<label>Annee de la periode<input name="periodYear" type="number" min="2020" max="2035" /></label>' +
      '<label>Monnaie<input name="currency" type="text" value="' + escapeHtml(projectCurrency(state.contextProjectId || (store.projects[0] && store.projects[0].id) || "")) + '" readonly /></label>' +
      '<fieldset class="project-sites-field invoice-period-field"><legend>Mois impliques</legend><div id="invoice-months"></div></fieldset>' +
      '<fieldset class="project-sites-field invoice-kind-field"><legend>Modalite in kind par grant du projet</legend><div id="invoice-kind-rows"></div></fieldset>' +
      '<div class="form-actions"><button class="primary-action" type="submit">Actualiser</button><button type="button" id="save-invoice-draft">Enregistrer en draft</button><button type="button" id="print-invoice">Imprimer</button></div>';
    elements.form.elements.invoiceDate.value = todayIsoDate();
    elements.form.elements.periodYear.value = String(new Date().getFullYear());
    lockWorkspaceProjectSelector();
    syncInvoicePartnerFromProject();
    updateInvoiceDynamicFields();
    elements.form.elements.projectId.onchange = function () { syncInvoicePartnerFromProject(); updateInvoiceDynamicFields(); renderInvoicePreview(false); };
    elements.form.elements.partnerVendor.onchange = function () { syncInvoiceBankInfoFromPartner(); updateInvoiceReference(); renderInvoicePreview(false); };
    elements.form.elements.periodType.onchange = function () { updateInvoiceDynamicFields(); renderInvoicePreview(false); };
    elements.form.elements.periodYear.onchange = function () { updateInvoiceDynamicFields(); renderInvoicePreview(false); };
    elements.form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      renderInvoicePreview(false);
      return false;
    };
    document.getElementById("print-invoice").onclick = function () { renderInvoicePreview(true); };
    document.getElementById("save-invoice-draft").onclick = savePartnerInvoiceDraft;
    renderInvoicePreview(false);
  }

  function syncInvoicePartnerFromProject() {
    var project = findByRecordId(store.projects, elements.form.elements.projectId ? elements.form.elements.projectId.value : "");
    if (project && elements.form.elements.partnerVendor) elements.form.elements.partnerVendor.value = project.partnerVendor || elements.form.elements.partnerVendor.value;
    if (project && elements.form.elements.currency) elements.form.elements.currency.value = project.currency || "XAF";
    syncInvoiceBankInfoFromPartner();
  }

  function syncInvoiceBankInfoFromPartner() {
    return;
  }

  function updateInvoiceDynamicFields() {
    updateInvoiceReference();
    renderInvoiceMonths();
    renderInvoiceKindRows();
  }

  function updateInvoiceReference() {
    if (!elements.form || !elements.form.elements.invoiceRef) return;
    elements.form.elements.invoiceRef.value = generatedInvoiceReference(readInvoiceParams());
  }

  function renderInvoiceMonths() {
    var holder = document.getElementById("invoice-months");
    if (!holder) return;
    var params = readInvoiceParams();
    var defaults = defaultInvoiceMonths(params.periodType, params.periodYear);
    var html = "";
    for (var i = 0; i < defaults.length; i += 1) {
      html += '<label><input type="checkbox" name="invoiceMonths" value="' + defaults[i] + '" checked /> ' + defaults[i] + '</label>';
    }
    html = '<p class="muted">' + defaults.length + ' mois affiche(s) pour le type de periode selectionne.</p>' + html;
    holder.innerHTML = '<div class="check-list invoice-month-list">' + html + '</div>';
    holder.onchange = function () {
      updateInvoiceReference();
      renderInvoiceKindRows();
      renderInvoicePreview(false);
    };
  }

  function renderInvoiceKindRows() {
    var holder = document.getElementById("invoice-kind-rows");
    if (!holder) return;
    var fieldset = holder.closest ? holder.closest(".invoice-kind-field") : null;
    var params = readInvoiceParams();
    var project = findByRecordId(store.projects, params.projectId) || store.projects[0] || {};
    var grants = invoiceGrantsForProject(project);
    var rows = "";
    for (var i = 0; i < grants.length; i += 1) {
      var setting = grantInKindSetting(project.id, grants[i].code) || {};
      if (!isInvoiceInKindTonnageGrant(setting)) continue;
      var distributed = invoiceDistributedTonnage(project.id, grants[i].code, params);
      rows += '<tr><td>' + escapeHtml(grantLabel(grants[i].code)) + '</td><td>' + escapeHtml(setting.hasInKind || "Non") + '</td><td>' + formatDecimal(distributed, 3) + '</td><td>' + formatDecimal(Number(setting.plannedTonnageMt || 0), 3) + '</td><td>' + escapeHtml(invoiceRateLabel(setting, params)) + '</td></tr>';
    }
    if (!rows) {
      if (fieldset) fieldset.style.display = "none";
      holder.innerHTML = "";
      return;
    }
    if (fieldset) fieldset.style.display = "";
    holder.innerHTML = '<table><thead><tr><th>Grant</th><th>Inclut in kind ?</th><th>Tonnage distribue sur la periode (MT)</th><th>Tonnage planifie projet (MT)</th><th>Rate / MT</th></tr></thead><tbody>' + rows + '</tbody></table><p class="muted">Le rate vient de la page Grants en nature. Le tonnage distribue est calcule depuis le reporting des realisations de la periode selectionnee et c\'est ce tonnage qui apparait sur la facture.</p>';
  }

  function renderInvoicePreview(shouldPrint) {
    var html = invoiceHtml(readInvoiceParams());
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td><div class="invoice-preview-wrap">' + html + "</div>" + savedInvoicesHtml() + "</td></tr>";
    wireSavedInvoiceActions();
    if (shouldPrint) printHtml("Cooperating Partner Invoice", html);
  }

  function savePartnerInvoiceDraft() {
    var params = readInvoiceParams();
    var html = invoiceHtml(params);
    var project = findByRecordId(store.projects, params.projectId) || {};
    var invoice = {
      id: "INV-SAVED/" + new Date().getTime(),
      title: "Facture partenaire - " + (project.title || params.projectId || "Projet") + " - " + invoicePeriodLabel(params),
      invoiceRef: params.invoiceRef || generatedInvoiceReference(params),
      projectId: params.projectId,
      partnerVendor: params.partnerVendor,
      periodType: params.periodType,
      periodMonths: params.periodMonths,
      params: params,
      html: html,
      status: "Draft",
      createdAt: new Date().toISOString()
    };
    store.savedInvoices.push(invoice);
    renderInvoicePreview(false);
  }

  function savedInvoicesHtml() {
    var rows = "";
    for (var i = 0; i < store.savedInvoices.length; i += 1) {
      var invoice = store.savedInvoices[i];
      rows += '<tr><td>' + escapeHtml(invoice.title) + '</td><td>' + escapeHtml(invoice.invoiceRef || "") + '</td><td>' + escapeHtml(invoice.status) + '</td><td><div class="row-actions">' + savedInvoiceActions(invoice.id) + "</div></td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="4">Aucune facture enregistree.</td></tr>';
    return '<div class="saved-reports"><h3>Factures enregistrees</h3><table><thead><tr><th>Facture</th><th>Reference</th><th>Statut</th><th>Actions</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function savedInvoiceActions(id) {
    var invoice = findByRecordId(store.savedInvoices, id);
    var status = invoice ? normalizeWorkflowStatus(invoice.status) : "";
    var html = '<button type="button" data-invoice-action="print" data-invoice-id="' + escapeHtml(id) + '">Imprimer</button>';
    if (status === "Draft" || status === "Returned") html += '<button type="button" data-invoice-action="submit" data-invoice-id="' + escapeHtml(id) + '">Soumettre</button><button type="button" data-invoice-action="delete" data-invoice-id="' + escapeHtml(id) + '">Supprimer</button>';
    else if (status === "Submitted") html += '<button type="button" data-invoice-action="verify" data-invoice-id="' + escapeHtml(id) + '">Verifier</button><button type="button" data-invoice-action="return" data-invoice-id="' + escapeHtml(id) + '">Renvoyer</button>';
    else if (status === "Verified") html += '<button type="button" data-invoice-action="approve" data-invoice-id="' + escapeHtml(id) + '">Valider</button><button type="button" data-invoice-action="return" data-invoice-id="' + escapeHtml(id) + '">Renvoyer</button>';
    else if (status === "Validated") html += '<button type="button" data-invoice-action="return" data-invoice-id="' + escapeHtml(id) + '">Renvoyer</button>';
    return html;
  }

  function wireSavedInvoiceActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-invoice-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handleSavedInvoiceAction(this.getAttribute("data-invoice-action"), this.getAttribute("data-invoice-id"));
      };
    }
  }

  function handleSavedInvoiceAction(action, id) {
    var invoice = findByRecordId(store.savedInvoices, id);
    if (!invoice) return;
    if (action === "print") {
      showFrozenInvoice(invoice, true);
      return;
    }
    if (action === "delete") {
      if (window.confirm && !window.confirm("Supprimer cette facture ?")) return;
      removeRecord(store.savedInvoices, id);
      renderInvoicePreview(false);
      return;
    }
    if (!(action === "return" && normalizeWorkflowStatus(invoice.status) === "Validated") && !validWorkflowMove(invoice.status, action)) {
      window.alert("Workflow attendu: Draft -> Soumettre -> Verifier -> Valider.");
      return;
    }
    if (action === "submit") invoice.status = "Submitted";
    if (action === "verify") invoice.status = "Verified";
    if (action === "approve") invoice.status = "Validated";
    if (action === "return") {
      if (!recordReturnReason(invoice, "facture")) return;
      invoice.status = "Returned";
    }
    renderInvoicePreview(false);
  }

  function showFrozenInvoice(invoice, shouldPrint) {
    var html = '<div class="report-preview"><p><strong>Status:</strong> ' + escapeHtml(invoice.status) + ' | <strong>Saved:</strong> ' + escapeHtml(invoice.createdAt) + '</p><div class="invoice-preview-wrap">' + invoice.html + "</div>" + returnHistoryPreview(invoice) + "</div>";
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td>' + (shouldPrint ? '<button class="primary-action" type="button" id="print-frozen-invoice">Lancer l\'impression</button>' : "") + html + savedInvoicesHtml() + "</td></tr>";
    var printButton = document.getElementById("print-frozen-invoice");
    if (printButton) printButton.onclick = function () { printHtml(invoice.title, invoice.html); };
    wireSavedInvoiceActions();
  }

  function readInvoiceParams() {
    return {
      projectId: elements.form.elements.projectId ? elements.form.elements.projectId.value : "",
      partnerVendor: elements.form.elements.partnerVendor ? elements.form.elements.partnerVendor.value : "",
      invoiceRef: elements.form.elements.invoiceRef ? elements.form.elements.invoiceRef.value : "",
      invoiceDate: elements.form.elements.invoiceDate ? elements.form.elements.invoiceDate.value : "",
      periodType: elements.form.elements.periodType ? elements.form.elements.periodType.value : "monthly",
      periodYear: elements.form.elements.periodYear ? elements.form.elements.periodYear.value : String(new Date().getFullYear()),
      periodMonths: readCheckedValues("invoiceMonths"),
      columnMeaning: "Grants",
      currency: elements.form.elements.currency ? elements.form.elements.currency.value : "XAF",
      bankInfo: selectedInvoicePartnerBankInfo()
    };
  }

  function selectedInvoicePartnerBankInfo() {
    var vendor = elements.form && elements.form.elements.partnerVendor ? elements.form.elements.partnerVendor.value : "";
    var partner = findById(store.partners, "vendor", vendor);
    return partner ? partner.bankingInformation || "" : "";
  }

  function invoiceHtml(params) {
    var project = findById(store.projects, "id", params.projectId) || store.projects[0];
    var partner = findById(store.partners, "vendor", params.partnerVendor || (project ? project.partnerVendor : "")) || store.partners[0];
    var projectGrants = invoiceGrantsForProject(project || {});
    var matrix = invoiceMatrix(project ? project.id : "", projectGrants, params);
    var activityRows = invoiceActivityRows(projectGrants);
    return '<div class="invoice-preview invoice-template"><h2>COOPERATING PARTNER INVOICE</h2>' +
      '<div class="invoice-top-grid"><div><strong>Name, Address and Logo</strong><p>' + invoiceCell(partner ? partner.name : "") + '<br>' + invoiceCell(partner ? partner.address : "") + '</p><p><strong>Agreements References (including amendments)</strong><br>' + invoiceCell(project ? project.flaNumber : "") + '</p><p><strong>Purchase Order Number (PODA)</strong><br>' + invoiceCell(project ? project.poNumber : "") + '</p><p><strong>Agreement Period</strong><br>' + invoiceCell(project ? invoiceAgreementPeriod(project) : "") + '</p><p><strong>Total Amount of Agreement</strong><br>' + formatNumber(project ? project.budgetXaf || 0 : 0) + ' ' + invoiceCell(params.currency) + '</p></div>' +
      '<div><table><tbody><tr><th>Invoice Reference</th><td>' + invoiceCell(params.invoiceRef || generatedInvoiceReference(params)) + '</td></tr><tr><th>Invoice Date</th><td>' + invoiceCell(params.invoiceDate) + '</td></tr><tr><th>Period covered</th><td>' + invoiceCell(invoicePeriodLabel(params)) + '</td></tr><tr><th>Banking Information</th><td>' + invoiceCell(params.bankInfo) + '</td></tr><tr><th>Account Name</th><td>' + invoiceCell(partner ? partner.name : "") + '</td></tr><tr><th>Currency</th><td>' + invoiceCell(params.currency) + '</td></tr><tr><th>Vendor Number</th><td>' + invoiceCell(partner ? partner.vendor : "") + '</td></tr></tbody></table></div></div>' +
      '<table><tbody><tr><th class="invoice-side-head" rowspan="' + Math.max(activityRows.length, 1) + '">Activity number and Description</th>' + (activityRows[0] || '<td>Aucune activite rattachee.</td>') + '</tr>' + activityRows.slice(1).map(function (row) { return "<tr>" + row + "</tr>"; }).join("") + '</tbody></table>' +
      invoiceMatrixHtml(projectGrants, matrix, params, project ? project.id : "") +
      '<div class="invoice-signatures"><div><strong>Prepared by:</strong><br>Name:<br>Signature:<br>Date:<br>Title:</div><div><strong>Approved by:</strong><br>Name:<br>Signature:<br>Date:<br>Title:</div><div><strong>CP Signature</strong><br><br><strong>Country Director</strong></div></div>' +
      '</div>' + corporateFinancialReportHtml(params, project, partner, projectGrants);
  }

  function invoiceCell(value) {
    var text = String(value == null ? "" : value).trim();
    return text ? escapeHtml(text) : "-";
  }

  function invoiceAgreementPeriod(project) {
    var start = project && project.startDate ? project.startDate : "";
    var end = project && project.endDate ? project.endDate : "";
    if (!start && !end) return "";
    return start + " - " + end;
  }

  function readCheckedValues(name) {
    var out = [];
    if (!elements.form) return out;
    var controls = elements.form.querySelectorAll('input[name="' + name + '"]:checked');
    for (var i = 0; i < controls.length; i += 1) out.push(controls[i].value);
    return out;
  }

  function generatedInvoiceReference(params) {
    params = params || {};
    var project = findByRecordId(store.projects, params.projectId) || store.projects[0] || {};
    var partner = findByRecordId(store.partners, params.partnerVendor || project.partnerVendor) || {};
    var months = params.periodMonths && params.periodMonths.length ? params.periodMonths : defaultInvoiceMonths(params.periodType || "monthly", params.periodYear || String(new Date().getFullYear()));
    var periodCode = months.length ? months[0].replace("-", "") + (months.length > 1 ? "-" + months[months.length - 1].replace("-", "") : "") : String(params.periodYear || new Date().getFullYear());
    return "INV/" + slugPart(project.id || "PROJECT") + "/" + slugPart(partner.vendor || project.partnerVendor || "CP") + "/" + periodCode;
  }

  function defaultInvoiceMonths(type, year) {
    var now = new Date();
    var selectedYear = String(year || now.getFullYear());
    var currentMonth = now.getMonth() + 1;
    var months = [];
    if (type === "annual") {
      for (var a = 1; a <= 12; a += 1) months.push(selectedYear + "-" + String(a).padStart(2, "0"));
      return months;
    }
    if (type === "semester") {
      var startSemester = currentMonth <= 6 ? 1 : 7;
      for (var s = startSemester; s < startSemester + 6; s += 1) months.push(selectedYear + "-" + String(s).padStart(2, "0"));
      return months;
    }
    if (type === "quarterly") {
      var startQuarter = Math.floor((currentMonth - 1) / 3) * 3 + 1;
      for (var q = startQuarter; q < startQuarter + 3; q += 1) months.push(selectedYear + "-" + String(q).padStart(2, "0"));
      return months;
    }
    return [selectedYear + "-" + String(currentMonth).padStart(2, "0")];
  }

  function invoicePeriodLabel(params) {
    var months = params.periodMonths && params.periodMonths.length ? params.periodMonths.slice().sort() : defaultInvoiceMonths(params.periodType, params.periodYear);
    if (!months.length) return "";
    if (months.length === 1) return months[0];
    return months[0] + " to " + months[months.length - 1];
  }

  function invoiceActivityRows(grants) {
    var rows = [];
    grants = grants || [];
    for (var i = 0; i < grants.length; i += 1) {
      rows.push('<td><strong>Activity n*' + (i + 1) + ' -</strong> ' + escapeHtml(grantLabel(grants[i].code)) + '</td>');
    }
    return rows;
  }

  function invoiceMatrix(projectId, grants, params) {
    var categories = invoiceCategories();
    var matrix = {};
    for (var c = 0; c < categories.length; c += 1) matrix[categories[c]] = {};
    var months = params.periodMonths && params.periodMonths.length ? params.periodMonths : defaultInvoiceMonths(params.periodType, params.periodYear);
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var expense = store.monthlyExpenses[i];
      if (projectId && expense.projectId !== projectId) continue;
      if (months.length && months.indexOf(expense.month) < 0) continue;
      var category = invoiceCategoryForExpense(expense);
      if (!matrix[category]) matrix[category] = {};
      var code = expense.grantCode || (grants[0] ? grants[0].code : "");
      if (!matrix[category][code]) matrix[category][code] = { unit: "", rate: "", amount: 0 };
      matrix[category][code].amount += Number(expense.amountXaf || 0);
    }
    var foodCategory = "I.a. Food Transfer modality (MT based)";
    if (!matrix[foodCategory]) matrix[foodCategory] = {};
    for (var g = 0; g < grants.length; g += 1) {
      var grantCode = grants[g].code;
      var setting = grantInKindSetting(projectId, grantCode);
      if (!isInvoiceInKindTonnageGrant(setting)) continue;
      if (!matrix[foodCategory][grantCode]) matrix[foodCategory][grantCode] = { unit: "", rate: "", amount: 0 };
      var distributedTonnage = invoiceDistributedTonnage(projectId, grantCode, params);
      matrix[foodCategory][grantCode].unit = formatDecimal(distributedTonnage, 3) + " MT";
      var rate = invoiceRateForSetting(setting, params);
      matrix[foodCategory][grantCode].rate = formatNumber(rate);
      matrix[foodCategory][grantCode].amount = distributedTonnage * rate;
    }
    return matrix;
  }

  function invoiceCategories() {
    return [
      "I.a. Food Transfer modality (MT based)",
      "I.b. Food Transfer modality (Fixed costs)",
      "I. TOTAL Food Transfer modality (Delivery and Distribution Costs)",
      "II. CBT Transfer modality",
      "III. Capacity Strengthening (CS) Transfer modality",
      "IV. Technical/Specialist Services",
      "V. CP Direct Support Costs",
      "VI. Management Fees"
    ];
  }

  function invoiceCategoryForExpense(expense) {
    return invoiceCategoryForCostCategory(expense.costCategory);
  }

  function invoiceCategoryForBudgetLine(line) {
    return invoiceCategoryForCostCategory(line.costCategory);
  }

  function invoiceCategoryForCostCategory(value) {
    var category = String(value || "");
    if (/food transfer.*mt/i.test(category)) return "I.a. Food Transfer modality (MT based)";
    if (/food transfer/i.test(category)) return "I.b. Food Transfer modality (Fixed costs)";
    if (/cash|cbt/i.test(category)) return "II. CBT Transfer modality";
    if (/capacity/i.test(category)) return "III. Capacity Strengthening (CS) Transfer modality";
    if (/technical/i.test(category)) return "IV. Technical/Specialist Services";
    if (/management/i.test(category)) return "VI. Management Fees";
    return "V. CP Direct Support Costs";
  }

  function corporateFinancialReportHtml(params, project, partner, grants) {
    project = project || {};
    partner = partner || {};
    grants = grants || [];
    var periodMonths = invoiceSelectedMonths(params);
    var monthsText = periodMonths.length ? periodMonths[0] + " to " + periodMonths[periodMonths.length - 1] : "-";
    var rows = "";
    var grand = corporateEmptyTotals(grants.length);
    var categories = invoiceCategories();
    for (var c = 0; c < categories.length; c += 1) {
      var category = categories[c];
      var lines = corporateBudgetLinesForCategory(project.id, category);
      if (!lines.length) continue;
      rows += '<tr class="financial-section"><th>' + escapeHtml(category) + '</th>' + corporateBlankCells(grants.length) + '<th colspan="5">-</th></tr>';
      var subcats = uniqueBudgetSubCategories(lines);
      var categoryTotals = corporateEmptyTotals(grants.length);
      for (var s = 0; s < subcats.length; s += 1) {
        var rowTotals = corporateFinancialRowTotals(project.id, category, subcats[s], grants, params);
        corporateAddTotals(categoryTotals, rowTotals);
        rows += corporateFinancialRow(subcats[s], rowTotals);
      }
      corporateAddTotals(grand, categoryTotals);
      rows += corporateFinancialSubtotalRow("Total " + category, categoryTotals);
    }
    if (!rows) rows = '<tr><td colspan="' + (1 + (grants.length + 1) * 5) + '">Aucune ligne budgetaire validee pour ce projet.</td></tr>';
    rows += corporateFinancialSubtotalRow("Total Cooperating Partner's Costs", grand, true);
    return '<div class="financial-report-preview corporate-financial-report"><h2>FINANCIAL REPORT WITH REFERENCE TO APPROVED PROJECT BUDGET LINES</h2>' +
      '<table class="financial-report-info"><tbody><tr><th>Partner</th><td>' + invoiceCell(partner.name) + '</td><th>Agreement and Amendments N*</th><td>' + invoiceCell(project.agreementNumber || project.flaNumber) + '</td></tr>' +
      '<tr><th>Agreement Period</th><td>' + invoiceCell(invoiceAgreementPeriod(project)) + '</td><th>Period covered</th><td>' + escapeHtml(monthsText) + '</td></tr>' +
      '<tr><th>Project</th><td colspan="3">' + invoiceCell((project.id || "") + (project.title ? " - " + project.title : "")) + '</td></tr></tbody></table>' +
      corporateFinancialTable(grants, rows) +
      '<div class="financial-certification"><strong>Certification</strong><p>I certify that the above expenses have been made in accordance with the terms of the signed agreement and that supporting documentation can be collected at our premises for any verification requirement for the period agreed upon in the contract.</p></div>' +
      '<div class="invoice-signatures financial-signatures"><div><strong>Prepared by:</strong><br>Name:<br>Signature:<br>Date:<br>Title:</div><div><strong>Approved I</strong><br>Name:<br>Signature:<br>Date:<br>Title:</div></div></div>';
  }

  function corporateFinancialTable(grants, rows) {
    var header1 = '<tr><th rowspan="2">Costs categories</th>';
    var header2 = '<tr>';
    for (var i = 0; i < grants.length; i += 1) {
      header1 += '<th colspan="5">Activity ' + (i + 1) + '<br><span>' + escapeHtml(grantLabel(grants[i].code)) + '</span></th>';
      header2 += '<th>Approved Budget<br>(A)</th><th>Expenses of the period<br>(B)</th><th>Expenses prior periods<br>(C)</th><th>Total Expenses<br>(D=B+C)</th><th>Balance<br>(A-D)</th>';
    }
    header1 += '<th colspan="5">TOTAL PROJECT</th></tr>';
    header2 += '<th>Approved Budget<br>(A)</th><th>Expenses of the period<br>(B)</th><th>Expenses prior periods<br>(C)</th><th>Total Expenses<br>(D=B+C)</th><th>Balance<br>(A-D)</th></tr>';
    return '<table class="financial-report-table"><thead><tr><th class="financial-activities-label" colspan="' + (1 + (grants.length + 1) * 5) + '">ACTIVITIES</th></tr>' + header1 + header2 + '</thead><tbody>' + rows + '</tbody></table>';
  }

  function corporateBudgetLinesForCategory(projectId, category) {
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (projectId && line.projectId !== projectId) continue;
      if (normalizeWorkflowStatus(line.status) !== "Validated") continue;
      if (invoiceCategoryForBudgetLine(line) === category) out.push(line);
    }
    return out;
  }

  function uniqueBudgetSubCategories(lines) {
    var seen = {};
    var out = [];
    for (var i = 0; i < lines.length; i += 1) {
      var label = lines[i].subCategory || lines[i].label || "Non categorise";
      if (!seen[label]) {
        seen[label] = true;
        out.push(label);
      }
    }
    return out;
  }

  function corporateFinancialRowTotals(projectId, category, subCategory, grants, params) {
    var totals = corporateEmptyTotals(grants.length);
    for (var i = 0; i < grants.length; i += 1) {
      var grantCode = grants[i].code;
      var approved = corporateApprovedBudget(projectId, category, subCategory, grantCode);
      var period = corporateExpenseTotal(projectId, category, subCategory, grantCode, params, "period");
      var prior = corporateExpenseTotal(projectId, category, subCategory, grantCode, params, "prior");
      totals.activities[i] = { approved: approved, period: period, prior: prior, total: period + prior, balance: approved - period - prior };
    }
    corporateRefreshTotalFla(totals);
    return totals;
  }

  function corporateApprovedBudget(projectId, category, subCategory, grantCode) {
    var total = 0;
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (projectId && line.projectId !== projectId) continue;
      if (normalizeWorkflowStatus(line.status) !== "Validated") continue;
      if (invoiceCategoryForBudgetLine(line) !== category) continue;
      if ((line.subCategory || line.label || "Non categorise") !== subCategory) continue;
      total += budgetLineContributionTotals(line, grantCode).total;
    }
    return total;
  }

  function corporateExpenseTotal(projectId, category, subCategory, grantCode, params, scope) {
    var months = invoiceSelectedMonths(params);
    var firstMonth = months.length ? months[0] : "";
    var lastMonth = months.length ? months[months.length - 1] : "";
    var total = 0;
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var expense = store.monthlyExpenses[i];
      if (projectId && expense.projectId !== projectId) continue;
      if (grantCode && expense.grantCode !== grantCode) continue;
      if (invoiceCategoryForExpense(expense) !== category) continue;
      if ((expense.subCategory || budgetLineSubCategory(expense.budgetLineId)) !== subCategory) continue;
      if (scope === "period" && (months.indexOf(expense.month) < 0)) continue;
      if (scope === "prior" && (!firstMonth || expense.month >= firstMonth)) continue;
      if (scope === "future" && (!lastMonth || expense.month <= lastMonth)) continue;
      total += Number(expense.amountXaf || 0);
    }
    return total;
  }

  function budgetLineSubCategory(lineId) {
    var line = findByRecordId(store.budgets, lineId) || {};
    return line.subCategory || line.label || "Non categorise";
  }

  function invoiceSelectedMonths(params) {
    var months = params && params.periodMonths && params.periodMonths.length ? params.periodMonths.slice() : defaultInvoiceMonths(params ? params.periodType : "monthly", params ? params.periodYear : "");
    months.sort();
    return months;
  }

  function corporateEmptyTotals(count) {
    var totals = { activities: [], total: { approved: 0, period: 0, prior: 0, total: 0, balance: 0 } };
    for (var i = 0; i < count; i += 1) totals.activities.push({ approved: 0, period: 0, prior: 0, total: 0, balance: 0 });
    return totals;
  }

  function corporateAddTotals(target, source) {
    for (var i = 0; i < target.activities.length; i += 1) {
      target.activities[i].approved += source.activities[i].approved;
      target.activities[i].period += source.activities[i].period;
      target.activities[i].prior += source.activities[i].prior;
      target.activities[i].total += source.activities[i].total;
      target.activities[i].balance += source.activities[i].balance;
    }
    corporateRefreshTotalFla(target);
  }

  function corporateRefreshTotalFla(totals) {
    totals.total = { approved: 0, period: 0, prior: 0, total: 0, balance: 0 };
    for (var i = 0; i < totals.activities.length; i += 1) {
      totals.total.approved += totals.activities[i].approved;
      totals.total.period += totals.activities[i].period;
      totals.total.prior += totals.activities[i].prior;
      totals.total.total += totals.activities[i].total;
      totals.total.balance += totals.activities[i].balance;
    }
  }

  function corporateFinancialRow(label, totals) {
    return '<tr><td>' + escapeHtml(label) + '</td>' + corporateFinancialCells(totals) + '</tr>';
  }

  function corporateFinancialSubtotalRow(label, totals, grand) {
    return '<tr class="' + (grand ? "financial-grand-total" : "financial-subtotal") + '"><th>' + escapeHtml(label) + '</th>' + corporateFinancialCells(totals, true) + '</tr>';
  }

  function corporateFinancialCells(totals) {
    var html = "";
    for (var i = 0; i < totals.activities.length; i += 1) html += corporateFiveCells(totals.activities[i]);
    return html + corporateFiveCells(totals.total);
  }

  function corporateFiveCells(item) {
    return '<td>' + corporateMoney(item.approved) + '</td><td>' + corporateMoney(item.period) + '</td><td>' + corporateMoney(item.prior) + '</td><td>' + corporateMoney(item.total) + '</td><td>' + corporateMoney(item.balance) + '</td>';
  }

  function corporateMoney(value) {
    var amount = Number(value || 0);
    return amount ? formatNumber(amount) : "-";
  }

  function corporateBlankCells(count) {
    var html = "";
    for (var i = 0; i < count; i += 1) html += '<th colspan="5">-</th>';
    return html;
  }

  function invoiceMatrixHtml(grants, matrix, params, projectId) {
    var categories = invoiceCategories();
    var grantHeaders = "";
    var subHeaders = "";
    var showInKindColumns = invoiceHasInKindTonnageGrant(projectId, grants);
    for (var g = 0; g < grants.length; g += 1) {
      grantHeaders += '<th colspan="' + (showInKindColumns ? 3 : 1) + '">' + escapeHtml(grantLabel(grants[g].code)) + '</th>';
      subHeaders += showInKindColumns ? '<th>Tonnage distribue (MT)</th><th>Rate/MT</th><th>Amount</th>' : '<th>Amount</th>';
    }
    var rows = "";
    var grandTotal = 0;
    for (var c = 0; c < categories.length; c += 1) {
      var category = categories[c];
      var rowTotal = 0;
      var cells = "";
      for (var i = 0; i < grants.length; i += 1) {
        var code = grants[i].code;
        var cell = matrix[category] && matrix[category][code] ? matrix[category][code] : { unit: "", rate: "", amount: 0 };
        rowTotal += Number(cell.amount || 0);
        cells += showInKindColumns ? '<td>' + invoiceCell(cell.unit) + '</td><td>' + invoiceCell(cell.rate) + '</td><td>' + formatNumber(Number(cell.amount || 0)) + '</td>' : '<td>' + formatNumber(Number(cell.amount || 0)) + '</td>';
      }
      grandTotal += rowTotal;
      rows += '<tr><th>' + escapeHtml(category) + '</th>' + cells + '<th>' + formatNumber(rowTotal) + '</th></tr>';
    }
    if (!grants.length) {
      grantHeaders = '<th colspan="1">' + escapeHtml(params.columnMeaning || "Grants") + '</th>';
      subHeaders = '<th>Amount</th>';
      rows = '<tr><td colspan="5">Aucun grant rattache au projet.</td></tr>';
    }
    var emptyColspan = Math.max(grants.length * (showInKindColumns ? 3 : 1), 1);
    return '<table class="invoice-matrix"><thead><tr><th>Sub-Total by Budget Lines</th>' + grantHeaders + '<th>TOTAL Amount</th></tr><tr><th>' + escapeHtml(params.columnMeaning || "Grants") + '</th>' + subHeaders + '<th>Amount</th></tr></thead><tbody>' + rows +
      '<tr><th>Total Invoice</th><td colspan="' + emptyColspan + '">-</td><th>' + formatNumber(grandTotal) + '</th></tr>' +
      '<tr class="invoice-total"><th>Net to be paid by the organisation</th><td colspan="' + emptyColspan + '">-</td><th>' + formatNumber(grandTotal) + '</th></tr></tbody></table>';
  }

  function invoiceHasInKindTonnageGrant(projectId, grants) {
    for (var i = 0; i < grants.length; i += 1) {
      if (isInvoiceInKindTonnageGrant(grantInKindSetting(projectId, grants[i].code))) return true;
    }
    return false;
  }

  function progressResultsRows(params) {
    var rows = "";
    for (var i = 0; i < cspActivities.length; i += 1) {
      var csp = cspActivities[i];
      if (params.cspActivityId && csp.id !== params.cspActivityId) continue;
      var subActivities = projectActivitiesForCsp(params, csp.id);
      if (subActivities.length) {
        rows += '<tr class="ai-row csp-ai-row"><td colspan="6"><strong>' + escapeHtml(csp.id + " - " + csp.name) + '</strong>' + aiCspActivityNarrative(csp, subActivities, params) + "</td></tr>";
      }
      for (var s = 0; s < subActivities.length; s += 1) {
        var sub = subActivities[s];
        var summary = progressActivityMetricSummary(sub.id, params);
        var planned = summary.absolute.target;
        var achieved = summary.absolute.achieved;
        var percent = planned ? Math.round((achieved / planned) * 100) : summary.percent.achievedAverage;
        rows += "<tr><td>" + escapeHtml(csp.id + " - " + csp.name) + "</td><td>" + escapeHtml(sub.label) + "</td><td>" + escapeHtml(formatProgressMetric(planned)) + "</td><td>" + escapeHtml(formatProgressMetric(achieved)) + "</td><td>" + formatDecimal(percent, 1) + "%</td><td>" + escapeHtml(formatProgressMetric(achieved - planned)) + "</td></tr>";
        rows += '<tr class="ai-row sub-ai-row"><td colspan="6">' + aiSubActivityNarrative(sub, summary, params) + "</td></tr>";
      }
    }
    return rows || '<tr><td colspan="6">Aucune activite trouvee pour les filtres.</td></tr>';
  }

  function progressExpenseRows(params) {
    var grouped = {};
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (params.projectId && line.projectId !== params.projectId) continue;
      if (!budgetLineMatchesProgressFilters(line, params)) continue;
      var key = line.costCategory || "Non categorise";
      if (!grouped[key]) grouped[key] = { budget: 0, spent: 0 };
      grouped[key].budget += budgetLineContributionTotals(line).total;
      grouped[key].spent += expenseTotalForBudgetLine(line.id, progressPeriodParams(params));
    }
    var rows = "";
    for (var category in grouped) {
      if (Object.prototype.hasOwnProperty.call(grouped, category)) {
        var item = grouped[category];
        var pct = item.budget ? Math.round((item.spent / item.budget) * 100) : 0;
        var currency = projectCurrency(params.projectId);
        rows += "<tr><td>" + escapeHtml(category) + "</td><td>" + moneyText(item.budget, currency) + "</td><td>" + moneyText(item.spent, currency) + "</td><td>" + pct + "%</td><td>" + moneyText(item.budget - item.spent, currency) + "</td></tr>";
        rows += '<tr class="ai-row budget-ai-row"><td colspan="5">' + aiBudgetCategoryNarrative(category, item.budget, item.spent, pct, currency) + "</td></tr>";
      }
    }
    return rows || '<tr><td colspan="5">Aucune depense/budget trouve.</td></tr>';
  }

  function aiCspActivityNarrative(csp, subActivities, params) {
    var aggregate = { absolute: { target: 0, achieved: 0, count: 0 }, percent: { target: 0, achieved: 0, count: 0, targetAverage: 0, achievedAverage: 0 } };
    for (var i = 0; i < subActivities.length; i += 1) {
      var summary = progressActivityMetricSummary(subActivities[i].id, params);
      aggregate.absolute.target += summary.absolute.target;
      aggregate.absolute.achieved += summary.absolute.achieved;
      aggregate.absolute.count += summary.absolute.count;
      aggregate.percent.target += summary.percent.target;
      aggregate.percent.achieved += summary.percent.achieved;
      aggregate.percent.count += summary.percent.count;
    }
    aggregate.percent.targetAverage = aggregate.percent.count ? Math.round((aggregate.percent.target / aggregate.percent.count) * 10) / 10 : 0;
    aggregate.percent.achievedAverage = aggregate.percent.count ? Math.round((aggregate.percent.achieved / aggregate.percent.count) * 10) / 10 : 0;
    var percent = aggregate.absolute.target ? Math.round((aggregate.absolute.achieved / aggregate.absolute.target) * 100) : aggregate.percent.achievedAverage;
    var trend = percent >= 90 ? "La mise en oeuvre est globalement en bonne voie" : percent >= 60 ? "La mise en oeuvre progresse mais necessite un suivi rapproche" : "La mise en oeuvre accuse un retard important";
    return "<p>" + trend + " pour cette activite CSP. Sur la periode, " + subActivities.length + " sous-activite(s) projet contribuent a cette activite. Les indicateurs en valeur absolue totalisent " + formatProgressMetric(aggregate.absolute.achieved) + " realisation(s) pour " + formatProgressMetric(aggregate.absolute.target) + " cible(s), tandis que les indicateurs en pourcentage affichent une realisation moyenne de " + formatDecimal(aggregate.percent.achievedAverage, 1) + "% contre " + formatDecimal(aggregate.percent.targetAverage, 1) + "% attendu. Les ecarts doivent etre analyses avec les partenaires afin d'ajuster la planification ou les moyens de mise en oeuvre.</p>";
  }

  function aiSubActivityNarrative(sub, summary, params) {
    var planned = summary.absolute.target;
    var achieved = summary.absolute.achieved;
    var percent = planned ? Math.round((achieved / planned) * 1000) / 10 : summary.percent.achievedAverage;
    var gap = achieved - planned;
    var status = percent >= 100 ? "a atteint ou depasse sa cible" : percent >= 70 ? "presente une progression acceptable" : "reste en dessous du niveau attendu";
    return "<p><strong>AI narrative - sous-activite:</strong> La sous-activite " + escapeHtml(sub.label) + " " + status + ". Les valeurs absolues presentent une cible de " + formatProgressMetric(planned) + " pour une realisation de " + formatProgressMetric(achieved) + ", soit " + formatDecimal(percent, 1) + "%, avec un ecart de " + formatProgressMetric(gap) + ". Les indicateurs en pourcentage sont suivis separement avec une cible moyenne de " + formatDecimal(summary.percent.targetAverage, 1) + "% et une realisation moyenne de " + formatDecimal(summary.percent.achievedAverage, 1) + "%. Cette analyse devra etre completee par les commentaires terrain, les contraintes signalees et les mesures correctives documentees dans les rapports mensuels.</p>";
  }

  function aiBudgetCategoryNarrative(category, budget, spent, pct, currency) {
    var remaining = budget - spent;
    var message = pct > 100 ? "La categorie depasse le budget disponible et necessite une revue immediate ou un amendement." : pct >= 80 ? "La consommation est elevee et doit etre surveillee avant tout nouvel engagement." : pct >= 40 ? "La consommation est moderee et semble compatible avec une execution progressive." : "La consommation est faible; il faut verifier si les activites correspondantes ont pris du retard ou si les depenses ne sont pas encore rapportees.";
    return "<p><strong>AI budget comment:</strong> Pour la categorie " + escapeHtml(category) + ", les depenses atteignent " + moneyText(spent, currency) + " sur un budget de " + moneyText(budget, currency) + ", soit " + pct + "% de consommation. Le montant restant est de " + moneyText(remaining, currency) + ". " + message + "</p>";
  }

  function progressTextList(params, field, emptyText) {
    var html = "";
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      if (!matchProgressReport(report, params)) continue;
      if (report[field]) html += "<li>" + escapeHtml(report[field]) + "</li>";
    }
    return html ? "<ul>" + html + "</ul>" : "<p class=\"muted\">" + escapeHtml(emptyText) + "</p>";
  }

  function bestPracticesHtml(params) {
    var rate = reportCoverage(params);
    if (rate >= 80) return "<p>Les rapports mensuels montrent une bonne discipline de suivi, avec une couverture de reporting elevee sur la periode.</p>";
    return "<p class=\"muted\">Aucune meilleure pratique consolidee automatiquement. Ajouter plus de rapports valides pour enrichir cette section.</p>";
  }

  function lessonsHtml(params) {
    var gaps = progressGapSummary(params);
    if (gaps < 0) return "<p>Les ecarts negatifs indiquent un besoin de renforcer l'anticipation operationnelle, la disponibilite des intrants ou le suivi partenaire.</p>";
    if (gaps > 0) return "<p>Les realisations superieures aux cibles doivent etre documentees pour comprendre les facteurs de performance et ajuster les prochaines planifications.</p>";
    return "<p class=\"muted\">Les lessons apprises seront consolidees a partir des ecarts et commentaires mensuels.</p>";
  }

  function aiProgressNarrative(params) {
    var project = selectedProject(params);
    var coverage = reportCoverage(params);
    var facts = progressProjectFacts(params);
    var spent = progressSpentTotal(params);
    var text = "<p>Sur la periode " + escapeHtml(progressPeriodLabel(params)) + ", le projet " + escapeHtml(project ? project.title : "selectionne") + " presente une couverture de reporting estimee a " + coverage + "%.</p>";
    text += "<p>Les indicateurs en valeur absolue presentent un ecart de " + escapeHtml(formatProgressMetric(facts.absoluteGap)) + " entre planification et realisation. Les indicateurs exprimes en pourcentage sont analyses separement, avec une cible moyenne de " + formatDecimal(facts.percentTargetAverage, 1) + "% et une realisation moyenne de " + formatDecimal(facts.percentAchievedAverage, 1) + "%. ";
    text += progressPerformanceMessage(facts);
    text += "</p><p>Les depenses enregistrees sur la periode s'elevent a " + moneyText(spent, projectCurrency(params.projectId)) + ". Le suivi financier devrait etre rapproche des lignes budgetaires afin de confirmer les taux de consommation et les montants restants.</p>";
    text += "<p>Les sections contraintes, meilleures pratiques et lessons apprises sont generees a partir des rapports mensuels et devront etre revues par l'equipe operationnelle avant soumission.</p>";
    return text;
  }

  function aiProgressIntroHtml(params) {
    return '<h3>Introduction</h3>' + aiPartnerSummaryHtml(params) + '<h3>Contexte operationnel</h3>' + aiContextParagraph(params) + '<h3>Resume executif</h3>' + aiExecutiveSummary(params);
  }

  function aiPartnerSummaryHtml(params) {
    var partners = partnersForProgress(params);
    var rows = "";
    for (var i = 0; i < partners.length; i += 1) {
      rows += "<tr><td>" + escapeHtml(partners[i].name) + "</td><td>" + escapeHtml(partners[i].nature) + "</td><td>" + escapeHtml(partners[i].resourcePerson) + "</td><td>" + escapeHtml(partners[i].phone) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="4">Aucun partenaire rattache aux filtres selectionnes.</td></tr>';
    return '<table class="intro-table"><thead><tr><th>Partenaire</th><th>Nature</th><th>Personne ressource</th><th>Contact</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function aiContextParagraph(params) {
    var project = selectedProject(params);
    var grants = project ? grantsForProject(project) : [];
    var activities = countProjectActivities(params);
    var period = progressPeriodLabel(params);
    var donor = grants.length ? grants.map(function (grant) { return grant.donor; }).join(", ") : params.donor;
    return "<p>Ce rapport couvre la periode " + escapeHtml(period) + " et presente l'etat d'avancement des operations " + escapeHtml(project ? "du projet " + project.title : "du portefeuille selectionne") + ". Les donnees consolidees proviennent des plans mensuels, rapports de realisation, depenses enregistrees et activites rattachees au CSP. Le financement est " + escapeHtml(donor ? "associe au donateur " + donor : "analyse selon les grants disponibles") + ", avec " + activities + " sous-activite(s) projet prise(s) en compte dans le suivi.</p>";
  }

  function aiExecutiveSummary(params) {
    var coverage = reportCoverage(params);
    var spent = progressSpentTotal(params);
    var project = selectedProject(params);
    var facts = progressProjectFacts(params);
    var message = progressPerformanceMessage(facts);
    return "<p>En resume, " + escapeHtml(project ? project.title : "le portefeuille selectionne") + " affiche une couverture de reporting de " + coverage + "% sur la periode. L'ecart des indicateurs en valeur absolue est de " + formatProgressMetric(facts.absoluteGap) + "; les indicateurs en pourcentage affichent une realisation moyenne de " + formatDecimal(facts.percentAchievedAverage, 1) + "% contre une cible moyenne de " + formatDecimal(facts.percentTargetAverage, 1) + "%. Les depenses saisies atteignent " + moneyText(spent, projectCurrency(params.projectId)) + ". " + message + " Les points de decision prioritaires portent sur la validation des realisations, la justification des ecarts et le rapprochement financier par categorie budgetaire.</p>";
  }

  function progressPerformanceMessage(facts) {
    if (facts.absoluteCount && facts.absoluteGap < 0) return "Les resultats en valeur absolue restent en dessous de la planification et appellent un suivi rapproche des contraintes operationnelles.";
    if (facts.absoluteCount && facts.absoluteGap > 0) return "Les realisations en valeur absolue depassent la planification et doivent etre documentees afin d'identifier les facteurs de performance.";
    if (facts.percentCount && facts.percentGapAverage < 0) return "Les indicateurs en pourcentage restent en dessous des attentes moyennes et necessitent une analyse des causes de l'ecart.";
    if (facts.percentCount && facts.percentGapAverage > 0) return "Les indicateurs en pourcentage depassent la cible moyenne et les facteurs favorables devraient etre capitalises.";
    return "Les realisations quantifiables sont alignees avec la planification disponible.";
  }

  function renderCustomReports() {
    setFormPanelMode(false, true);
    removeFilters();
    elements.title.textContent = "Rapports personnalises par periode";
    elements.kicker.textContent = "Narratif et financier";
    elements.formKicker.textContent = "Parametres du rapport";
    elements.formTitle.textContent = "Generer un rapport";
    elements.tableTitle.textContent = "Apercu du rapport";
    elements.tableCount.textContent = "1";
    elements.form.innerHTML =
      '<label>Type de rapport<select name="reportType"><option value="narrative">Rapport narratif realisations</option><option value="financial">Rapport financier</option></select></label>' +
      '<label>Projet<select name="projectId">' + optionsHtml(optionPairs(store.projects, "id", "title"), state.contextProjectId || "") + '</select></label>' +
      '<label>Periode debut<input name="startMonth" type="month" /></label>' +
      '<label>Periode fin<input name="endMonth" type="month" /></label>' +
      '<div class="form-actions"><button class="primary-action" type="submit">Generer</button><button type="button" id="print-custom-report">Imprimer</button></div>';
    elements.form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      renderGeneratedReport(false);
      return false;
    };
    document.getElementById("print-custom-report").onclick = function () { renderGeneratedReport(true); };
    renderGeneratedReport(false);
  }

  function renderProgressReport() {
    setFormPanelMode(false, true);
    removeFilters();
    elements.title.textContent = "Progress report";
    elements.kicker.textContent = "Rapport de progres operationnel";
    elements.formKicker.textContent = "Filtres du rapport";
    elements.formTitle.textContent = "Parametres";
    elements.tableTitle.textContent = "Apercu du progress report";
    elements.tableCount.textContent = "1";
    elements.form.innerHTML =
      '<label>Sous-bureau<select name="fieldOfficeId">' + optionsHtml(optionPairs(store.fieldOffices, "id", "name"), "") + '</select></label>' +
      '<label>Projet<select name="projectId">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label>' +
      '<label>Grant<select name="grantCode">' + optionsHtml(optionPairs(store.grants, "code", "donor"), "") + '</select></label>' +
      '<label>Activite CSP<select name="cspActivityId">' + optionsHtml(cspActivityOptions(), "") + '</select></label>' +
      '<label>Donateur<select name="donor">' + optionsHtml(donorOptions(), "") + '</select></label>' +
      '<label>Type periode<select name="periodType" id="progress-period-type"><option value="monthly">Mensuel</option><option value="quarterly">Trimestriel</option><option value="annual">Annuel</option></select></label>' +
      '<label id="progress-period-holder">Mois<input name="periodValue" type="month" /></label>' +
      '<div class="form-actions"><button class="primary-action" type="submit">Generer</button><button type="button" id="ai-progress">Generer avec AI</button><button type="button" id="save-progress">Enregistrer/Soumettre</button><button type="button" id="print-progress">Imprimer apercu</button></div>';
    document.getElementById("progress-period-type").onchange = function () { updateProgressPeriodInput(); };
    lockWorkspaceProjectSelector();
    elements.form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      renderProgressPreview(false, false);
      return false;
    };
    document.getElementById("ai-progress").onclick = function () { renderProgressPreview(false, true); };
    document.getElementById("save-progress").onclick = function () { saveProgressReport(); };
    document.getElementById("print-progress").onclick = function () { renderProgressPreview(true, false); };
    renderProgressPreview(false, false);
  }

  function updateProgressPeriodInput() {
    var holder = document.getElementById("progress-period-holder");
    var type = elements.form.elements.periodType.value;
    if (type === "monthly") holder.innerHTML = 'Mois<input name="periodValue" type="month" />';
    if (type === "quarterly") holder.innerHTML = 'Trimestre<select name="periodValue"><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option></select>';
    if (type === "annual") holder.innerHTML = 'Annee<input name="periodValue" type="number" min="2020" max="2035" placeholder="2026" />';
  }

  function lockWorkspaceProjectSelector() {
    if (!state.workspaceBackPage || !state.contextProjectId || !elements.form || !elements.form.elements.projectId) return;
    elements.form.elements.projectId.value = state.contextProjectId;
    elements.form.elements.projectId.disabled = true;
    elements.form.elements.projectId.className = (elements.form.elements.projectId.className ? elements.form.elements.projectId.className + " " : "") + "context-project-filter";
  }

  function readProgressParams() {
    return {
      fieldOfficeId: elements.form.elements.fieldOfficeId ? elements.form.elements.fieldOfficeId.value : "",
      projectId: elements.form.elements.projectId ? elements.form.elements.projectId.value : "",
      grantCode: elements.form.elements.grantCode ? elements.form.elements.grantCode.value : "",
      cspActivityId: elements.form.elements.cspActivityId ? elements.form.elements.cspActivityId.value : "",
      donor: elements.form.elements.donor ? elements.form.elements.donor.value : "",
      periodType: elements.form.elements.periodType ? elements.form.elements.periodType.value : "monthly",
      periodValue: elements.form.elements.periodValue ? elements.form.elements.periodValue.value : ""
    };
  }

  function renderProgressPreview(shouldPrint, useAi) {
    var params = readProgressParams();
    var html = progressReportHtml(params, useAi);
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td>' + html + savedProgressReportsHtml() + "</td></tr>";
    wireSavedProgressActions();
    if (shouldPrint) printHtml("Progress report", html);
  }

  function saveProgressReport() {
    var params = readProgressParams();
    var html = progressReportHtml(params, true);
    var project = selectedProject(params);
    var report = {
      id: "PR/" + new Date().getTime(),
      title: "Progress report - " + (project ? project.title : "Portfolio") + " - " + progressPeriodLabel(params),
      projectId: params.projectId,
      periodType: params.periodType,
      periodValue: params.periodValue,
      html: html,
      status: "Submitted",
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    };
    store.savedProgressReports.push(report);
    renderProgressPreview(false, false);
  }

  function savedProgressReportsHtml() {
    var rows = "";
    for (var i = 0; i < store.savedProgressReports.length; i += 1) {
      var report = store.savedProgressReports[i];
      rows += '<tr><td>' + escapeHtml(report.title) + '</td><td>' + escapeHtml(report.status) + '</td><td><div class="row-actions">' + progressReportActions(report.id) + "</div></td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="3">Aucun progress report soumis.</td></tr>';
    return '<div class="saved-reports"><h3>Progress reports soumis / figes</h3><table><thead><tr><th>Rapport</th><th>Statut</th><th>Actions</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function progressReportActions(id) {
    var report = findById(store.savedProgressReports, "id", id);
    var status = report ? report.status : "";
    var html = '<button type="button" data-progress-action="print" data-progress-id="' + escapeHtml(id) + '">Imprimer</button>';
    if (status === "Submitted") html += '<button type="button" data-progress-action="review" data-progress-id="' + escapeHtml(id) + '">Verifier</button>';
    if (status === "Verified") html += '<button type="button" data-progress-action="approve" data-progress-id="' + escapeHtml(id) + '">Valider</button>';
    if (status === "Validated") html += '<button type="button" data-progress-action="return" data-progress-id="' + escapeHtml(id) + '">Renvoyer</button>';
    if (status !== "Validated") html += '<button type="button" data-progress-action="delete" data-progress-id="' + escapeHtml(id) + '">Supprimer</button>';
    return html;
  }

  function handleSavedProgressAction(action, id) {
    var report = findById(store.savedProgressReports, "id", id);
    if (!report) return;
    if (action === "print") {
      showFrozenProgressReport(report, true);
      return;
    }
    if (action === "review") {
      report.status = "Verified";
      report.reviewedAt = new Date().toISOString();
      renderProgressPreview(false, false);
      return;
    }
    if (action === "approve") {
      report.status = "Validated";
      report.approvedAt = new Date().toISOString();
      renderProgressPreview(false, false);
      return;
    }
    if (action === "return") {
      if (!recordReturnReason(report, "progress report")) return;
      report.status = "Returned";
      report.returnedAt = new Date().toISOString();
      renderProgressPreview(false, false);
      return;
    }
    if (action === "delete") {
      if (window.confirm && !window.confirm("Supprimer ce progress report ?")) return;
      removeRecord(store.savedProgressReports, id);
      renderProgressPreview(false, false);
    }
  }

  function showFrozenProgressReport(report, shouldPrint) {
    var html = '<div class="report-preview progress-report"><p><strong>Status:</strong> ' + escapeHtml(report.status) + ' | <strong>Saved:</strong> ' + escapeHtml(report.createdAt) + "</p>" + report.html + returnHistoryPreview(report) + "</div>";
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td>' + (shouldPrint ? '<button class="primary-action" type="button" id="print-frozen-progress">Lancer l\'impression</button>' : "") + html + savedProgressReportsHtml() + "</td></tr>";
    var printButton = document.getElementById("print-frozen-progress");
    if (printButton) printButton.onclick = function () { printHtml(report.title, html); };
    wireSavedProgressActions();
  }

  function wireSavedProgressActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-progress-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handleSavedProgressAction(this.getAttribute("data-progress-action"), this.getAttribute("data-progress-id"));
      };
    }
  }

  function progressReportHtml(params, useAi) {
    var project = selectedProject(params);
    var period = progressPeriodLabel(params);
    var range = monthRangeFromProgress(params);
    var reportId = "PR/" + (project ? slugPart(project.id) : "PORTFOLIO") + "/" + slugPart(period || todayIsoDate());
    var cumulativeSection = "";
    if (project && range.start && project.startDate && range.start !== project.startDate.substring(0, 7)) {
      cumulativeSection = '<h3>5. Progress au ' + escapeHtml(progressPeriodEndDate(params)) + '</h3>' + progressActivityNarratives(params, true, useAi);
    }
    return '<div class="report-preview progress-report">' +
      '<h2>Progress report</h2>' +
      '<p><strong>Progress report ID:</strong> ' + escapeHtml(reportId) + '</p>' +
      '<p><strong>Projet:</strong> ' + escapeHtml(project ? project.title : "Tous") + '</p>' +
      '<p><strong>Periode:</strong> ' + escapeHtml(period) + '</p>' +
      '<h3>1. Information general sur le projet et le partenaire de mise en oeuvre</h3>' + progressProjectPartnerTable(params) +
      '<h3>2. Contexte operationnel</h3>' + progressContextParagraph(params, useAi) +
      '<h3>3. Resume executif</h3>' + progressExecutiveSummary(params, useAi) +
      '<h3>4. Realisation sur la periode de rapport</h3>' + progressActivityNarratives(params, false, useAi) +
      cumulativeSection +
      '<h3>6. Depenses</h3><h4>6.1 Par categorie budgetaire sur la periode</h4>' + progressBudgetCategoryTable(params, false) +
      '<h4>6.2 Par categorie budgetaire depuis le debut du projet avec %tage de consommation</h4>' + progressBudgetCategoryTable(params, true) +
      '<h3>7. Difficultes/Challenge</h3>' + progressTextList(params, "challenges", "Aucune contrainte renseignee.") +
      '<h3>8. Lecons apprises/meilleures pratiques</h3>' + lessonsHtml(params) + bestPracticesHtml(params) +
      '<h3>9. Recommandations</h3>' + progressTextList(params, "recommendations", "Aucune recommandation renseignee.") +
      '<h3>10. Conclusion</h3>' + progressConclusion(params, useAi) +
      '<h3>11. Plan pour la phase suivante</h3>' + progressNextPhasePlan(params, useAi) +
      '<h3>Annexe - Tableau des KPI</h3>' + progressKpiAnnexTable(params) +
      '</div>';
  }

  function progressContextParagraph(params, useAi) {
    if (useAi) return aiContextParagraph(params) + progressProjectIntelligenceParagraph(params);
    return aiContextParagraph(params);
  }

  function progressExecutiveSummary(params, useAi) {
    if (!useAi) return aiExecutiveSummary(params);
    return aiExecutiveSummary(params) + progressManagementSynthesis(params);
  }

  function renderGeneratedReport(shouldPrint) {
    var params = readCustomReportParams();
    var html = params.reportType === "financial" ? financialReportHtml(params) : narrativeReportHtml(params);
    elements.tableHead.innerHTML = "";
    elements.tableBody.innerHTML = '<tr><td>' + html + "</td></tr>";
    if (shouldPrint) printHtml(params.reportType === "financial" ? "Rapport financier" : "Rapport narratif", html);
  }

  function progressProjectPartnerTable(params) {
    var project = selectedProject(params) || {};
    var partner = findById(store.partners, "vendor", project.partnerVendor) || {};
    var grants = grantsForProject(project).map(function (grant) { return grant.code + " - " + grant.donor; }).join(", ");
    return '<table><tbody>' +
      '<tr><th>Projet</th><td>' + escapeHtml(project.id || "") + ' - ' + escapeHtml(project.title || "") + '</td><th>Accord</th><td>' + escapeHtml(project.agreementNumber || project.flaNumber || "") + '</td></tr>' +
      '<tr><th>Partenaire</th><td>' + escapeHtml(partner.vendor || project.partnerVendor || "") + ' - ' + escapeHtml(partner.name || "") + '</td><th>Nature</th><td>' + escapeHtml(partner.nature || "") + '</td></tr>' +
      '<tr><th>Periode projet</th><td>' + escapeHtml(project.startDate || "") + ' - ' + escapeHtml(project.endDate || "") + '</td><th>Budget</th><td>' + moneyText(Number(project.budgetXaf || 0), projectCurrency(project.id)) + '</td></tr>' +
      '<tr><th>Grants</th><td colspan="3">' + escapeHtml(grants || grantCodesLabel(project.grantCodes || [])) + '</td></tr>' +
      '</tbody></table>';
  }

  function progressActivityNarratives(params, cumulative, useAi) {
    var activities = progressActivities(params);
    var html = "";
    for (var i = 0; i < activities.length; i += 1) {
      html += '<h4>' + (cumulative ? "5." : "4.") + (i + 1) + ' ' + escapeHtml(cleanReportLabel(activities[i].label || activities[i].id)) + '</h4>' + progressActivityParagraph(activities[i], params, cumulative, useAi, i);
    }
    return html || '<p class="muted">Aucune activite trouvee pour les filtres selectionnes.</p>';
  }

  function progressActivities(params) {
    var out = [];
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      var activity = store.projectActivities[i];
      if (params.projectId && activity.projectId !== params.projectId) continue;
      if (params.grantCode && !activityHasGrant(activity, params.grantCode) && !projectHasGrant(findById(store.projects, "id", activity.projectId), params.grantCode)) continue;
      if (params.cspActivityId && (!activity.cspActivityIds || activity.cspActivityIds.indexOf(params.cspActivityId) < 0)) continue;
      out.push(activity);
    }
    return out;
  }

  function progressActivityParagraph(activity, params, cumulative, useAi, index) {
    var scoped = cumulative ? cumulativeProgressParams(params) : params;
    var summary = progressActivityMetricSummary(activity.id, scoped);
    var percent = summary.absolute.target ? Math.round((summary.absolute.achieved / summary.absolute.target) * 1000) / 10 : summary.percent.count ? summary.percent.achievedAverage : 0;
    var subLabels = subActivitiesForActivity(activity.id).map(function (item) { return cleanReportLabel(item.label || item.id); });
    var insights = progressActivityInsights(activity.id, scoped);
    if (useAi) return aiProgressActivityParagraph(activity, summary, subLabels, insights, scoped, cumulative, index);
    var scopeText = cumulative ? "depuis le demarrage du projet" : "sur la periode de rapport";
    var leadOptions = [
      "Les donnees consolidees indiquent",
      "Le suivi disponible met en evidence",
      "Les informations rapportees montrent",
      "La lecture operationnelle fait ressortir"
    ];
    var lead = leadOptions[(index || 0) % leadOptions.length];
    var status = percent >= 100 ? "une performance au-dessus de la cible" : percent >= 90 ? "une progression solide, proche des attentes de mise en oeuvre" : percent >= 60 ? "une avance reelle, avec quelques points a suivre de pres" : "un niveau d'execution qui appelle une attention manageriale rapide";
    var subText = subLabels.length ? " Les sous-activites prises en compte sont: " + escapeHtml(subLabels.join("; ")) + "." : "";
    var evidenceText = insights.reportCount ? " Les rapports mensuels consolident " + insights.reportCount + " ligne(s) de realisation, couvrant notamment " + escapeHtml(insights.kpiLabels.slice(0, 4).join("; ")) + "." : " Les donnees mensuelles disponibles restent limitees pour documenter finement les realisations.";
    var fieldText = insights.comments.length ? " Les observations terrain signalent: " + escapeHtml(insights.comments.slice(0, 2).join(" ")) : "";
    var constraintText = insights.challenges.length ? " Les contraintes a suivre concernent: " + escapeHtml(insights.challenges.slice(0, 2).join(" ")) : "";
    var metricText = progressMetricSummarySentence(summary, scopeText);
    var managementNote = "";
    if (useAi) {
      if (percent >= 90) managementNote = " Cette dynamique peut etre capitalisee pour documenter les facteurs de performance et securiser la suite de l'execution.";
      else if (percent >= 60) managementNote = " Une revue ciblee des contraintes terrain et des ressources mobilisees aidera a consolider les progres observes.";
      else managementNote = " Une decision de suivi est recommandee afin de clarifier les blocages, confirmer les responsabilites et ajuster les priorites du prochain cycle.";
    }
    return '<p>' + lead + ' ' + metricText + ' Le niveau atteint traduit ' + status + '.' + subText + evidenceText + fieldText + constraintText + managementNote + '</p>';
  }

  function aiProgressActivityParagraph(activity, summary, subLabels, insights, params, cumulative, index) {
    var scopeText = cumulative ? "depuis le demarrage du projet" : "au cours de la periode de reporting";
    var activityName = cleanReportLabel(activity.label || activity.id);
    var items = progressActivityReportItems(activity.id, params);
    var intro = progressActivityIntro(activityName, summary, scopeText, index);
    var sentences = [];
    for (var i = 0; i < items.length; i += 1) {
      sentences.push(progressActivityItemSentence(items[i], i));
    }
    var close = progressActivityClosing(items, insights, summary);
    if (!sentences.length) {
      var fallback = progressMetricSummarySentence(summary, scopeText);
      return '<p>' + escapeHtml(intro + ' ' + fallback + ' Les informations disponibles devront etre completees par les rapports mensuels afin de produire une analyse plus documentee.') + '</p>';
    }
    return '<p>' + escapeHtml(intro + ' ' + sentences.join(" ") + ' ' + close) + '</p>';
  }

  function progressActivityIntro(activityName, summary, scopeText, index) {
    var theme = reportActivityTheme(activityName);
    var signal = progressActivitySignal(summary);
    var openings = [
      "Dans le cadre du volet " + theme,
      "Au titre du volet " + theme,
      "Sur le volet " + theme,
      "Concernant le volet " + theme
    ];
    if (summary.absolute.count || summary.percent.count) return openings[(index || 0) % openings.length] + ", " + signal + " ont ete enregistrees " + scopeText + ".";
    return openings[(index || 0) % openings.length] + ", les elements de suivi disponibles restent encore partiels " + scopeText + ".";
  }

  function progressActivitySignal(summary) {
    var absoluteRate = summary.absolute.target ? (summary.absolute.achieved / summary.absolute.target) * 100 : 0;
    var percentRate = summary.percent.targetAverage ? (summary.percent.achievedAverage / summary.percent.targetAverage) * 100 : 0;
    var rate = absoluteRate || percentRate;
    if (rate >= 100) return "des avancees solides";
    if (rate >= 85) return "des progres importants";
    if (rate >= 60) return "des avancees encourageantes";
    return "des progres encore limites mais documentes";
  }

  function reportActivityTheme(label) {
    var text = cleanReportLabel(label || "").split("/")[0].trim();
    text = text.replace(/\s+du\s+Project$/i, " du projet").replace(/\s+du\s+Projet$/i, " du projet");
    return lowerFirst(text || "cette composante");
  }

  function progressActivityReportItems(activityId, params) {
    var range = monthRangeFromProgress(params);
    var out = [];
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (plan.activityId !== activityId) continue;
      if (!activityMatchesProgressFilters(activityId, params)) continue;
      if (!monthInRange(plan.month, range)) continue;
      var report = reportForPlan(plan.id);
      if (!report) continue;
      var kpi = findByRecordId(store.kpis, plan.kpiId) || {};
      var kind = progressMetricKind(plan, report);
      out.push({
        kpiLabel: cleanReportLabel(kpi.label || plan.kpiId),
        targetRaw: plan.target || "",
        achievedRaw: report.achieved || "",
        target: progressNumericValue(plan.target),
        achieved: progressNumericValue(report.achieved),
        kind: kind,
        rate: kind === "percent" ? progressNumericValue(report.achieved) : achievementRate(report.achieved, plan.target),
        comment: report.narrative || "",
        status: normalizeWorkflowStatus(report.status || "")
      });
    }
    return out;
  }

  function progressActivityItemSentence(item, index) {
    var subject = reportKpiSubject(item.kpiLabel);
    var evidence = progressEvidenceClause(item.comment);
    if (item.kind === "percent") {
      return transitionPhrase(index) + subject + " a atteint " + formatDecimal(item.achieved, 1) + "%, contre une cible de " + formatDecimal(item.target, 1) + "%, traduisant " + percentPerformanceText(item.achieved, item.target) + evidence + ".";
    }
    var rateText = item.target ? ", soit " + formatDecimal(item.rate, 1) + "% de la cible" : "";
    return transitionPhrase(index) + subject + " a permis d'atteindre " + formatProgressMetric(item.achieved) + " sur une cible de " + formatProgressMetric(item.target) + rateText + evidence + ".";
  }

  function transitionPhrase(index) {
    if (index === 0) return "Ainsi, ";
    if (index === 1) return "Dans le meme temps, ";
    if (index === 2) return "En complement, ";
    return "Enfin, ";
  }

  function reportKpiSubject(label) {
    var text = cleanReportLabel(label || "");
    text = text.replace(/^\d+\s*/, "").replace(/^%tage\s+/i, "le taux de ");
    text = text.replace(/^#\s*/, "le nombre de ");
    text = text.replace(/\s*\/\s*cible\s*:\s*.+$/i, "");
    text = text.replace(/\s+cible\s*[:=]?\s*.+$/i, "");
    return lowerFirst(text || "l'indicateur suivi");
  }

  function percentPerformanceText(achieved, target) {
    if (!target) return "un niveau de realisation documente pour la periode";
    var gap = achieved - target;
    if (gap >= 0) return "une performance pleinement conforme aux attentes";
    if (achieved >= target * 0.9) return "une progression tres proche du niveau attendu";
    if (achieved >= target * 0.6) return "une avance notable, meme si des efforts restent necessaires pour atteindre la cible";
    return "un niveau d'execution encore insuffisant au regard de la cible fixee";
  }

  function progressEvidenceClause(comment) {
    var text = cleanSentence(comment);
    if (!text) return "";
    return ", avec comme element de preuve rapporte: " + lowerFirst(text);
  }

  function progressActivityClosing(items, insights, summary) {
    var validated = items.length && items.every(function (item) { return item.status === "Validated"; });
    var parts = [];
    if (validated) parts.push("L'ensemble des indicateurs reportes pour cette composante a ete valide, ce qui renforce la fiabilite des resultats presentes");
    if (insights.challenges.length) parts.push("les contraintes signalees devront toutefois etre suivies de pres, notamment " + lowerFirst(cleanSentence(insights.challenges[0])));
    if (insights.recommendations.length) parts.push("les recommandations formulees orientent les prochaines etapes vers " + lowerFirst(cleanSentence(insights.recommendations[0])));
    if (!parts.length) {
      if ((summary.absolute.target && summary.absolute.achieved >= summary.absolute.target) || (summary.percent.count && summary.percent.achievedAverage >= summary.percent.targetAverage)) return "Ces resultats traduisent une dynamique positive et une appropriation satisfaisante des activites par les parties prenantes concernees.";
      if ((summary.absolute.target && summary.absolute.achieved >= summary.absolute.target * 0.6) || (summary.percent.count && summary.percent.achievedAverage >= summary.percent.targetAverage * 0.6)) return "Dans l'ensemble, la mise en oeuvre progresse, mais les ecarts observes appellent un suivi rapproche afin de consolider les acquis et d'accelerer les livrables restants.";
      return "Ces resultats appellent une attention manageriale particuliere, afin de clarifier les blocages, renforcer l'accompagnement operationnel et ameliorer la qualite des preuves de realisation.";
    }
    return upperFirst(parts.join("; ")) + ".";
  }

  function cleanSentence(value) {
    return String(value || "").trim().replace(/\s+/g, " ").replace(/[.;,\s]+$/g, "");
  }

  function lowerFirst(value) {
    var text = String(value || "").trim();
    return text ? text.charAt(0).toLowerCase() + text.slice(1) : "";
  }

  function upperFirst(value) {
    var text = String(value || "").trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
  }

  function progressMetricSummarySentence(summary, scopeText) {
    var parts = [];
    if (summary.absolute.count) {
      var rate = summary.absolute.target ? Math.round((summary.absolute.achieved / summary.absolute.target) * 1000) / 10 : 0;
      parts.push("pour les indicateurs en valeur absolue, une cible consolidee de " + formatProgressMetric(summary.absolute.target) + " pour une realisation de " + formatProgressMetric(summary.absolute.achieved) + ", soit " + formatDecimal(rate, 1) + "%");
    }
    if (summary.percent.count) {
      parts.push("pour les indicateurs exprimes en pourcentage, une cible moyenne de " + formatDecimal(summary.percent.targetAverage, 1) + "% pour une realisation moyenne de " + formatDecimal(summary.percent.achievedAverage, 1) + "%");
    }
    if (!parts.length) return "les donnees disponibles ne permettent pas encore de consolider une cible chiffree " + scopeText + ".";
    return parts.join("; ") + " " + scopeText + ".";
  }

  function progressActivityMetricSummary(activityId, params) {
    return progressMetricSummary(function (plan) {
      return plan.activityId === activityId && activityMatchesProgressFilters(activityId, params);
    }, params);
  }

  function progressPortfolioMetricSummary(params) {
    return progressMetricSummary(function (plan) {
      if (params.projectId && plan.projectId !== params.projectId) return false;
      return activityMatchesProgressFilters(plan.activityId, params);
    }, params);
  }

  function progressMetricSummary(planMatcher, params) {
    var range = monthRangeFromProgress(params);
    var summary = { absolute: { target: 0, achieved: 0, count: 0 }, percent: { target: 0, achieved: 0, count: 0, targetAverage: 0, achievedAverage: 0 } };
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (!planMatcher(plan)) continue;
      if (!monthInRange(plan.month, range)) continue;
      var report = reportForPlan(plan.id);
      var kind = progressMetricKind(plan, report);
      if (kind === "percent") {
        summary.percent.target += progressNumericValue(plan.target);
        summary.percent.achieved += report ? progressNumericValue(report.achieved) : 0;
        summary.percent.count += 1;
      } else {
        summary.absolute.target += progressNumericValue(plan.target);
        summary.absolute.achieved += report ? progressNumericValue(report.achieved) : 0;
        summary.absolute.count += 1;
      }
    }
    summary.percent.targetAverage = summary.percent.count ? Math.round((summary.percent.target / summary.percent.count) * 10) / 10 : 0;
    summary.percent.achievedAverage = summary.percent.count ? Math.round((summary.percent.achieved / summary.percent.count) * 10) / 10 : 0;
    return summary;
  }

  function progressMetricKind(plan, report) {
    var kpi = findByRecordId(store.kpis, plan.kpiId) || {};
    var text = [plan.target, report ? report.achieved : "", kpi.label, kpi.target].join(" ");
    return /%|pourcentage|percent|taux/i.test(text) ? "percent" : "absolute";
  }

  function progressActivityInsights(activityId, params) {
    var range = monthRangeFromProgress(params);
    var info = { reportCount: 0, kpiLabels: [], comments: [], challenges: [], recommendations: [] };
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      var plan = findByRecordId(store.monthlyPlans, report.planId);
      if (!plan || plan.activityId !== activityId) continue;
      if (!activityMatchesProgressFilters(activityId, params)) continue;
      if (!monthInRange(report.month, range)) continue;
      info.reportCount += 1;
      var kpi = findByRecordId(store.kpis, plan.kpiId);
      var label = cleanReportLabel(kpi ? kpi.label : plan.kpiId);
      if (label && info.kpiLabels.indexOf(label) < 0) info.kpiLabels.push(label);
      pushUniqueText(info.comments, report.narrative);
      pushUniqueText(info.challenges, report.challenges);
      pushUniqueText(info.recommendations, report.recommendations);
    }
    return info;
  }

  function pushUniqueText(items, value) {
    value = String(value || "").trim();
    if (value && items.indexOf(value) < 0) items.push(value);
  }

  function cleanReportLabel(value) {
    var text = String(value || "").trim();
    text = text.replace(/^(SAct|Act|Ind|KPI|PMI)\d+\/[^-]+-\s*/i, "");
    text = text.replace(/^(SAct|Act|Ind|KPI|PMI)\d+[^\s-]*\s*-\s*/i, "");
    text = text.replace(/^[A-Z]{1,5}\d{1,4}\/[^\s]+(?:\s*-\s*)?/i, "");
    return text || String(value || "");
  }

  function cumulativeProgressParams(params) {
    var project = selectedProject(params);
    var range = monthRangeFromProgress(params);
    var start = project && project.startDate ? project.startDate.substring(0, 7) : "";
    return {
      fieldOfficeId: params.fieldOfficeId,
      projectId: params.projectId,
      grantCode: params.grantCode,
      cspActivityId: params.cspActivityId,
      donor: params.donor,
      periodType: "custom",
      periodValue: "",
      _rangeStart: start,
      _rangeEnd: range.end
    };
  }

  function progressBudgetCategoryTable(params, cumulative) {
    var data = progressBudgetCategoryData(params, cumulative);
    var rows = "";
    for (var category in data) if (Object.prototype.hasOwnProperty.call(data, category)) {
      var item = data[category];
      var pct = item.budget ? Math.round((item.spent / item.budget) * 1000) / 10 : 0;
      rows += '<tr><td>' + escapeHtml(category) + '</td><td>' + formatNumber(item.budget) + '</td><td>' + formatNumber(item.spent) + '</td><td>' + formatDecimal(pct, 1) + '%</td><td>' + formatNumber(item.budget - item.spent) + '</td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="5">Aucune donnee budgetaire.</td></tr>';
    return '<table><thead><tr><th>Categorie</th><th>Budget</th><th>Depense</th><th>% consommation</th><th>Reste</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function progressBudgetCategoryData(params, cumulative) {
    var rangeParams = cumulative ? cumulativeProgressParams(params) : params;
    var data = {};
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (params.projectId && line.projectId !== params.projectId) continue;
      if (!budgetLineMatchesProgressFilters(line, params)) continue;
      var key = line.costCategory || "Non categorise";
      if (!data[key]) data[key] = { budget: 0, spent: 0 };
      data[key].budget += budgetLineContributionTotals(line).total;
      data[key].spent += expenseTotalForBudgetLine(line.id, progressPeriodParams(rangeParams));
    }
    return data;
  }

  function progressKpiAnnexTable(params) {
    var rows = "";
    var activities = progressActivities(params);
    for (var i = 0; i < activities.length; i += 1) {
      var kpis = kpiRecordsForActivity(activities[i].id);
      for (var k = 0; k < kpis.length; k += 1) {
        var period = kpiProgressTotals(kpis[k].id, params);
        var cumulative = kpiProgressTotals(kpis[k].id, cumulativeProgressParams(params));
        var unit = period.kind === "percent" ? "%" : "Nombre";
        rows += '<tr><td>' + escapeHtml(kpis[k].id) + '</td><td>' + escapeHtml(kpis[k].label || "") + '</td><td>' + escapeHtml(unit) + '</td><td>' + escapeHtml(formatKpiProgressValue(period.target, period.kind)) + '</td><td>' + escapeHtml(formatKpiProgressValue(period.achieved, period.kind)) + '</td><td>' + escapeHtml(formatKpiProgressValue(cumulative.target, cumulative.kind)) + '</td><td>' + escapeHtml(formatKpiProgressValue(cumulative.achieved, cumulative.kind)) + '</td></tr>';
      }
    }
    if (!rows) rows = '<tr><td colspan="7">Aucun KPI trouve.</td></tr>';
    return '<table><thead><tr><th>ID KPI</th><th>Libelle KPI</th><th>Unite</th><th>Cible periode</th><th>Realisation periode</th><th>Cible cumulee</th><th>Realisation cumulee</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function kpiProgressTotals(kpiId, params) {
    var range = monthRangeFromProgress(params);
    var target = 0;
    var achieved = 0;
    var percentTarget = 0;
    var percentAchieved = 0;
    var percentCount = 0;
    var kind = "absolute";
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (plan.kpiId !== kpiId) continue;
      if (params.projectId && plan.projectId !== params.projectId) continue;
      if (!monthInRange(plan.month, range)) continue;
      var report = reportForPlan(plan.id);
      var planKind = progressMetricKind(plan, report);
      if (planKind === "percent") {
        kind = "percent";
        percentTarget += progressNumericValue(plan.target);
        percentAchieved += report ? progressNumericValue(report.achieved) : 0;
        percentCount += 1;
      } else {
        target += progressNumericValue(plan.target);
        if (report) achieved += progressNumericValue(report.achieved);
      }
    }
    if (kind === "percent") return { target: percentCount ? Math.round((percentTarget / percentCount) * 10) / 10 : 0, achieved: percentCount ? Math.round((percentAchieved / percentCount) * 10) / 10 : 0, kind: "percent" };
    return { target: target, achieved: achieved, kind: "absolute" };
  }

  function formatKpiProgressValue(value, kind) {
    return kind === "percent" ? formatDecimal(value, 1) + "%" : formatProgressMetric(value);
  }

  function progressConclusion(params, useAi) {
    var gap = progressGapSummary(params);
    if (useAi) {
      var facts = progressProjectFacts(params);
      var tone = facts.performanceRate < 90 ? "La priorite manageriale est de transformer les alertes de mise en oeuvre en mesures correctives tracees, avec un suivi rapproche du partenaire et des responsables operationnels." : facts.performanceRate > 105 ? "La periode confirme une dynamique favorable sur les indicateurs quantifiables; les facteurs ayant permis ces resultats devraient etre documentes afin d'orienter la planification suivante." : "La mise en oeuvre apparait globalement maitrisee au regard des donnees disponibles, sous reserve de maintenir la qualite du reporting et du suivi financier.";
      return '<p>' + tone + ' Le rapport consolide ' + facts.reportCount + ' ligne(s) de reporting quantitatif, ' + facts.expenseCount + ' depense(s), ' + facts.fdpCount + ' FDP rattaches et ' + facts.stakeholderCount + ' partie(s) prenante(s) liee(s) au projet.</p>';
    }
    if (gap < 0) return '<p>La mise en oeuvre reste inferieure aux cibles planifiees et requiert un suivi rapproche des contraintes, des ressources et de la coordination avec le partenaire.</p>';
    if (gap > 0) return '<p>Les realisations rapportees depassent les cibles planifiees. Les facteurs de performance devront etre documentes pour guider les prochaines planifications.</p>';
    return '<p>Les realisations rapportees sont globalement alignees avec les cibles disponibles pour la periode.</p>';
  }

  function progressNextPhasePlan(params, useAi) {
    if (useAi) {
      var facts = progressProjectFacts(params);
      var budgetSignal = facts.budgetConsumption > 80 ? "securiser les engagements budgetaires restants et anticiper les arbitrages de cout" : "accelerer l'execution tout en maintenant le rapprochement entre activites, depenses et pieces justificatives";
      return '<p>La phase suivante devrait prioriser les activites en retard, confirmer les responsabilites de l organisation et du partenaire pour les livrables critiques, ' + budgetSignal + '. Les FDP et parties prenantes rattaches au projet devront etre mobilises selon les zones effectivement couvertes, avec une attention particuliere aux recommandations issues du reporting mensuel.</p>';
    }
    return '<p>La phase suivante portera sur la poursuite des activites planifiees, le suivi des recommandations, la resolution des difficultes signalees et le renforcement du controle budgetaire par categorie de cout.</p>';
  }

  function progressProjectIntelligenceParagraph(params) {
    var facts = progressProjectFacts(params);
    var project = selectedProject(params) || {};
    var partner = findById(store.partners, "vendor", project.partnerVendor) || {};
    var fdpText = facts.fdpCount ? facts.fdpCount + " FDP" + (facts.beneficiaries ? " couvrant " + formatNumber(facts.beneficiaries) + " beneficiaires planifies" : "") : "aucun FDP rattache";
    var grantText = facts.grantLabels.length ? facts.grantLabels.join(", ") : "aucun grant rattache";
    return '<p>L\'analyse IA consolide les informations disponibles sur le projet, le partenaire, les grants, les FDP, les rapports mensuels et les depenses. Le projet est mis en oeuvre avec ' + escapeHtml(partner.name || "le partenaire renseigne") + ', finance ou appuye par ' + escapeHtml(grantText) + ', et couvre ' + escapeHtml(fdpText) + '. Cette lecture croise la planification, les realisations, les contraintes signalees et le niveau de consommation budgetaire afin de faire ressortir les points utiles a la decision.</p>';
  }

  function progressManagementSynthesis(params) {
    var facts = progressProjectFacts(params);
    var executionSignal = facts.performanceRate >= 90 ? "Les resultats disponibles indiquent une execution proche des attentes" : facts.performanceRate >= 60 ? "L'execution progresse mais reste exposee a des points d'attention" : "L'execution rapportee reste faible au regard des cibles consolidees";
    var budgetSignal = facts.budgetConsumption > 100 ? "avec une alerte de surconsommation budgetaire a traiter avant toute nouvelle validation" : facts.budgetConsumption >= 80 ? "avec une consommation budgetaire elevee qui appelle un suivi rapproche" : "avec une consommation budgetaire encore compatible avec une marge de pilotage";
    return '<p>' + executionSignal + ', ' + budgetSignal + '. La couverture de reporting est estimee a ' + facts.coverage + '%. Les indicateurs en valeur absolue totalisent ' + formatProgressMetric(facts.planned) + ' cible(s) pour ' + formatProgressMetric(facts.achieved) + ' realisation(s); les indicateurs exprimes en pourcentage affichent une cible moyenne de ' + formatDecimal(facts.percentTargetAverage, 1) + '% pour une realisation moyenne de ' + formatDecimal(facts.percentAchievedAverage, 1) + '%. Les decisions prioritaires portent sur la levee des contraintes documentees, la qualite des preuves de realisation et l\'alignement entre avancement operationnel, FDP couverts et ressources disponibles.</p>';
  }

  function progressProjectFacts(params) {
    var project = selectedProject(params) || {};
    var range = monthRangeFromProgress(params);
    var facts = {
      coverage: reportCoverage(params),
      planned: 0,
      achieved: 0,
      absoluteGap: 0,
      achievementRate: 0,
      performanceRate: 0,
      absoluteCount: 0,
      percentCount: 0,
      percentTargetAverage: 0,
      percentAchievedAverage: 0,
      percentGapAverage: 0,
      spent: progressSpentTotal(params),
      budget: 0,
      budgetConsumption: 0,
      fdpCount: 0,
      beneficiaries: 0,
      stakeholderCount: 0,
      partnerStaffCount: 0,
      reportCount: 0,
      expenseCount: 0,
      grantLabels: []
    };
    var metricSummary = progressPortfolioMetricSummary(params);
    facts.planned = metricSummary.absolute.target;
    facts.achieved = metricSummary.absolute.achieved;
    facts.absoluteGap = facts.achieved - facts.planned;
    facts.absoluteCount = metricSummary.absolute.count;
    facts.percentCount = metricSummary.percent.count;
    facts.percentTargetAverage = metricSummary.percent.targetAverage;
    facts.percentAchievedAverage = metricSummary.percent.achievedAverage;
    facts.percentGapAverage = Math.round((facts.percentAchievedAverage - facts.percentTargetAverage) * 10) / 10;
    facts.achievementRate = facts.planned ? Math.round((facts.achieved / facts.planned) * 1000) / 10 : 0;
    facts.performanceRate = facts.absoluteCount ? facts.achievementRate : facts.percentTargetAverage ? Math.round((facts.percentAchievedAverage / facts.percentTargetAverage) * 1000) / 10 : facts.percentAchievedAverage;
    var grants = grantsForProject(project);
    for (var g = 0; g < grants.length; g += 1) facts.grantLabels.push(grants[g].code ? grants[g].code + " - " + grants[g].donor : grants[g].donor);
    var projectFdps = project.projectFdps || [];
    facts.fdpCount = projectFdps.length || (project.fdpIds || []).length;
    for (var f = 0; f < projectFdps.length; f += 1) facts.beneficiaries += Number(projectFdps[f].beneficiaries || 0);
    for (var b = 0; b < store.budgets.length; b += 1) if (!params.projectId || store.budgets[b].projectId === params.projectId) facts.budget += budgetLineContributionTotals(store.budgets[b]).total;
    facts.budgetConsumption = facts.budget ? Math.round((facts.spent / facts.budget) * 1000) / 10 : 0;
    for (var s = 0; s < store.stakeholders.length; s += 1) if (!params.projectId || store.stakeholders[s].projectId === params.projectId) facts.stakeholderCount += 1;
    for (var ps = 0; ps < store.partnerStaffs.length; ps += 1) if (!params.projectId || store.partnerStaffs[ps].projectId === params.projectId) facts.partnerStaffCount += 1;
    for (var r = 0; r < store.monthlyReports.length; r += 1) if (matchProgressReport(store.monthlyReports[r], params)) facts.reportCount += 1;
    for (var e = 0; e < store.monthlyExpenses.length; e += 1) {
      var expense = store.monthlyExpenses[e];
      if (params.projectId && expense.projectId !== params.projectId) continue;
      if (!monthInRange(expense.month, range)) continue;
      facts.expenseCount += 1;
    }
    return facts;
  }

  function readCustomReportParams() {
    return {
      reportType: elements.form.elements.reportType ? elements.form.elements.reportType.value : "narrative",
      projectId: elements.form.elements.projectId ? elements.form.elements.projectId.value : "",
      startMonth: elements.form.elements.startMonth ? elements.form.elements.startMonth.value : "",
      endMonth: elements.form.elements.endMonth ? elements.form.elements.endMonth.value : ""
    };
  }

  function narrativeReportHtml(params) {
    var rows = "";
    var summary = { absolute: { target: 0, achieved: 0, count: 0 }, percent: { target: 0, achieved: 0, count: 0 } };
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (!matchPeriodProject(plan, params)) continue;
      var report = reportForPlan(plan.id);
      var kpi = findById(store.kpis, "id", plan.kpiId);
      var kind = progressMetricKind(plan, report);
      var target = progressNumericValue(plan.target);
      var achieved = report ? progressNumericValue(report.achieved) : 0;
      if (kind === "percent") {
        summary.percent.target += target;
        summary.percent.achieved += achieved;
        summary.percent.count += 1;
      } else {
        summary.absolute.target += target;
        summary.absolute.achieved += achieved;
        summary.absolute.count += 1;
      }
      rows += "<tr><td>" + escapeHtml(plan.month) + "</td><td>" + escapeHtml(kpi ? kpi.label : plan.kpiId) + "</td><td>" + escapeHtml(formatKpiProgressValue(target, kind)) + "</td><td>" + escapeHtml(report ? formatKpiProgressValue(achieved, kind) : "Non rapporte") + "</td><td>" + escapeHtml(report ? formatNarrativeGap(target, achieved, kind) : "") + "</td><td>" + escapeHtml(report ? report.narrative : "") + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="6">Aucune donnee pour cette periode.</td></tr>';
    return '<div class="report-preview"><h2>Rapport narratif de realisation</h2><p>Periode: ' + escapeHtml(periodLabel(params)) + '</p><table><thead><tr><th>Mois</th><th>KPI</th><th>Cible</th><th>Realisation</th><th>Ecart</th><th>Narratif</th></tr></thead><tbody>' + rows + '</tbody></table>' + narrativeMetricSummaryHtml(summary) + "</div>";
  }

  function formatNarrativeGap(target, achieved, kind) {
    var gap = achieved - target;
    return kind === "percent" ? formatDecimal(gap, 1) + " pts" : formatProgressMetric(gap);
  }

  function narrativeMetricSummaryHtml(summary) {
    var html = '<div class="metric-summary">';
    if (summary.absolute.count) {
      html += '<p><strong>Indicateurs en valeur absolue:</strong> cible totale ' + formatProgressMetric(summary.absolute.target) + ' | realise total ' + formatProgressMetric(summary.absolute.achieved) + ' | ecart ' + formatProgressMetric(summary.absolute.achieved - summary.absolute.target) + '</p>';
    }
    if (summary.percent.count) {
      var targetAverage = Math.round((summary.percent.target / summary.percent.count) * 10) / 10;
      var achievedAverage = Math.round((summary.percent.achieved / summary.percent.count) * 10) / 10;
      html += '<p><strong>Indicateurs en pourcentage:</strong> cible moyenne ' + formatDecimal(targetAverage, 1) + '% | realisation moyenne ' + formatDecimal(achievedAverage, 1) + '% | ecart moyen ' + formatDecimal(achievedAverage - targetAverage, 1) + ' pts</p>';
    }
    if (!summary.absolute.count && !summary.percent.count) html += '<p class="muted">Aucune metrique consolidee.</p>';
    return html + '</div>';
  }

  function financialReportHtml(params) {
    var rows = "";
    var totalSpent = 0;
    var currency = projectCurrency(params.projectId);
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (params.projectId && line.projectId !== params.projectId) continue;
      var spent = expenseTotalForBudgetLine(line.id, params);
      totalSpent += spent;
      var amount = Number(line.amountXaf || 0);
      var percent = amount ? Math.round((spent / amount) * 100) : 0;
      rows += "<tr><td>" + escapeHtml(line.id) + "</td><td>" + escapeHtml(line.label) + "</td><td>" + moneyText(amount, projectCurrency(line.projectId)) + "</td><td>" + moneyText(spent, projectCurrency(line.projectId)) + "</td><td>" + percent + "%</td><td>" + moneyText(amount - spent, projectCurrency(line.projectId)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="6">Aucune ligne budgetaire pour cette periode.</td></tr>';
    return '<div class="report-preview"><h2>Rapport financier</h2><p>Periode: ' + escapeHtml(periodLabel(params)) + '</p><table><thead><tr><th>Ligne</th><th>Libelle</th><th>Budget</th><th>Depense periode</th><th>% depense</th><th>Reste</th></tr></thead><tbody>' + rows + '</tbody></table><p><strong>Total depense periode:</strong> ' + moneyText(totalSpent, currency) + "</p></div>";
  }

  function renderForm(config, editRecord) {
    var html = "";
    var draft = editRecord || defaultDraft(state.page);
    draft = applyContextProjectToDraft(draft);
    if (state.page === "sites") draft = normalizeSiteDraft(draft);
    if (state.page === "cooperativePartners") draft = normalizeCooperativePartnerDraft(draft);
    if (state.page === "hgsfIngredients") draft = normalizeHgsfIngredientDraft(draft);
    if (state.page === "hgsfSchoolMenus") draft = normalizeHgsfSchoolMenuDraft(draft);
    if (state.page === "hgsfEstimations") draft = normalizeHgsfEstimationDraft(draft);
    if (state.page === "hgsfPurchaseOrders") draft = normalizeHgsfPurchaseOrderDraft(draft);
    if (state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds") draft = normalizeNeedEstimateDraft(draft);
    if (state.page === "processIndicators") draft = normalizeProcessIndicatorDraft(draft);
    if (state.page === "budgets") draft = normalizeBudgetDraft(draft);
    for (var i = 0; i < config.fields.length; i += 1) html += renderField(config.fields[i], draft);
    var canInlinePreview = state.page === "hgsfEstimations" || state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds";
    html += '<div class="form-actions">' + (canInlinePreview ? '<button type="button" id="preview-needs-estimation">Lancer / visualiser l\'estimation</button>' : "") + '<button class="primary-action" type="submit">' + (editRecord ? "Enregistrer les modifications" : config.submit) + '</button><button type="reset">Effacer</button>' + (editRecord ? '<button type="button" id="cancel-edit">Annuler modification</button>' : "") + "</div>" + (canInlinePreview ? '<div id="inline-needs-preview" class="inline-preview"></div>' : "");
    elements.form.innerHTML = html;
    if (state.page === "sites") updateGeneratedSiteId();
    if (state.page === "fieldOffices") updateGeneratedFieldOfficeId();
    if (state.page === "fdps") updateGeneratedFdpId();
    if (state.page === "cooperativePartners") updateGeneratedCooperativePartnerId();
    if (state.page === "hgsfIngredients") updateGeneratedHgsfIngredientId();
    if (state.page === "stakeholders") updateGeneratedStakeholderId();
    if (state.page === "projectActivities") updateGeneratedActivityId();
    if (state.page === "projectSubActivities") updateGeneratedSubActivityId();
    if (state.page === "kpis") updateGeneratedKpiId();
    if (state.page === "processIndicators") updateGeneratedProcessIndicatorId();
    if (state.page === "monthlyPlans") updateGeneratedMonthlyPlanId();
    wireForm(config);
    var hgsfPreview = document.getElementById("preview-needs-estimation");
    if (hgsfPreview) hgsfPreview.onclick = function () {
      var record = readForm(config, false);
      if (state.page === "hgsfEstimations") record = normalizeHgsfEstimationDraft(record);
      if (state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds") record = normalizeNeedEstimateDraft(record);
      record.status = record.status || "Draft";
      var target = document.getElementById("inline-needs-preview");
      if (target) target.innerHTML = state.page === "hgsfEstimations" ? hgsfEstimationPreview(record) : genericNeedEstimatePreview(record);
    };
    var cancel = document.getElementById("cancel-edit");
    if (cancel) cancel.onclick = function () {
      state.editingId = "";
      state.formOpen = false;
      render();
    };
    if (elements.closeForm) elements.closeForm.onclick = closeRecordForm;
  }

  function applyContextProjectToDraft(draft) {
    draft = draft || {};
    if (state.contextProjectId && projectScopedPage(state.page) && !state.editingId) draft.projectId = state.contextProjectId;
    return draft;
  }

  function projectScopedPage(pageId) {
    return ["stakeholders", "implementationPlans", "projectActivities", "kpis", "projectSubActivities", "budgets", "grantInKinds", "baselines", "monthlyPlans", "processIndicators", "communicationPlans", "procurementPlans", "riskRegisters", "qualityPlans", "resourcePlans", "monthlyReports", "monthlyExpenses", "recommendations", "processReports", "distributionReports", "partnerInvoices", "partnerInvoicePayments", "nfis", "nfiDistributions", "nfiInventories"].indexOf(pageId) > -1;
  }

  function setFormPanelMode(isModal, isVisible) {
    if (!elements.formPanel || !elements.layout) return;
    if (!isModal) removeCreateButton();
    elements.layout.className = isModal ? "config-layout modal-form-layout" : "config-layout";
    elements.formPanel.className = isModal && isVisible ? "panel form-panel modal-form open" : "panel form-panel";
    elements.formPanel.hidden = isModal && !isVisible;
    if (elements.closeForm) elements.closeForm.hidden = !isModal;
  }

  function closeRecordForm() {
    state.editingId = "";
    state.formOpen = false;
    render();
  }

  function addCreateButton(config) {
    var header = elements.tableTitle.parentNode.parentNode;
    removeCreateButton();
    if (!userCanCreatePage(state.page)) return;
    var importInput = document.createElement("input");
    importInput.id = "import-record-file";
    importInput.type = "file";
    importInput.accept = ".csv,.json,.xlsx,.xls,.xlsm,application/json,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
    importInput.hidden = true;
    importInput.onchange = function () {
      if (this.files && this.files[0]) handleImportFile(config, this.files[0]);
      this.value = "";
    };
    var importButton = document.createElement("button");
    importButton.id = "import-record";
    importButton.type = "button";
    importButton.className = "secondary-action";
    importButton.textContent = "Importer";
    importButton.onclick = function () { importInput.click(); };
    var exportSelect = document.createElement("select");
    exportSelect.id = "export-format";
    exportSelect.className = "export-format";
    exportSelect.innerHTML = '<option value="xlsx">Excel</option><option value="csv">CSV</option><option value="json">JSON</option>';
    var exportButton = document.createElement("button");
    exportButton.id = "export-record";
    exportButton.type = "button";
    exportButton.className = "secondary-action";
    exportButton.textContent = "Exporter";
    exportButton.onclick = function () { exportRegistry(config, exportSelect.value); };
    var bulkButton = null;
    if (state.page === "monthlyReports" || state.page === "monthlyExpenses" || state.page === "processReports") {
      bulkButton = document.createElement("button");
      bulkButton.id = "bulk-planning";
      bulkButton.type = "button";
      bulkButton.className = "secondary-action";
      bulkButton.textContent = "Bulk reporting";
      bulkButton.onclick = function () {
        if (state.page === "monthlyReports") openBulkMonthlyReportsDialog();
        else if (state.page === "monthlyExpenses") openBulkMonthlyExpensesDialog();
        else if (state.page === "processReports") openBulkProcessReportsDialog();
      };
    }
    var button = document.createElement("button");
    button.id = "create-record";
    button.type = "button";
    button.className = "primary-action";
    button.textContent = state.page === "monthlyPlans" ? "Creer un plan mensuel" : state.page === "partnerInvoices" ? "Enregistrer la facture" : state.page === "partnerInvoicePayments" ? "Enregistrer un paiement" : config.submit.replace(/^Enregistrer\s+/i, "Creer ");
    if (state.page === "monthlyReports") button.hidden = true;
    button.onclick = function () {
      if (state.page === "monthlyPlans") {
        openBulkPlanningDialog();
        return;
      }
      state.editingId = "";
      state.formOpen = true;
      render();
    };
    header.appendChild(importInput);
    header.appendChild(importButton);
    header.appendChild(exportSelect);
    header.appendChild(exportButton);
    if (bulkButton) header.appendChild(bulkButton);
    header.appendChild(button);
  }

  function removeCreateButton() {
    var oldButton = document.getElementById("create-record");
    if (oldButton) oldButton.parentNode.removeChild(oldButton);
    var importButton = document.getElementById("import-record");
    if (importButton) importButton.parentNode.removeChild(importButton);
    var importInput = document.getElementById("import-record-file");
    if (importInput) importInput.parentNode.removeChild(importInput);
    var exportButton = document.getElementById("export-record");
    if (exportButton) exportButton.parentNode.removeChild(exportButton);
    var exportSelect = document.getElementById("export-format");
    if (exportSelect) exportSelect.parentNode.removeChild(exportSelect);
    var bulkButton = document.getElementById("bulk-planning");
    if (bulkButton) bulkButton.parentNode.removeChild(bulkButton);
    removeWorkspaceBackButton();
  }

  function addWorkspaceBackButton() {
    removeWorkspaceBackButton();
    if (!state.workspaceBackPage) return;
    var header = elements.tableTitle.parentNode.parentNode;
    var button = document.createElement("button");
    button.id = "workspace-back-button";
    button.type = "button";
    button.className = "secondary-action workspace-back-button";
    button.textContent = "Retour aux modules";
    button.onclick = function () {
      state.page = state.workspaceBackPage;
      state.workspaceBackPage = "";
      state.editingId = "";
      state.formOpen = false;
      state.query = "";
      if (elements.search) elements.search.value = "";
      renderNav();
      render();
    };
    header.insertBefore(button, header.firstChild);
  }

  function removeWorkspaceBackButton() {
    var button = document.getElementById("workspace-back-button");
    if (button) button.parentNode.removeChild(button);
  }

  function exportRegistry(config, format) {
    if (!format) return;
    var records = filteredRecords(state.page);
    if (!records.length) {
      window.alert("Aucune ligne a exporter dans le registre actif.");
      return;
    }
    var rows = exportRows(config, records);
    var baseName = state.page + "-" + todayIsoDate();
    if (format === "json") downloadText(baseName + ".json", "application/json", JSON.stringify(rows, null, 2));
    else if (format === "csv") downloadText(baseName + ".csv", "text/csv;charset=utf-8", rowsToCsv(rows));
    else if (format === "xlsx") exportExcel(baseName + ".xlsx", rows);
    else window.alert("Format non reconnu.");
  }

  function exportRows(config, records) {
    var fields = exportFields(config);
    var rows = [];
    for (var i = 0; i < records.length; i += 1) {
      var row = {};
      for (var f = 0; f < fields.length; f += 1) row[labelize(fields[f])] = exportDisplayValue(records[i], fields[f]);
      rows.push(row);
    }
    return rows;
  }

  function exportFields(config) {
    var seen = {};
    var fields = [];
    function addField(name) {
      if (!name || seen[name] || skipExportField(name)) return;
      seen[name] = true;
      fields.push(name);
    }
    for (var i = 0; i < config.fields.length; i += 1) {
      addField(config.fields[i].name);
    }
    for (var c = 0; c < config.columns.length; c += 1) addField(config.columns[c]);
    if (state.page === "processIndicators") {
      addField("kpiId");
      addField("activityId");
      addField("dataSource");
      addField("responsiblePam");
      addField("partnerFocalPoint");
      addField("comment");
    }
    addField("status");
    return fields;
  }

  function skipExportField(name) {
    if (state.page === "users" && name === "password") return true;
    if (state.page === "processIndicators" && (name === "kpiIds" || name === "processKpiDetails")) return true;
    if (name && name.charAt(0) === "_") return true;
    return false;
  }

  function exportDisplayValue(record, key) {
    var value = record[key];
    if (value === undefined || value === null) return "";
    if (workflowPage(state.page) && key === "status") return normalizeWorkflowStatus(value);
    if (key === "grantModality") return grantModalityLabel(record);
    if (key === "projectFdps") return exportProjectFdps(record);
    if (key === "foodItems") return exportFoodItems(record);
    if (key === "grantContributions") return monthlyGrantContributionsLabel(record);
    if (key === "processKpiDetails") return exportProcessKpiDetails(record);
    if (Object.prototype.toString.call(value) === "[object Array]") return exportArrayValue(key, value);
    if (typeof value === "object") return exportObjectValue(value);
    if (typeof value === "number") return value;
    return resolveReferenceLabel(key, value);
  }

  function exportArrayValue(key, values) {
    if (!values.length) return "";
    var out = [];
    for (var i = 0; i < values.length; i += 1) {
      if (typeof values[i] === "object") out.push(exportObjectValue(values[i]));
      else out.push(resolveReferenceLabel(key, values[i]));
    }
    return out.join("\n");
  }

  function exportObjectValue(value) {
    var parts = [];
    for (var key in value) if (Object.prototype.hasOwnProperty.call(value, key) && key.charAt(0) !== "_") {
      var nextValue = Object.prototype.toString.call(value[key]) === "[object Array]" ? exportArrayValue(key, value[key]) : resolveReferenceLabel(key, value[key]);
      parts.push(labelize(key) + ": " + nextValue);
    }
    return parts.join(" | ");
  }

  function exportProjectFdps(record) {
    var items = projectFdpsForRecord(record);
    var rows = [];
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId) || { id: items[i].fdpId };
      rows.push(fdpLabel(fdp) + " | Type: " + (items[i].fdpType || fdp.fdpType || "") + " | Grants: " + grantCodesLabel(items[i].grantCodes || []) + " | Beneficiaires: " + (items[i].beneficiaries || 0));
    }
    return rows.join("\n");
  }

  function exportFoodItems(record) {
    var items = record.foodItems || [];
    var rows = [];
    for (var i = 0; i < items.length; i += 1) {
      rows.push((items[i].type === "Autre" && items[i].otherType ? items[i].otherType : items[i].type) + " | Quantite: " + (items[i].quantity || "") + " | BDD: " + (items[i].bdd || "") + " | TDD: " + (items[i].tdd || ""));
    }
    return rows.join("\n");
  }

  function exportProcessKpiDetails(record) {
    var items = record.processKpiDetails || [];
    var rows = [];
    for (var i = 0; i < items.length; i += 1) {
      rows.push(resolveReferenceLabel("kpiId", items[i].kpiId) + " | Frequence: " + (items[i].frequency || "") + " | Source: " + (items[i].dataSource || "") + " | Responsable organisation: " + resolveReferenceLabel("responsiblePam", items[i].responsiblePam || "") + " | Point focal partenaire: " + resolveReferenceLabel("partnerFocalPoint", items[i].partnerFocalPoint || "") + " | Commentaire: " + (items[i].comment || ""));
    }
    return rows.join("\n");
  }

  function rowsToCsv(rows) {
    var headers = Object.keys(rows[0] || {});
    var lines = [headers.map(csvEscape).join(";")];
    for (var i = 0; i < rows.length; i += 1) {
      var cells = [];
      for (var h = 0; h < headers.length; h += 1) cells.push(csvEscape(rows[i][headers[h]]));
      lines.push(cells.join(";"));
    }
    return "\uFEFFsep=;\r\n" + lines.join("\r\n");
  }

  function csvEscape(value) {
    value = String(value === undefined || value === null ? "" : value);
    if (/[;"\r\n]/.test(value)) return '"' + value.replace(/"/g, '""') + '"';
    return value;
  }

  function exportExcel(fileName, rows) {
    if (!window.XLSX) {
      window.alert("Export Excel indisponible. Verifiez la connexion internet ou choisissez CSV.");
      return;
    }
    var worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    worksheet["!cols"] = exportColumnWidths(rows);
    for (var cell in worksheet) if (Object.prototype.hasOwnProperty.call(worksheet, cell) && cell.charAt(0) !== "!") {
      worksheet[cell].s = { alignment: { wrapText: true, vertical: "top" } };
    }
    var workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registre");
    XLSX.writeFile(workbook, fileName);
  }

  function exportColumnWidths(rows) {
    var headers = Object.keys(rows[0] || {});
    var widths = [];
    for (var h = 0; h < headers.length; h += 1) {
      var max = headers[h].length;
      for (var r = 0; r < rows.length; r += 1) {
        var text = String(rows[r][headers[h]] === undefined || rows[r][headers[h]] === null ? "" : rows[r][headers[h]]);
        var lines = text.split(/\r?\n/);
        for (var l = 0; l < lines.length; l += 1) if (lines[l].length > max) max = lines[l].length;
      }
      widths.push({ wch: Math.max(12, Math.min(max + 2, 52)) });
    }
    return widths;
  }

  function downloadText(fileName, type, content) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function openBulkPlanningDialog(prefill) {
    closeBulkPlanningDialog();
    var defaults = defaultDraft("monthlyPlans");
    var editMode = !!(prefill && prefill.projectId && prefill.month);
    if (prefill) {
      defaults.projectId = prefill.projectId || defaults.projectId;
      defaults.month = prefill.month || defaults.month;
    }
    var range = monthDateRange(defaults.month);
    var overlay = document.createElement("div");
    overlay.id = "bulk-planning-dialog";
    overlay.className = "bulk-dialog";
    overlay.setAttribute("data-bulk-edit", editMode ? "1" : "0");
    overlay.innerHTML =
      '<div class="bulk-card">' +
      '<div class="bulk-header"><div><p class="eyebrow">Mise en oeuvre mensuelle</p><h2>Bulk planning des activites</h2></div><button type="button" id="bulk-close" aria-label="Fermer">X</button></div>' +
      '<div class="bulk-controls">' +
      '<label>Projet<select id="bulk-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), defaults.projectId) + '</select></label>' +
      '<label>Mois<input id="bulk-month" type="month" value="' + escapeHtml(defaults.month) + '" /></label>' +
      '<label>Date debut<input id="bulk-start" type="date" value="' + escapeHtml(range.start) + '" /></label>' +
      '<label>Date fin<input id="bulk-end" type="date" value="' + escapeHtml(range.end) + '" /></label>' +
      '<label>Point focal organisation<select id="bulk-pam">' + optionsHtml(optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }), "") + '</select></label>' +
      '<label>Point focal CP<select id="bulk-cp">' + optionsHtml(projectPartnerStaffOptions(defaults.projectId), "") + '</select></label>' +
      '</div>' +
      '<div class="bulk-toolbar"><button type="button" id="bulk-select-all">Tout cocher</button><button type="button" id="bulk-clear-all">Tout decocher</button>' + (editMode ? '<button type="button" id="bulk-delete-selected" class="danger-soft">Supprimer les lignes cochees</button>' : '') + '<span id="bulk-count"></span></div>' +
      '<div class="bulk-table-wrap"><table class="bulk-table"><thead><tr><th></th><th>Activite</th><th>Sous activite</th><th>KPI associe</th><th>Cible globale</th><th>Cibles par grant</th><th>Point focal organisation</th><th>Point focal CP</th><th>Date debut</th><th>Date fin</th></tr></thead><tbody id="bulk-rows"></tbody></table></div>' +
      '<div class="bulk-actions"><button type="button" id="bulk-cancel">Annuler</button><button type="button" class="primary-action" id="bulk-create">' + (editMode ? "Enregistrer / creer les lignes cochees" : "Creer les lignes cochees") + '</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById("bulk-close").onclick = closeBulkPlanningDialog;
    document.getElementById("bulk-cancel").onclick = closeBulkPlanningDialog;
    document.getElementById("bulk-project").onchange = function () {
      updateSelectOptions(document.getElementById("bulk-cp"), projectPartnerStaffOptions(this.value));
      renderBulkPlanningRows();
    };
    document.getElementById("bulk-month").onchange = function () {
      var nextRange = monthDateRange(this.value || currentMonthValue());
      document.getElementById("bulk-start").value = nextRange.start;
      document.getElementById("bulk-end").value = nextRange.end;
      renderBulkPlanningRows();
    };
    document.getElementById("bulk-start").onchange = applyBulkDefaultDates;
    document.getElementById("bulk-end").onchange = applyBulkDefaultDates;
    document.getElementById("bulk-pam").onchange = applyBulkDefaultFocals;
    document.getElementById("bulk-cp").onchange = applyBulkDefaultFocals;
    document.getElementById("bulk-select-all").onclick = function () { setBulkChecks(true); };
    document.getElementById("bulk-clear-all").onclick = function () { setBulkChecks(false); };
    var deleteButton = document.getElementById("bulk-delete-selected");
    if (deleteButton) deleteButton.onclick = deleteCheckedBulkPlanningRows;
    document.getElementById("bulk-create").onclick = createBulkMonthlyPlans;
    renderBulkPlanningRows();
  }

  function closeBulkPlanningDialog() {
    var existing = document.getElementById("bulk-planning-dialog");
    if (existing) existing.parentNode.removeChild(existing);
  }

  function renderBulkPlanningRows() {
    var body = document.getElementById("bulk-rows");
    if (!body) return;
    var projectId = document.getElementById("bulk-project").value;
    var rows = monthlyBulkPlanningRows(projectId);
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var editMode = isBulkPlanningEditMode();
    var pamOptions = optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; });
    var cpOptions = projectPartnerStaffOptions(projectId);
    var start = document.getElementById("bulk-start").value;
    var end = document.getElementById("bulk-end").value;
    var html = "";
    for (var i = 0; i < rows.length; i += 1) {
      var row = rows[i];
      var existing = monthlyPlanForCombination(projectId, month, row.activityId, row.subActivityId, row.kpiId);
      var disabled = row.kpiId ? "" : "disabled";
      var checked = editMode && existing ? "checked" : "";
      html += '<tr data-bulk-row data-existing-id="' + escapeHtml(existing ? recordKey(existing) : "") + '" data-activity-id="' + escapeHtml(row.activityId) + '" data-subactivity-id="' + escapeHtml(row.subActivityId || "") + '" data-kpi-id="' + escapeHtml(row.kpiId || "") + '">' +
        '<td><input name="bulk-row-check" type="checkbox" ' + checked + " " + disabled + ' /></td>' +
        '<td>' + escapeHtml(row.activityLabel) + '</td>' +
        '<td>' + escapeHtml(row.subActivityLabel || "") + '</td>' +
        '<td>' + escapeHtml(row.kpiDisplayLabel || row.kpiLabel || "Aucun KPI associe") + '</td>' +
        '<td><input name="bulk-target" type="text" value="' + escapeHtml(existing ? existing.target || "" : row.target || "") + '" ' + disabled + ' /></td>' +
        '<td>' + renderBulkPlanGrantTargets(row, disabled, existing) + '</td>' +
        '<td><select name="bulk-pam" ' + disabled + '>' + optionsHtml(pamOptions, existing ? existing.pamFocalPoint : row.pamFocalPoint || document.getElementById("bulk-pam").value) + '</select></td>' +
        '<td><select name="bulk-cp" ' + disabled + '>' + optionsHtml(cpOptions, existing ? existing.partnerFocalPoint : document.getElementById("bulk-cp").value) + '</select></td>' +
        '<td><input name="bulk-start" type="date" value="' + escapeHtml(existing ? existing.plannedStartDate || start : start) + '" ' + disabled + ' /></td>' +
        '<td><input name="bulk-end" type="date" value="' + escapeHtml(existing ? existing.plannedEndDate || end : end) + '" ' + disabled + ' /></td>' +
        '</tr>';
    }
    if (!html) html = '<tr><td colspan="10"><p class="muted">Aucune activite avec KPI associe pour ce projet.</p></td></tr>';
    body.innerHTML = html;
    wireBulkGrantTargetToggles();
    var count = document.getElementById("bulk-count");
    if (count) count.textContent = rows.length + " ligne(s) disponible(s)";
  }

  function isBulkPlanningEditMode() {
    var dialog = document.getElementById("bulk-planning-dialog");
    return !!(dialog && dialog.getAttribute("data-bulk-edit") === "1");
  }

  function monthlyBulkPlanningRows(projectId) {
    var out = [];
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      var activity = store.projectActivities[i];
      if (activity.projectId !== projectId) continue;
      var subs = projectSubActivitiesForActivityRecords(activity.id);
      if (subs.length) {
        for (var s = 0; s < subs.length; s += 1) appendBulkRowsForSubActivity(out, activity, subs[s]);
      } else {
        appendBulkRowsForKpis(out, activity, null, kpiRecordsForActivity(activity.id));
      }
    }
    return out;
  }

  function appendBulkRowsForSubActivity(out, activity, subActivity) {
    var kpis = [];
    var ids = subActivity.kpiIds || [];
    for (var i = 0; i < ids.length; i += 1) {
      var kpi = findByRecordId(store.kpis, ids[i]);
      if (kpi) kpis.push(kpi);
    }
    appendBulkRowsForKpis(out, activity, subActivity, kpis);
  }

  function appendBulkRowsForKpis(out, activity, subActivity, kpis) {
    if (!kpis.length) {
      out.push({
        activityId: activity.id,
        activityLabel: activity.id + " - " + (activity.label || ""),
        subActivityId: subActivity ? subActivity.id : "",
        subActivityLabel: subActivity ? subActivity.label || subActivity.id : "",
        kpiId: "",
        kpiLabel: "",
        target: "",
        pamFocalPoint: ""
      });
      return;
    }
    for (var i = 0; i < kpis.length; i += 1) {
      out.push({
        activityId: activity.id,
        activityLabel: activity.id + " - " + (activity.label || ""),
        subActivityId: subActivity ? subActivity.id : "",
        subActivityLabel: subActivity ? subActivity.label || subActivity.id : "",
        kpiId: kpis[i].id,
        kpiLabel: kpis[i].id + " - " + (kpis[i].label || ""),
        kpiDisplayLabel: cleanReportLabel(kpis[i].label || kpis[i].id),
        target: kpis[i].target || "",
        pamFocalPoint: kpis[i].pamOwner || ""
      });
    }
  }

  function renderBulkPlanGrantTargets(row, disabled, existingPlan) {
    if (disabled) return "";
    var options = monthlyGrantOptions({ projectId: document.getElementById("bulk-project").value, activityId: row.activityId, subActivityId: row.subActivityId, kpiId: row.kpiId });
    if (!options.length) return '<span class="muted">Aucun grant</span>';
    var targets = {};
    var existingTargets = existingPlan && existingPlan.grantTargets ? existingPlan.grantTargets : [];
    for (var t = 0; t < existingTargets.length; t += 1) targets[existingTargets[t].grantCode] = existingTargets[t].target;
    var byGrant = existingTargets.length > 0;
    var html = '<label class="mini-inline"><input type="checkbox" name="bulk-plan-by-grant" ' + (byGrant ? "checked" : "") + ' /> Planifier par grant</label>';
    html += '<div class="bulk-grant-targets"' + (byGrant ? "" : " hidden") + ">";
    for (var i = 0; i < options.length; i += 1) {
      html += '<label class="mini-inline">' + escapeHtml(options[i].label) + '<input name="bulk-grant-target" data-grant-code="' + escapeHtml(options[i].value) + '" type="number" min="0" step="0.001" value="' + escapeHtml(targets[options[i].value] || "") + '" /></label>';
    }
    html += "</div>";
    return html;
  }

  function wireBulkGrantTargetToggles() {
    var toggles = document.querySelectorAll('#bulk-rows input[name="bulk-plan-by-grant"]');
    for (var i = 0; i < toggles.length; i += 1) {
      toggles[i].onchange = function () {
        var row = this.closest("[data-bulk-row]");
        var container = row ? row.querySelector(".bulk-grant-targets") : null;
        if (!container) return;
        container.hidden = !this.checked;
        if (!this.checked) {
          var inputs = container.querySelectorAll('input[name="bulk-grant-target"]');
          for (var n = 0; n < inputs.length; n += 1) inputs[n].value = "";
        }
      };
    }
  }

  function projectSubActivitiesForActivityRecords(activityId) {
    var out = [];
    for (var i = 0; i < store.projectSubActivities.length; i += 1) {
      if (store.projectSubActivities[i].activityId === activityId) out.push(store.projectSubActivities[i]);
    }
    return out;
  }

  function kpiRecordsForActivity(activityId) {
    var out = [];
    for (var i = 0; i < store.kpis.length; i += 1) if (store.kpis[i].activityId === activityId) out.push(store.kpis[i]);
    return out;
  }

  function applyBulkDefaultDates() {
    var start = document.getElementById("bulk-start").value;
    var end = document.getElementById("bulk-end").value;
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    for (var i = 0; i < rows.length; i += 1) {
      var startInput = rows[i].querySelector('input[name="bulk-start"]');
      var endInput = rows[i].querySelector('input[name="bulk-end"]');
      if (startInput) startInput.value = start;
      if (endInput) endInput.value = end;
    }
  }

  function applyBulkDefaultFocals() {
    var pam = document.getElementById("bulk-pam").value;
    var cp = document.getElementById("bulk-cp").value;
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    for (var i = 0; i < rows.length; i += 1) {
      var pamSelect = rows[i].querySelector('select[name="bulk-pam"]');
      var cpSelect = rows[i].querySelector('select[name="bulk-cp"]');
      if (pamSelect && pam) pamSelect.value = pam;
      if (cpSelect && cp) cpSelect.value = cp;
    }
  }

  function setBulkChecks(value) {
    var checks = document.querySelectorAll('#bulk-rows input[name="bulk-row-check"]:not(:disabled)');
    for (var i = 0; i < checks.length; i += 1) checks[i].checked = value;
  }

  function createBulkMonthlyPlans() {
    var projectId = document.getElementById("bulk-project").value;
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    var created = 0;
    var updated = 0;
    var skipped = 0;
    var editMode = isBulkPlanningEditMode();
    var previousPage = state.page;
    var previousEditingId = state.editingId;
    state.page = "monthlyPlans";
    for (var i = 0; i < rows.length; i += 1) {
      var checked = rows[i].querySelector('input[name="bulk-row-check"]');
      if (!checked || !checked.checked || checked.disabled) continue;
      var existingId = rows[i].getAttribute("data-existing-id") || "";
      state.editingId = existingId;
      var record = {
        month: month,
        projectId: projectId,
        activityId: rows[i].getAttribute("data-activity-id") || "",
        subActivityId: rows[i].getAttribute("data-subactivity-id") || "",
        kpiId: rows[i].getAttribute("data-kpi-id") || "",
        target: valueFromRow(rows[i], 'input[name="bulk-target"]'),
        pamFocalPoint: valueFromRow(rows[i], 'select[name="bulk-pam"]'),
        partnerFocalPoint: valueFromRow(rows[i], 'select[name="bulk-cp"]'),
        plannedStartDate: valueFromRow(rows[i], 'input[name="bulk-start"]'),
        plannedEndDate: valueFromRow(rows[i], 'input[name="bulk-end"]'),
        localizedActivity: "Non",
        localizationLevel: "FDP",
        localizationCountry: "Cameroon",
        status: "Draft"
      };
      record.grantTargets = readBulkGrantTargets(rows[i]);
      if (record.grantTargets.length) {
        record.grantContributions = grantTargetsToContributions(record.grantTargets);
      } else {
        record.grantContributions = monthlyDefaultGrantContributions(record);
      }
      if (!existingId && monthlyPlanCombinationExists(record)) {
        skipped += 1;
        continue;
      }
      if (!validateRecordBeforeSave(record)) continue;
      prepareRecordBeforeSave(record);
      if (editMode && existingId) {
        updateRecord(store.monthlyPlans, existingId, record);
        updated += 1;
      } else {
        record.createdAt = new Date().toISOString();
        store.monthlyPlans.push(record);
        created += 1;
      }
    }
    state.page = previousPage;
    state.editingId = previousEditingId;
    if (!created && !updated && !skipped) {
      window.alert("Veuillez cocher au moins une ligne.");
      return;
    }
    closeBulkPlanningDialog();
    window.alert(created + " ligne(s) creee(s)." + (updated ? " " + updated + " ligne(s) modifiee(s)." : "") + (skipped ? " " + skipped + " ligne(s) deja existante(s) ignoree(s)." : ""));
    render();
  }

  function deleteCheckedBulkPlanningRows() {
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    var ids = [];
    for (var i = 0; i < rows.length; i += 1) {
      var check = rows[i].querySelector('input[name="bulk-row-check"]');
      var id = rows[i].getAttribute("data-existing-id") || "";
      if (check && check.checked && id) ids.push(id);
    }
    if (!ids.length) {
      window.alert("Veuillez cocher au moins une ligne deja enregistree a supprimer.");
      return;
    }
    if (window.confirm && !window.confirm("Supprimer " + ids.length + " ligne(s) de planification mensuelle ?")) return;
    for (var n = 0; n < ids.length; n += 1) removeRecord(store.monthlyPlans, ids[n]);
    saveStoredData();
    renderBulkPlanningRows();
  }

  function valueFromRow(row, selector) {
    var control = row.querySelector(selector);
    return control ? control.value : "";
  }

  function readBulkGrantTargets(row) {
    var byGrant = row.querySelector('input[name="bulk-plan-by-grant"]');
    if (!byGrant || !byGrant.checked) return [];
    var out = [];
    var inputs = row.querySelectorAll('input[name="bulk-grant-target"]');
    for (var i = 0; i < inputs.length; i += 1) {
      var value = Number(inputs[i].value || 0);
      if (value > 0) out.push({ grantCode: inputs[i].getAttribute("data-grant-code"), target: value });
    }
    return out;
  }

  function budgetGrantTargetsTotal(items) {
    var total = 0;
    for (var i = 0; i < items.length; i += 1) total += Number(items[i].target || 0);
    return Math.round(total * 1000) / 1000;
  }

  function grantTargetsToContributions(items) {
    var total = budgetGrantTargetsTotal(items);
    var out = [];
    for (var i = 0; i < items.length; i += 1) out.push({ grantCode: items[i].grantCode, contributionPercent: total ? Math.round((Number(items[i].target || 0) / total) * 100000) / 1000 : 0 });
    return out;
  }

  function monthlyDefaultGrantContributions(record) {
    var options = monthlyGrantOptions(record);
    if (!options.length) return [];
    var out = [];
    var base = Math.floor((100 / options.length) * 1000) / 1000;
    var total = 0;
    for (var i = 0; i < options.length; i += 1) {
      var percent = i === options.length - 1 ? Math.round((100 - total) * 1000) / 1000 : base;
      total += percent;
      out.push({ grantCode: options[i].value, contributionPercent: percent });
    }
    return out;
  }

  function monthlyPlanCombinationExists(record) {
    return !!monthlyPlanForCombination(record.projectId, record.month, record.activityId, record.subActivityId, record.kpiId);
  }

  function monthlyPlanForCombination(projectId, month, activityId, subActivityId, kpiId) {
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (plan.month === month && plan.projectId === projectId && plan.activityId === activityId && (plan.subActivityId || "") === (subActivityId || "") && plan.kpiId === kpiId) return plan;
    }
    return null;
  }

  function openBulkMonthlyReportsDialog() {
    var projectId = firstProjectId();
    openBulkReportDialog({
      title: "Bulk reporting quantitatif mensuel",
      mode: "monthlyReports",
      projectId: projectId,
      month: currentMonthValue(),
      headers: ["Activite / sous activite", "KPI", "Cible", "Realisation", "Commentaires"],
      footerHtml: '<fieldset class="project-sites-field bulk-global-fields"><legend>Synthese globale du rapport mensuel</legend>' +
        '<label>Contraintes / defis<textarea id="bulk-global-challenges" rows="3"></textarea></label>' +
        '<label>Actions correctives<textarea id="bulk-global-corrective-actions" rows="3"></textarea></label>' +
        '<label>Recommandations<textarea id="bulk-global-recommendations" rows="3"></textarea></label>' +
        '</fieldset>',
      renderRows: renderBulkMonthlyReportRows,
      create: createBulkMonthlyReports
    });
  }

  function openBulkMonthlyExpensesDialog() {
    openBulkReportDialog({
      title: "Bulk reporting des depenses mensuelles",
      mode: "monthlyExpenses",
      projectId: firstProjectId(),
      month: currentMonthValue(),
      headers: ["Ligne budgetaire", "Categorie", "Budget (solde)", "Description / commentaire"],
      renderRows: renderBulkMonthlyExpenseRows,
      create: createBulkMonthlyExpenses
    });
  }

  function openBulkProcessReportsDialog() {
    openBulkReportDialog({
      title: "Bulk reporting process monitoring",
      mode: "processReports",
      projectId: firstProjectId(),
      month: currentMonthValue(),
      headers: ["Indicateur process", "Cible", "Valeur observee", "Constats / commentaires"],
      renderRows: renderBulkProcessReportRows,
      create: createBulkProcessReports
    });
  }

  function openBulkReportDialog(options) {
    closeBulkPlanningDialog();
    var overlay = document.createElement("div");
    overlay.id = "bulk-planning-dialog";
    overlay.className = "bulk-dialog";
    overlay.setAttribute("data-bulk-mode", options.mode);
    overlay.innerHTML =
      '<div class="bulk-card">' +
      '<div class="bulk-header"><div><p class="eyebrow">Execution</p><h2>' + escapeHtml(options.title) + '</h2></div><button type="button" id="bulk-close" aria-label="Fermer">X</button></div>' +
      '<div class="bulk-controls bulk-controls-compact">' +
      '<label>Projet<select id="bulk-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), options.projectId) + '</select></label>' +
      '<label>Mois<input id="bulk-month" type="month" value="' + escapeHtml(options.month) + '" /></label>' +
      '<label>Rapporte par<select id="bulk-reported-by">' + optionsHtml(optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }), "") + '</select></label>' +
      '</div>' +
      '<div class="bulk-toolbar"><button type="button" id="bulk-select-all">Tout cocher</button><button type="button" id="bulk-clear-all">Tout decocher</button><span id="bulk-count"></span></div>' +
      '<div class="bulk-table-wrap"><table class="bulk-table"><thead><tr><th></th>' + options.headers.map(function (header) { return "<th>" + escapeHtml(header) + "</th>"; }).join("") + '</tr></thead><tbody id="bulk-rows"></tbody></table></div>' +
      (options.footerHtml || "") +
      '<div class="bulk-actions"><button type="button" id="bulk-cancel">Annuler</button><button type="button" class="primary-action" id="bulk-create">Creer les lignes cochees</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById("bulk-close").onclick = closeBulkPlanningDialog;
    document.getElementById("bulk-cancel").onclick = closeBulkPlanningDialog;
    document.getElementById("bulk-project").onchange = options.renderRows;
    document.getElementById("bulk-month").onchange = options.renderRows;
    document.getElementById("bulk-select-all").onclick = function () { setBulkChecks(true); };
    document.getElementById("bulk-clear-all").onclick = function () { setBulkChecks(false); };
    document.getElementById("bulk-create").onclick = options.create;
    options.renderRows();
  }

  function renderBulkMonthlyReportRows() {
    var projectId = document.getElementById("bulk-project").value;
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var rows = "";
    var count = 0;
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (plan.projectId !== projectId || plan.month !== month || reportForPlan(plan.id)) continue;
      count += 1;
      rows += '<tr data-bulk-row data-plan-id="' + escapeHtml(plan.id) + '">' +
        '<td><input type="checkbox" /></td>' +
        '<td>' + escapeHtml(activitySubActivityPlanLabel(plan)) + '</td>' +
        '<td>' + escapeHtml(kpiCleanLabel(plan.kpiId)) + '</td>' +
        '<td>' + escapeHtml(plan.target || "") + '</td>' +
        '<td>' + renderBulkReportAchievementInputs(plan) + '</td>' +
        '<td><textarea name="bulk-comment" rows="2"></textarea></td>' +
        '</tr>';
    }
    updateBulkRows(rows, count, 6, "Aucune activite/sous activite planifiee non reportee pour ce projet et ce mois.");
  }

  function kpiCleanLabel(kpiId) {
    var kpi = findByRecordId(store.kpis, kpiId);
    return kpi ? cleanReportLabel(kpi.label || kpi.id) : cleanReportLabel(kpiId);
  }

  function renderBulkReportAchievementInputs(plan) {
    var targets = plan.grantTargets || [];
    if (!targets.length) return '<input name="bulk-achieved" type="text" value="" />';
    var html = "";
    for (var i = 0; i < targets.length; i += 1) {
      html += '<label class="mini-inline">' + escapeHtml(grantLabel(targets[i].grantCode)) + ' / cible ' + escapeHtml(targets[i].target) + '<input name="bulk-achieved-grant" data-grant-code="' + escapeHtml(targets[i].grantCode) + '" type="number" min="0" step="0.001" /></label>';
    }
    return html;
  }

  function renderBulkMonthlyExpenseRows() {
    var projectId = document.getElementById("bulk-project").value;
    var grantOptions = bulkExpenseGrantOptions(projectId);
    updateBulkExpenseHeader(grantOptions);
    var rows = "";
    var count = 0;
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (line.projectId !== projectId || normalizeWorkflowStatus(line.status) !== "Validated") continue;
      var lineGrantCodes = budgetLineGrantCodes(line, projectId);
      var spent = expenseTotalForBudgetLine(line.id, { projectId: projectId });
      var budget = Number(line.amountXaf || 0);
      var balance = budget - spent;
      var grantCells = "";
      for (var g = 0; g < grantOptions.length; g += 1) {
        var code = grantOptions[g].value;
        var enabled = lineGrantCodes.indexOf(code) > -1;
        grantCells += '<td><input name="bulk-grant-amount" data-grant-code="' + escapeHtml(code) + '" type="number" min="0" step="1" value="" ' + (enabled ? "" : "disabled") + ' /></td>';
      }
      count += 1;
      rows += '<tr data-bulk-row data-budget-line-id="' + escapeHtml(line.id) + '" data-balance="' + escapeHtml(balance) + '" data-cost-category="' + escapeHtml(line.costCategory || "") + '" data-sub-category="' + escapeHtml(line.subCategory || "") + '">' +
        '<td><input type="checkbox" /></td>' +
        '<td>' + escapeHtml(line.id + " - " + (line.label || "")) + '</td>' +
        '<td>' + escapeHtml((line.costCategory || "") + (line.subCategory ? " / " + line.subCategory : "")) + '</td>' +
        '<td>' + moneyText(budget, projectCurrency(projectId)) + ' <strong>(' + moneyText(balance, projectCurrency(projectId)) + ')</strong></td>' +
        grantCells +
        '<td><textarea name="bulk-comment" rows="2"></textarea><small class="bulk-warning" hidden>Surdepense potentielle</small></td>' +
        '</tr>';
    }
    updateBulkRows(rows, count, 5 + grantOptions.length, "Aucune ligne budgetaire validee pour ce projet.");
    wireBulkExpenseWarnings();
  }

  function updateBulkExpenseHeader(grantOptions) {
    var row = document.querySelector(".bulk-table thead tr");
    if (!row) return;
    var grantHeaders = "";
    for (var i = 0; i < grantOptions.length; i += 1) grantHeaders += "<th>Montant " + escapeHtml(grantOptions[i].label) + "</th>";
    row.innerHTML = "<th></th><th>Ligne budgetaire</th><th>Categorie</th><th>Budget (solde)</th>" + grantHeaders + "<th>Description / commentaire</th>";
  }

  function bulkExpenseGrantOptions(projectId) {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (projectId && line.projectId !== projectId) continue;
      if (normalizeWorkflowStatus(line.status) !== "Validated") continue;
      var codes = budgetLineGrantCodes(line, projectId);
      for (var c = 0; c < codes.length; c += 1) if (codes[c] && !seen[codes[c]]) {
        seen[codes[c]] = true;
        out.push({ value: codes[c], label: grantLabel(codes[c]) });
      }
    }
    return out;
  }

  function renderBulkProcessReportRows() {
    var projectId = document.getElementById("bulk-project").value;
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var rows = "";
    var count = 0;
    for (var i = 0; i < store.processIndicators.length; i += 1) {
      var indicator = store.processIndicators[i];
      if (indicator.projectId !== projectId || processReportExists(indicator.id, month)) continue;
      count += 1;
      rows += '<tr data-bulk-row data-process-indicator-id="' + escapeHtml(indicator.id) + '">' +
        '<td><input type="checkbox" /></td>' +
        '<td>' + escapeHtml(indicator.id + " - " + (indicator.label || "")) + '</td>' +
        '<td>' + escapeHtml(indicator.target || "") + '</td>' +
        '<td><input name="bulk-value" type="text" value="" /></td>' +
        '<td><textarea name="bulk-comment" rows="2"></textarea></td>' +
        '</tr>';
    }
    updateBulkRows(rows, count, 5, "Aucun indicateur process non reporte pour ce projet et ce mois.");
  }

  function updateBulkRows(rows, count, colspan, emptyMessage) {
    var body = document.getElementById("bulk-rows");
    if (!body) return;
    body.innerHTML = rows || '<tr><td colspan="' + colspan + '"><p class="muted">' + escapeHtml(emptyMessage) + '</p></td></tr>';
    var countBox = document.getElementById("bulk-count");
    if (countBox) countBox.textContent = count + " ligne(s) disponible(s)";
  }

  function createBulkMonthlyReports() {
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var reportedBy = document.getElementById("bulk-reported-by").value;
    var globalChallenges = bulkGlobalValue("bulk-global-challenges");
    var globalCorrectiveActions = bulkGlobalValue("bulk-global-corrective-actions");
    var globalRecommendations = bulkGlobalValue("bulk-global-recommendations");
    var created = 0;
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    for (var i = 0; i < rows.length; i += 1) {
      if (!bulkRowChecked(rows[i])) continue;
      var plan = findByRecordId(store.monthlyPlans, rows[i].getAttribute("data-plan-id"));
      if (!plan || reportForPlan(plan.id)) continue;
      var achievementsByGrant = readBulkAchievementsByGrant(rows[i]);
      var achievedValue = achievementsByGrant.length ? budgetGrantTargetsTotal(achievementsByGrant.map(function (item) { return { target: item.achieved }; })) : valueFromRow(rows[i], 'input[name="bulk-achieved"]');
      store.monthlyReports.push({
        id: generatedMonthlyReportId(month, plan.id),
        planId: plan.id,
        projectId: plan.projectId,
        month: month,
        achieved: achievedValue,
        achievementsByGrant: achievementsByGrant,
        achievementRate: achievementRate(achievedValue, plan.target),
        narrative: valueFromRow(rows[i], 'textarea[name="bulk-comment"]'),
        challenges: globalChallenges,
        correctiveActions: globalCorrectiveActions,
        recommendations: globalRecommendations,
        evidence: "",
        reportedBy: reportedBy,
        reportDate: todayIsoDate(),
        status: "Draft",
        createdAt: new Date().toISOString()
      });
      created += 1;
    }
    finishBulkCreate(created, "reporting quantitatif");
  }

  function bulkGlobalValue(id) {
    var control = document.getElementById(id);
    return control ? control.value : "";
  }

  function readBulkAchievementsByGrant(row) {
    var out = [];
    var inputs = row.querySelectorAll('input[name="bulk-achieved-grant"]');
    for (var i = 0; i < inputs.length; i += 1) {
      var value = Number(inputs[i].value || 0);
      if (value > 0) out.push({ grantCode: inputs[i].getAttribute("data-grant-code"), achieved: value });
    }
    return out;
  }

  function createBulkMonthlyExpenses() {
    var projectId = document.getElementById("bulk-project").value;
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var validatedBy = document.getElementById("bulk-reported-by").value;
    var created = 0;
    var warnings = 0;
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    for (var i = 0; i < rows.length; i += 1) {
      if (!bulkRowChecked(rows[i])) continue;
      var line = findByRecordId(store.budgets, rows[i].getAttribute("data-budget-line-id"));
      if (!line) continue;
      var amountInputs = rows[i].querySelectorAll('input[name="bulk-grant-amount"]:not(:disabled)');
      var lineAmount = 0;
      for (var a = 0; a < amountInputs.length; a += 1) lineAmount += Number(amountInputs[a].value || 0);
      if (lineAmount <= 0) continue;
      var balance = Number(rows[i].getAttribute("data-balance") || 0);
      if (lineAmount > balance) warnings += 1;
      for (var g = 0; g < amountInputs.length; g += 1) {
        var amount = Number(amountInputs[g].value || 0);
        if (amount <= 0) continue;
        store.monthlyExpenses.push({
          id: generatedMonthlyExpenseId(month, line.id),
          month: month,
          projectId: projectId,
          budgetLineId: line.id,
          grantCode: amountInputs[g].getAttribute("data-grant-code") || "",
          costCategory: line.costCategory || "",
          subCategory: line.subCategory || "",
          amountXaf: amount,
          paidBy: "Partenaire",
          validatedBy: validatedBy,
          status: "Draft",
          comment: valueFromRow(rows[i], 'textarea[name="bulk-comment"]') + (lineAmount > balance ? " | SURDEPENSE POTENTIELLE: solde " + formatNumber(balance) + " XAF" : ""),
          createdAt: new Date().toISOString()
        });
        created += 1;
      }
    }
    finishBulkCreate(created, "depense mensuelle", warnings ? warnings + " surdepense(s) potentielle(s) signalee(s)." : "");
  }

  function createBulkProcessReports() {
    var projectId = document.getElementById("bulk-project").value;
    var month = document.getElementById("bulk-month").value || currentMonthValue();
    var reportedBy = document.getElementById("bulk-reported-by").value;
    var created = 0;
    var rows = document.querySelectorAll("#bulk-rows [data-bulk-row]");
    for (var i = 0; i < rows.length; i += 1) {
      if (!bulkRowChecked(rows[i])) continue;
      var indicatorId = rows[i].getAttribute("data-process-indicator-id");
      if (processReportExists(indicatorId, month)) continue;
      store.processReports.push({
        id: generatedProcessReportId(month, indicatorId),
        month: month,
        projectId: projectId,
        processIndicatorId: indicatorId,
        value: valueFromRow(rows[i], 'input[name="bulk-value"]'),
        findings: valueFromRow(rows[i], 'textarea[name="bulk-comment"]'),
        recommendations: "",
        evidence: "",
        reportedBy: reportedBy,
        status: "Draft",
        comment: "",
        createdAt: new Date().toISOString()
      });
      created += 1;
    }
    finishBulkCreate(created, "rapport process");
  }

  function finishBulkCreate(created, label, extra) {
    if (!created) {
      window.alert("Veuillez cocher au moins une ligne avec une valeur a enregistrer.");
      return;
    }
    closeBulkPlanningDialog();
    window.alert(created + " ligne(s) de " + label + " creee(s)." + (extra ? " " + extra : ""));
    render();
  }

  function bulkRowChecked(row) {
    var checked = row.querySelector('input[type="checkbox"]');
    return !!(checked && checked.checked);
  }

  function activitySubActivityPlanLabel(plan) {
    var activity = findByRecordId(store.projectActivities, plan.activityId);
    var label = activity ? activity.label : plan.activityId;
    if (plan.subActivityId) label += " / " + subActivityLabel(plan.subActivityId);
    return label;
  }

  function achievementRate(achieved, target) {
    var a = progressNumericValue(achieved);
    var t = progressNumericValue(target);
    return t ? Math.round((a / t) * 1000) / 10 : "";
  }

  function wireBulkExpenseWarnings() {
    var inputs = document.querySelectorAll('#bulk-rows input[name="bulk-grant-amount"]');
    for (var i = 0; i < inputs.length; i += 1) {
      inputs[i].oninput = function () {
        var row = parentByAttribute(this, "data-bulk-row");
        var warning = row ? row.querySelector(".bulk-warning") : null;
        var balance = Number(row ? row.getAttribute("data-balance") || 0 : 0);
        var rowInputs = row ? row.querySelectorAll('input[name="bulk-grant-amount"]:not(:disabled)') : [];
        var total = 0;
        for (var j = 0; j < rowInputs.length; j += 1) total += Number(rowInputs[j].value || 0);
        if (warning) warning.hidden = !(total > balance);
      };
    }
  }

  function processReportExists(indicatorId, month) {
    for (var i = 0; i < store.processReports.length; i += 1) {
      if (store.processReports[i].processIndicatorId === indicatorId && store.processReports[i].month === month) return true;
    }
    return false;
  }

  function expenseOverBudget(expense) {
    if (!expense || !expense.budgetLineId) return false;
    var line = findByRecordId(store.budgets, expense.budgetLineId);
    if (!line) return false;
    var spent = 0;
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var item = store.monthlyExpenses[i];
      if (recordKey(item) === recordKey(expense)) continue;
      if (item.budgetLineId === expense.budgetLineId) spent += Number(item.amountXaf || 0);
    }
    return spent + Number(expense.amountXaf || 0) > Number(line.amountXaf || 0);
  }

  function generatedMonthlyReportId(month, planId) {
    return "MR/" + (month || currentMonthValue()) + "/" + slugPart(planId || "PLAN");
  }

  function generatedMonthlyExpenseId(month, budgetLineId) {
    var base = "EXP/" + (month || currentMonthValue()) + "/" + slugPart(budgetLineId || "BUD");
    var next = 1;
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) if (String(store.monthlyExpenses[i].id || "").indexOf(base) === 0) next += 1;
    return base + "/" + pad3(next);
  }

  function generatedProcessReportId(month, indicatorId) {
    return "PMR/" + (month || currentMonthValue()) + "/" + slugPart(indicatorId || "PMI");
  }

  function handleImportFile(config, file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var records = isExcelFile(file.name) ? parseExcelRecords(reader.result, file.name) : parseImportRecords(String(reader.result || ""), file.name);
        var result = importRecords(config, records);
        window.alert(result.imported + " ligne(s) importee(s)." + (result.skipped ? " " + result.skipped + " ligne(s) ignoree(s): cle deja existante." : ""));
        render();
      } catch (error) {
        window.alert("Import impossible: " + error.message);
      }
    };
    reader.onerror = function () {
      window.alert("Import impossible: le fichier ne peut pas etre lu.");
    };
    if (isExcelFile(file.name)) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  }

  function isExcelFile(fileName) {
    return /\.(xlsx|xls|xlsm)$/i.test(fileName || "");
  }

  function parseExcelRecords(buffer, fileName) {
    if (!window.XLSX) throw new Error("la lecture Excel n'est pas disponible. Verifiez la connexion internet ou importez le fichier en CSV.");
    var workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    var sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error("le fichier Excel ne contient aucune feuille.");
    var rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    if (!rows.length) throw new Error("la premiere feuille Excel ne contient aucune ligne exploitable.");
    return rows;
  }

  function parseImportRecords(text, fileName) {
    var trimmed = text.trim();
    if (!trimmed) throw new Error("le fichier est vide.");
    if (/\.json$/i.test(fileName) || trimmed.charAt(0) === "[") {
      var parsed = JSON.parse(trimmed);
      if (Object.prototype.toString.call(parsed) !== "[object Array]") throw new Error("le JSON doit contenir une liste d'objets.");
      return parsed;
    }
    return csvToRecords(trimmed);
  }

  function csvToRecords(text) {
    var csv = normalizeCsvText(text);
    var delimiter = csv.delimiter || detectCsvDelimiter(csv.text);
    text = csv.text;
    var rows = parseCsv(text, delimiter);
    if (rows.length < 2) throw new Error("le CSV doit contenir une ligne d'en-tete et au moins une ligne de donnees.");
    var headers = rows[0];
    var records = [];
    for (var r = 1; r < rows.length; r += 1) {
      var empty = true;
      var record = {};
      for (var c = 0; c < headers.length; c += 1) {
        var value = rows[r][c] || "";
        if (value !== "") empty = false;
        record[headers[c]] = value;
      }
      if (!empty) records.push(record);
    }
    return records;
  }

  function normalizeCsvText(text) {
    var clean = text.replace(/^\uFEFF/, "");
    var lines = clean.split(/\r?\n/);
    var firstLine = lines[0] || "";
    var match = firstLine.match(/^sep=(.)\s*$/i);
    if (match) return { text: lines.slice(1).join("\n"), delimiter: match[1] };
    return { text: clean, delimiter: "" };
  }

  function detectCsvDelimiter(text) {
    var firstLine = text.split(/\r?\n/)[0] || "";
    var commas = (firstLine.match(/,/g) || []).length;
    var semicolons = (firstLine.match(/;/g) || []).length;
    return semicolons > commas ? ";" : ",";
  }

  function parseCsv(text, delimiter) {
    var rows = [];
    var row = [];
    var value = "";
    var quoted = false;
    for (var i = 0; i < text.length; i += 1) {
      var char = text.charAt(i);
      var next = text.charAt(i + 1);
      if (char === '"' && quoted && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(value.trim());
        value = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(value.trim());
        rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }
    row.push(value.trim());
    rows.push(row);
    return rows;
  }

  function importRecords(config, records) {
    if (!records.length) throw new Error("aucune ligne exploitable.");
    var fieldMap = importFieldMap(config);
    var imported = 0;
    var skipped = 0;
    var previousEditingId = state.editingId;
    state.editingId = "";
    try {
      for (var i = 0; i < records.length; i += 1) {
        var record = normalizeImportedRecord(config, records[i], fieldMap);
        if (!validateRecordBeforeSave(record)) throw new Error("ligne " + (i + 1) + ": dates invalides.");
        prepareRecordBeforeSave(record);
        if (recordKey(record) && importKeyExists(recordKey(record))) {
          skipped += 1;
          continue;
        }
        record.createdAt = new Date().toISOString();
        store[state.page].push(record);
        imported += 1;
      }
    } finally {
      state.editingId = previousEditingId;
    }
    if (!imported && skipped) throw new Error("toutes les lignes existent deja dans ce registre.");
    return { imported: imported, skipped: skipped };
  }

  function importFieldMap(config) {
    var map = {};
    for (var i = 0; i < config.fields.length; i += 1) {
      map[normalizeImportName(config.fields[i].name)] = config.fields[i];
      map[normalizeImportName(config.fields[i].label)] = config.fields[i];
    }
    map[normalizeImportName("status")] = { name: "status", label: "Status", type: "text" };
    map[normalizeImportName("statut")] = { name: "status", label: "Statut", type: "text" };
    return map;
  }

  function normalizeImportedRecord(config, source, fieldMap) {
    var record = defaultDraft(state.page);
    var keys = Object.keys(source);
    for (var i = 0; i < keys.length; i += 1) {
      var sourceKey = keys[i];
      var field = fieldMap[normalizeImportName(sourceKey)];
      if (!field) throw new Error('le champ "' + sourceKey + '" ne correspond pas au registre actif.');
      record[field.name] = normalizeImportedValue(field, source[sourceKey]);
    }
    validateRequiredImportFields(config, record);
    return record;
  }

  function normalizeImportedValue(field, value) {
    if (value === undefined || value === null) return "";
    if (field.type === "date" && Object.prototype.toString.call(value) === "[object Date]") return isoDateFromDate(value);
    if (field.type === "number") return value === "" ? "" : Number(value);
    if (field.type === "multi") {
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return String(value).split(/[;,]/).map(function (item) { return item.trim(); }).filter(Boolean);
    }
    if (field.type === "hgsfApplicableDays") {
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return String(value).split(/[;,]/).map(function (item) { return item.trim(); }).filter(Boolean);
    }
    if (field.type === "hgsfMenuItems" || field.type === "hgsfEstimationRows" || field.type === "hgsfIngredientPrices" || field.type === "hgsfPurchaseOrderLines" || field.type === "rationItems" || field.type === "needCommodityPercents" || field.type === "needBeneficiaryRows" || field.type === "distributionLines" || field.type === "nfiInventoryItems" || field.type === "partnerInvoiceAmounts") {
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return value ? JSON.parse(value) : [];
    }
    if (field.type === "foodItems" || field.type === "projectFdps" || field.type === "projectPartnerStaff") {
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return value ? JSON.parse(value) : [];
    }
    if (field.type === "monthlyGrantContributions") {
      if (Object.prototype.toString.call(value) === "[object Array]") return value;
      return value ? JSON.parse(value) : [];
    }
    return String(value).trim();
  }

  function isoDateFromDate(value) {
    var month = String(value.getMonth() + 1);
    var day = String(value.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return value.getFullYear() + "-" + month + "-" + day;
  }

  function validateRequiredImportFields(config, record) {
    for (var i = 0; i < config.fields.length; i += 1) {
      var field = config.fields[i];
      if (!field.required || isGeneratedIdField(field.name)) continue;
      var value = record[field.name];
      if (value === undefined || value === "" || (Object.prototype.toString.call(value) === "[object Array]" && !value.length)) throw new Error('le champ obligatoire "' + field.name + '" est manquant.');
    }
  }

  function isGeneratedIdField(name) {
    return name === "id" && (state.page === "sites" || state.page === "fieldOffices" || state.page === "fdps" || state.page === "cooperativePartners" || state.page === "strategicDocuments" || state.page === "hgsfIngredients" || state.page === "hgsfMenus" || state.page === "hgsfSchoolMenus" || state.page === "hgsfEstimations" || state.page === "hgsfPurchaseOrders" || state.page === "hgsfDeliveries" || state.page === "hgsfDeliveryInvoices" || state.page === "hgsfInvoicePayments" || state.page === "hgsfSchoolCoopPayments" || state.page === "assistanceRations" || state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds" || state.page === "stakeholders" || state.page === "partnerStaffs" || state.page === "projectActivities" || state.page === "projectSubActivities" || state.page === "kpis" || state.page === "budgets" || state.page === "grantInKinds" || state.page === "monthlyPlans" || state.page === "recommendations" || state.page === "distributionReports" || state.page === "nfis" || state.page === "nfiDistributions" || state.page === "nfiInventories" || state.page === "partnerInvoicePayments");
  }

  function importKeyExists(key) {
    var items = store[state.page] || [];
    for (var i = 0; i < items.length; i += 1) if (recordKey(items[i]) === key) return true;
    return false;
  }

  function normalizeImportName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function renderFilters(config) {
    removeFilters();
    var showMonth = hasField(config, "month");
    var showStatus = hasField(config, "status") || workflowPage(state.page);
    var showGrantStatus = state.page === "grants";
    var showStaffFilters = state.page === "staffs";
    var showFdpFilters = state.page === "fdps";
    var showActivityFilters = state.page === "projectActivities";
    var showKpiFilters = state.page === "kpis";
    var showBudgetFilters = state.page === "budgets";
    var showSubActivityFilters = state.page === "projectSubActivities";
    var showStakeholderFilters = state.page === "stakeholders";
    var showMonthlyPlanFilters = state.page === "monthlyPlans";
    var showProcessIndicatorFilters = state.page === "processIndicators";
    var showExecutionProjectFilters = state.page === "monthlyReports" || state.page === "monthlyExpenses";
    var genericFilterHtml = genericRegisterFilterHtml(config);
    if (!showMonth && !showStatus && !showGrantStatus && !showStaffFilters && !showFdpFilters && !showActivityFilters && !showKpiFilters && !showBudgetFilters && !showSubActivityFilters && !showStakeholderFilters && !showMonthlyPlanFilters && !showProcessIndicatorFilters && !showExecutionProjectFilters && !genericFilterHtml) return;
    var showRecommendationFilters = state.page === "recommendations";
    var statusFilterLabel = showRecommendationFilters ? "Statut workflow" : "Statut";
    var holder = document.createElement("div");
    holder.id = "register-filters";
    holder.className = "register-filters";
    holder.innerHTML = (showMonth ? '<label>Mois<input id="filter-month" type="month" /></label>' : "") + (showStatus ? '<label>' + statusFilterLabel + '<select id="filter-status">' + statusFilterOptions() + "</select></label>" : "") + genericFilterHtml + (showExecutionProjectFilters ? '<label>Projet<select id="filter-execution-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label>' : "") + (showRecommendationFilters ? '<label>Projet<select id="filter-recommendation-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Status recommandation<select id="filter-recommendation-status"><option value="">Tous</option><option>Not started</option><option>Ongoing</option><option>Completed</option></select></label>' : "") + (showGrantStatus ? '<label>Actif/Inactif<select id="filter-grant-status"><option value="">Tous</option><option>Actif</option><option>Inactif</option></select></label><label>Modalite<select id="filter-grant-modality"><option value="">Toutes</option><option>Cash</option><option>Vivre</option><option>Capacity Strengthening</option><option>Technical service</option></select></label><label>TDD<input id="filter-grant-tdd" type="date" /></label>' : "") + (showStaffFilters ? '<label>Sexe<select id="filter-staff-sex"><option value="">Tous</option><option>Female</option><option>Male</option><option>Other / prefer not to say</option></select></label><label>Office in charge<select id="filter-staff-fo">' + optionsHtml(optionPairs(store.fieldOffices, "id", "name"), "") + '</select></label><label>Staff Status<select id="filter-staff-status"><option value="">Tous</option><option>Actif</option><option>Inactif</option></select></label><label>Reports To<select id="filter-staff-reports">' + optionsHtml(optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }), "") + "</select></label>" : "") + (showFdpFilters ? '<label>FDP Type<select id="filter-fdp-type"><option value="">Tous</option><option>Communautaire</option><option>Ecole</option><option>FOSA</option><option>Autre</option></select></label><label>Arrondissement<select id="filter-fdp-arrondissement">' + optionsHtml(arrondissementOptions(), "") + '</select></label><label>Site Focal Point Sex<select id="filter-fdp-sex"><option value="">Tous</option><option>Female</option><option>Male</option><option>Other / prefer not to say</option></select></label>' : "") + (showStakeholderFilters ? '<label>Projet<select id="filter-stakeholder-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Type<select id="filter-stakeholder-type">' + optionsHtml(stakeholderTypeOptions(), "") + '</select></label><label>FDP rattache<select id="filter-stakeholder-fdp">' + optionsHtml(optionPairs(store.fdps, "id", fdpLabel), "") + '</select></label>' : "") + (showActivityFilters ? '<label>Project Id<select id="filter-activity-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Modalite<select id="filter-activity-modality"><option value="">Toutes</option><option>Cash</option><option>Vivre</option><option>Capacity Strengthening</option><option>Technical service</option></select></label><label>Grants rattaches<select id="filter-activity-grant">' + optionsHtml(allGrantOptions(), "") + '</select></label><label>Start Date<input id="filter-activity-start" type="date" /></label><label>End Date<input id="filter-activity-end" type="date" /></label>' : "") + (showMonthlyPlanFilters ? '<label>ID Projet<select id="filter-monthly-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Activite<select id="filter-monthly-activity">' + optionsHtml(projectActivitiesForProject(""), "") + '</select></label>' : "") + (showProcessIndicatorFilters ? '<label>ID Projet<select id="filter-process-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label>' : "") + (showKpiFilters ? '<label>Project Id<select id="filter-kpi-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Activity Id<select id="filter-kpi-activity">' + optionsHtml(optionPairs(store.projectActivities, "id", "label"), "") + '</select></label><label>Owner<select id="filter-kpi-owner">' + optionsHtml(optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }), "") + '</select></label><label>Frequence de collecte<select id="filter-kpi-frequency"><option value="">Toutes</option><option>Journaliere</option><option>Hebdomadaire</option><option>Mensuelle</option><option>Trimestrielle</option><option>Semestrielle</option><option>Anuelle</option><option>Autre</option></select></label>' : "") + (showSubActivityFilters ? '<label>Project Id<select id="filter-subactivity-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Activity Id<select id="filter-subactivity-activity">' + optionsHtml(optionPairs(store.projectActivities, "id", "label"), "") + '</select></label>' : "") + (showBudgetFilters ? '<label>ID Projet<select id="filter-budget-project">' + optionsHtml(optionPairs(store.projects, "id", "title"), "") + '</select></label><label>Grant rattache<select id="filter-budget-grant">' + optionsHtml(allGrantOptions(), "") + '</select></label><label>Partenaire<select id="filter-budget-partner">' + optionsHtml(optionPairs(store.partners, "vendor", "name"), "") + '</select></label><label>Cost Category<select id="filter-budget-category">' + optionsHtml(Object.keys(costSubCategories), "") + '</select></label><label>Sous categorie<select id="filter-budget-subcategory">' + optionsHtml(allBudgetSubCategories(), "") + '</select></label><div class="filter-total"><span>Budget total</span><strong id="budget-filter-total">0</strong></div><div class="filter-total"><span>Contribution CP <em id="budget-cp-percent">(0%)</em></span><strong id="budget-cp-total">0</strong></div><div class="filter-total"><span>Grand budget total</span><strong id="budget-grand-total">0</strong></div>' : "") + '<button type="button" id="clear-filters">Effacer filtres</button>';
    elements.tableTitle.parentNode.parentNode.appendChild(holder);
    var month = document.getElementById("filter-month");
    var status = document.getElementById("filter-status");
    var executionProject = document.getElementById("filter-execution-project");
    var recommendationProject = document.getElementById("filter-recommendation-project");
    var recommendationStatus = document.getElementById("filter-recommendation-status");
    var grantStatus = document.getElementById("filter-grant-status");
    var grantModality = document.getElementById("filter-grant-modality");
    var grantTdd = document.getElementById("filter-grant-tdd");
    var staffSex = document.getElementById("filter-staff-sex");
    var staffFo = document.getElementById("filter-staff-fo");
    var staffStatus = document.getElementById("filter-staff-status");
    var staffReports = document.getElementById("filter-staff-reports");
    var fdpType = document.getElementById("filter-fdp-type");
    var fdpArrondissement = document.getElementById("filter-fdp-arrondissement");
    var fdpSex = document.getElementById("filter-fdp-sex");
    var stakeholderProject = document.getElementById("filter-stakeholder-project");
    var stakeholderType = document.getElementById("filter-stakeholder-type");
    var stakeholderFdp = document.getElementById("filter-stakeholder-fdp");
    var activityProject = document.getElementById("filter-activity-project");
    var activityModality = document.getElementById("filter-activity-modality");
    var activityGrant = document.getElementById("filter-activity-grant");
    var activityStart = document.getElementById("filter-activity-start");
    var activityEnd = document.getElementById("filter-activity-end");
    var monthlyProject = document.getElementById("filter-monthly-project");
    var monthlyActivity = document.getElementById("filter-monthly-activity");
    var processProject = document.getElementById("filter-process-project");
    var kpiProject = document.getElementById("filter-kpi-project");
    var kpiActivity = document.getElementById("filter-kpi-activity");
    var kpiOwner = document.getElementById("filter-kpi-owner");
    var kpiFrequency = document.getElementById("filter-kpi-frequency");
    var subActivityProject = document.getElementById("filter-subactivity-project");
    var subActivityActivity = document.getElementById("filter-subactivity-activity");
    var budgetProject = document.getElementById("filter-budget-project");
    var budgetGrant = document.getElementById("filter-budget-grant");
    var budgetPartner = document.getElementById("filter-budget-partner");
    var budgetCategory = document.getElementById("filter-budget-category");
    var budgetSubCategory = document.getElementById("filter-budget-subcategory");
    var genericFilters = document.querySelectorAll(".generic-register-filter");
    applyContextProjectToFilterControls();
    for (var gf = 0; gf < genericFilters.length; gf += 1) genericFilters[gf].onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (month) month.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (status) status.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (executionProject) executionProject.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (recommendationProject) recommendationProject.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (recommendationStatus) recommendationStatus.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (grantStatus) grantStatus.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (grantModality) grantModality.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (grantTdd) grantTdd.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (staffSex) staffSex.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (staffFo) staffFo.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (staffStatus) staffStatus.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (staffReports) staffReports.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (fdpType) fdpType.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (fdpArrondissement) fdpArrondissement.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (fdpSex) fdpSex.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (stakeholderProject) stakeholderProject.onchange = function () {
      updateStakeholderFdpFilter();
      renderTable(config, filteredRecords(state.page));
    };
    if (stakeholderType) stakeholderType.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (stakeholderFdp) stakeholderFdp.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (activityProject) activityProject.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (activityModality) activityModality.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (activityGrant) activityGrant.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (activityStart) activityStart.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (activityEnd) activityEnd.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (monthlyProject) monthlyProject.onchange = function () {
      updateMonthlyActivityFilter();
      renderTable(config, filteredRecords(state.page));
    };
    if (monthlyActivity) monthlyActivity.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (processProject) processProject.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (kpiProject) kpiProject.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (kpiActivity) kpiActivity.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (kpiOwner) kpiOwner.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (kpiFrequency) kpiFrequency.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (subActivityProject) subActivityProject.onchange = function () {
      updateSubActivityActivityFilter();
      renderTable(config, filteredRecords(state.page));
    };
    if (subActivityActivity) subActivityActivity.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (budgetProject) budgetProject.onchange = function () {
      updateBudgetDependentFilters();
      renderTable(config, filteredRecords(state.page));
    };
    if (budgetGrant) budgetGrant.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (budgetPartner) budgetPartner.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    if (budgetCategory) budgetCategory.onchange = function () {
      updateBudgetSubCategoryFilter();
      renderTable(config, filteredRecords(state.page));
    };
    if (budgetSubCategory) budgetSubCategory.onchange = function () { renderTable(config, filteredRecords(state.page)); };
    document.getElementById("clear-filters").onclick = function () {
      if (month) month.value = "";
      if (status) status.value = "";
      if (executionProject) executionProject.value = "";
      if (recommendationProject) recommendationProject.value = "";
      if (recommendationStatus) recommendationStatus.value = "";
      if (grantStatus) grantStatus.value = "";
      if (grantModality) grantModality.value = "";
      if (grantTdd) grantTdd.value = "";
      if (staffSex) staffSex.value = "";
      if (staffFo) staffFo.value = "";
      if (staffStatus) staffStatus.value = "";
      if (staffReports) staffReports.value = "";
      if (fdpType) fdpType.value = "";
      if (fdpArrondissement) fdpArrondissement.value = "";
      if (fdpSex) fdpSex.value = "";
      if (stakeholderProject) stakeholderProject.value = "";
      if (stakeholderType) stakeholderType.value = "";
      if (stakeholderFdp) stakeholderFdp.value = "";
      updateStakeholderFdpFilter();
      if (activityProject) activityProject.value = "";
      if (activityModality) activityModality.value = "";
      if (activityGrant) activityGrant.value = "";
      if (activityStart) activityStart.value = "";
      if (activityEnd) activityEnd.value = "";
      if (monthlyProject) monthlyProject.value = "";
      if (monthlyActivity) monthlyActivity.value = "";
      updateMonthlyActivityFilter();
      if (processProject) processProject.value = "";
      if (kpiProject) kpiProject.value = "";
      if (kpiActivity) kpiActivity.value = "";
      if (kpiOwner) kpiOwner.value = "";
      if (kpiFrequency) kpiFrequency.value = "";
      if (subActivityProject) subActivityProject.value = "";
      if (subActivityActivity) subActivityActivity.value = "";
      updateSubActivityActivityFilter();
      if (budgetProject) budgetProject.value = "";
      if (budgetGrant) budgetGrant.value = "";
      if (budgetPartner) budgetPartner.value = "";
      if (budgetCategory) budgetCategory.value = "";
      if (budgetSubCategory) budgetSubCategory.value = "";
      for (var gfc = 0; gfc < genericFilters.length; gfc += 1) genericFilters[gfc].value = "";
      updateBudgetDependentFilters();
      applyContextProjectToFilterControls();
      renderTable(config, filteredRecords(state.page));
    };
  }

  function removeFilters() {
    var existing = document.getElementById("register-filters");
    if (existing) existing.parentNode.removeChild(existing);
  }

  function genericRegisterFilterHtml(config) {
    var fields = genericRegisterFilterFields(config);
    var html = "";
    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i];
      if (field === "month") html += '<label>Mois<input class="generic-register-filter" data-generic-field="month" type="month" /></label>';
      else html += '<label>' + escapeHtml(labelize(field)) + '<select class="generic-register-filter" data-generic-field="' + escapeHtml(field) + '">' + optionsHtml(genericFilterOptions(field), "") + '</select></label>';
    }
    return html;
  }

  function genericRegisterFilterFields(config) {
    if (!config) return [];
    var present = {};
    var fields = config.fields || [];
    for (var i = 0; i < fields.length; i += 1) present[fields[i].name] = true;
    var columns = config.columns || [];
    for (var c = 0; c < columns.length; c += 1) present[columns[c]] = true;
    var excluded = specificFilterFieldsForPage(state.page);
    var candidates = ["projectId", "month", "fieldOfficeId", "partnerVendor", "invoiceId", "invoiceSystemId", "grantCode", "grantCodes", "fdpId", "fdpIds", "country", "region", "department", "arrondissement", "officeType", "nature", "type", "modality", "costCategory", "subCategory", "staffStatus"];
    var out = [];
    for (var j = 0; j < candidates.length; j += 1) {
      var name = candidates[j];
      if (!present[name] || excluded[name]) continue;
      out.push(name);
      if (out.length >= 4) break;
    }
    return out;
  }

  function specificFilterFieldsForPage(pageId) {
    var map = {
      grants: { grantStatus: true, grantModality: true },
      staffs: { sex: true, fieldOfficeId: true, staffStatus: true, reportsTo: true },
      fdps: { fdpType: true, arrondissement: true, siteFocalPointSex: true },
      stakeholders: { projectId: true, type: true, fdpIds: true },
      portfolios: { strategicDocumentId: true, ownerId: true, priority: true },
      programmes: { portfolioId: true, strategicDocumentId: true, managerId: true },
      implementationPlans: { projectId: true, planType: true, ownerId: true },
      communicationPlans: { projectId: true, messageType: true, channel: true, ownerId: true },
      procurementPlans: { projectId: true, procurementMethod: true, ownerId: true },
      riskRegisters: { projectId: true, riskCategory: true, probability: true, impact: true, responseStrategy: true, riskStatus: true },
      qualityPlans: { projectId: true, controlMethod: true, ownerId: true },
      resourcePlans: { projectId: true, resourceType: true, ownerId: true },
      projectActivities: { projectId: true, modality: true, grantCodes: true, startDate: true, endDate: true },
      monthlyPlans: { projectId: true, activityId: true, month: true },
      processIndicators: { projectId: true },
      kpis: { projectId: true, activityId: true, pamOwner: true, frequency: true },
      projectSubActivities: { projectId: true, activityId: true },
      budgets: { projectId: true, grantCodes: true, partnerVendor: true, costCategory: true, subCategory: true },
      recommendations: { projectId: true, recommendationStatus: true },
      monthlyReports: { projectId: true, month: true },
      monthlyExpenses: { projectId: true, month: true }
    };
    var base = map[pageId] || {};
    base.status = true;
    return base;
  }

  function genericFilterOptions(field) {
    if (field === "projectId") return optionPairs(store.projects, "id", "title");
    if (field === "portfolioId") return optionPairs(store.portfolios, "id", "title");
    if (field === "programmeId") return optionPairs(store.programmes, "id", "title");
    if (field === "ownerId" || field === "managerId") return optionPairs(store.staffs, "id", staffFullName);
    if (field === "strategicDocumentId") return optionPairs(store.strategicDocuments, "id", "name");
    if (field === "fieldOfficeId") return optionPairs(store.fieldOffices, "id", "name");
    if (field === "partnerVendor") return optionPairs(store.partners, "vendor", "name");
    if (field === "invoiceId") return optionPairs(store.partnerInvoices, "id", function (inv) { return inv.id; });
    if (field === "invoiceSystemId") return savedInvoiceOptionsForProject(state.contextProjectId || "");
    if (field === "grantCode" || field === "grantCodes") return allGrantOptions();
    if (field === "fdpId" || field === "fdpIds") return optionPairs(store.fdps, "id", fdpLabel);
    if (field === "country") return contextCountryOptions();
    if (field === "region") return regionOptions({ country: state.contextCountry || "Cameroon" });
    if (field === "department") return departmentOptions({ country: state.contextCountry || "Cameroon" });
    if (field === "arrondissement") return arrondissementOptions();
    if (field === "costCategory") return Object.keys(costSubCategories);
    if (field === "subCategory") return allBudgetSubCategories();
    return uniqueFieldOptions(state.page, field);
  }

  function uniqueFieldOptions(pageId, field) {
    var seen = {};
    var out = [];
    var records = store[pageId] || [];
    for (var i = 0; i < records.length; i += 1) {
      var value = records[i][field];
      if (Object.prototype.toString.call(value) === "[object Array]") continue;
      if (value === undefined || value === null || value === "" || seen[value]) continue;
      seen[value] = true;
      out.push({ value: value, label: resolveReferenceLabel(field, value) || value });
    }
    return out;
  }

  function applyContextProjectToFilterControls() {
    if (!state.contextProjectId || !state.workspaceBackPage) return;
    var ids = [
      "filter-execution-project",
      "filter-recommendation-project",
      "filter-stakeholder-project",
      "filter-activity-project",
      "filter-monthly-project",
      "filter-process-project",
      "filter-kpi-project",
      "filter-subactivity-project",
      "filter-budget-project"
    ];
    for (var i = 0; i < ids.length; i += 1) {
      var control = document.getElementById(ids[i]);
      if (!control) continue;
      control.value = state.contextProjectId;
      control.disabled = true;
      control.className = (control.className ? control.className + " " : "") + "context-project-filter";
    }
    updateMonthlyActivityFilter();
    updateSubActivityActivityFilter();
    updateStakeholderFdpFilter();
    updateBudgetDependentFilters();
  }

  function updateBudgetSubCategoryFilter() {
    var category = document.getElementById("filter-budget-category");
    var project = document.getElementById("filter-budget-project");
    var subCategory = document.getElementById("filter-budget-subcategory");
    if (!subCategory) return;
    var options = budgetSubCategoriesForFilter(category ? category.value : "", project ? project.value : "");
    updateSelectOptions(subCategory, options);
  }

  function updateSubActivityActivityFilter() {
    var project = document.getElementById("filter-subactivity-project");
    var activity = document.getElementById("filter-subactivity-activity");
    if (!activity) return;
    updateSelectOptions(activity, projectActivitiesForProject(project ? project.value : ""));
  }

  function updateMonthlyActivityFilter() {
    var project = document.getElementById("filter-monthly-project");
    var activity = document.getElementById("filter-monthly-activity");
    if (!activity) return;
    updateSelectOptions(activity, projectActivitiesForProject(project ? project.value : ""));
  }

  function updateStakeholderFdpFilter() {
    var project = document.getElementById("filter-stakeholder-project");
    var fdp = document.getElementById("filter-stakeholder-fdp");
    if (!fdp) return;
    updateSelectOptions(fdp, project ? stakeholderFdpFilterOptions(project.value) : optionPairs(store.fdps, "id", fdpLabel));
  }

  function updateBudgetDependentFilters() {
    var project = document.getElementById("filter-budget-project");
    var grant = document.getElementById("filter-budget-grant");
    var partner = document.getElementById("filter-budget-partner");
    var category = document.getElementById("filter-budget-category");
    var projectId = project ? project.value : "";
    updateSelectOptions(grant, budgetGrantOptionsForFilter(projectId));
    updateSelectOptions(partner, budgetPartnerOptionsForFilter(projectId));
    updateSelectOptions(category, budgetCategoryOptionsForFilter(projectId));
    updateBudgetSubCategoryFilter();
  }

  function updateSelectOptions(control, options) {
    if (!control) return;
    var selected = control.value;
    control.innerHTML = optionsHtml(options, selected);
    var values = normalizeOptions(options || []).map(function (option) { return String(option.value); });
    if (selected && values.indexOf(selected) < 0) control.value = "";
  }

  function statusFilterOptions() {
    var statuses = workflowPage(state.page) ? ["Draft", "Submitted", "Verified", "Validated", "Returned"] : ["Draft", "Submitted", "Reviewed", "Approved", "Returned", "Validated", "Rejected", "Paid"];
    var html = '<option value="">Tous</option>';
    for (var i = 0; i < statuses.length; i += 1) html += "<option>" + statuses[i] + "</option>";
    return html;
  }

  function wireForm(config) {
    elements.form.onchange = function (event) {
      var target = event.target || event.srcElement;
      if (state.page === "hgsfEstimations" && target && target.name === "schoolRows-school") {
        updateHgsfEstimationRowMenuOptions(target);
        return;
      }
      if (state.page === "hgsfEstimations" && target && target.name === "periodType") setHgsfCoveredDaysDefault();
      if ((state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds") && target && target.name === "periodType") setNeedCoveredDaysDefault();
      if (state.page === "hgsfEstimations" && target && target.name === "applicableDays") return;
      if (target && (target.tagName === "SELECT" || target.type === "checkbox" || target.type === "search" || (state.page === "hgsfEstimations" && target.name === "periodValue"))) refreshDependentFields(config);
      if (state.page === "sites") updateGeneratedSiteId();
      if (state.page === "fieldOffices") updateGeneratedFieldOfficeId();
      if (state.page === "fdps") updateGeneratedFdpId();
      if (state.page === "cooperativePartners") updateGeneratedCooperativePartnerId();
      if (state.page === "stakeholders") updateGeneratedStakeholderId();
      if (state.page === "partnerStaffs") updateGeneratedPartnerStaffId();
      if (state.page === "partnerStaffs" && target && target.name === "projectId") updatePartnerStaffProjectDefaults();
      if (state.page === "projectActivities") updateGeneratedActivityId();
      if (state.page === "projectActivities") updateActivityFocalContact();
      if (state.page === "projectSubActivities") updateGeneratedSubActivityId();
      if (state.page === "kpis") updateGeneratedKpiId();
      if (state.page === "processIndicators") updateGeneratedProcessIndicatorId();
      if (state.page === "budgets") updateGeneratedBudgetId();
      if (state.page === "budgets" && target && target.name === "projectId") updateBudgetPartnerFromProject();
      if (state.page === "grantInKinds") updateGeneratedGrantInKindId();
      if (state.page === "recommendations") updateGeneratedRecommendationId();
      if (state.page === "partnerInvoices") syncPartnerInvoiceTotal();
      if (state.page === "partnerInvoicePayments") syncPartnerInvoicePaymentFields();
    };
    elements.form.oninput = function (event) {
      var target = event.target || event.srcElement;
      if (state.page === "monthlyPlans" && target && target.name === "month") {
        updateGeneratedMonthlyPlanId();
        updateMonthlyPlanDatesFromMonth();
      }
      if (state.page === "hgsfPurchaseOrders" && target && target.name === "orderLines-quantity") updateHgsfOrderLineCost(target);
      if (state.page === "partnerInvoices" && target && target.name === "activityGrantAmounts-amount") syncPartnerInvoiceTotal();
      if (state.page === "partnerInvoicePayments" && target.name === "amountPaidXaf") syncPartnerInvoicePaymentFields();
    };
    elements.form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      event.returnValue = false;
      var record = readForm(config, false);
      if (state.page === "processIndicators" && !state.editingId) {
        saveProcessIndicatorsFromSelection(record);
        return false;
      }
      if (!state.editingId && !userCanCreatePage(state.page)) {
        window.alert("Votre niveau d'acces ne permet pas de creer un enregistrement dans ce module.");
        return false;
      }
      if (state.editingId) {
        var existing = findByRecordId(store[state.page] || [], state.editingId);
        if (existing && !userCanWorkflowAction(existing, "edit")) {
          window.alert("Votre niveau d'acces ne permet pas de modifier cet enregistrement.");
          return false;
        }
      }
      if (!validateRecordBeforeSave(record)) return false;
      prepareRecordBeforeSave(record);
      if (!uniqueRecordKey(record)) return false;
      if (state.editingId) {
        updateRecord(store[state.page], state.editingId, record);
        state.editingId = "";
      } else {
        store[state.page].push(record);
      }
      state.formOpen = false;
      elements.form.reset();
      render();
      return false;
    };
    wireSearchableMultis();
    wireSelectAllButtons();
    wireProjectFdpFilter();
    wireMonthlyGrantContributions();
    wireHgsfMenuItemAddButtons();
    wireRationItemAddButtons();
    wireHgsfEstimationRowButtons();
    wireHgsfDaysSyncButton();
    syncPartnerInvoiceTotal();
    syncPartnerInvoicePaymentFields();
  }

  function setHgsfCoveredDaysDefault() {
    var period = elements.form && elements.form.elements.periodType ? elements.form.elements.periodType.value : "Mensuelle";
    var covered = elements.form && elements.form.elements.coveredDays ? elements.form.elements.coveredDays : null;
    if (covered) covered.value = hgsfDefaultCoveredDays(period);
  }

  function syncHgsfCoveredDaysWithChecks() {
    var covered = elements.form && elements.form.elements.coveredDays ? elements.form.elements.coveredDays : null;
    if (covered) covered.value = checkedValues("applicableDays").length;
  }

  function setNeedCoveredDaysDefault() {
    var period = elements.form && elements.form.elements.periodType ? elements.form.elements.periodType.value : "Mensuelle";
    var covered = elements.form && elements.form.elements.coveredDays ? elements.form.elements.coveredDays : null;
    if (covered) covered.value = needDefaultCoveredDays(period);
  }

  function renderField(field, draft) {
    if (workflowPage(state.page) && field.name === "status") return "";
    if (!fieldVisible(field, draft)) return "";
    if (field.name === "projectId" && state.contextProjectId && projectScopedPage(state.page)) {
      return '<label data-field="' + field.name + '">Projet<input type="hidden" name="projectId" value="' + escapeHtml(state.contextProjectId) + '" /><span class="context-field-value">' + escapeHtml(resolveReferenceLabel("projectId", state.contextProjectId)) + '</span></label>';
    }
    var required = field.required ? "required" : "";
    var pattern = field.pattern ? 'pattern="' + field.pattern + '"' : "";
    var placeholder = field.placeholder ? 'placeholder="' + escapeHtml(field.placeholder) + '"' : "";
    var hint = field.hint ? "<small>" + escapeHtml(field.hint) + "</small>" : "";
    var fieldLabel = projectMoneyFieldLabel(field.label, draft);
    var i;
    if (field.type === "select") {
      var opts = normalizeOptions(resolveOptions(field, draft));
      var blank = field.allowBlank || !field.required ? '<option value="">-- Selectionner --</option>' : "";
      var optHtml = "";
      for (i = 0; i < opts.length; i += 1) optHtml += optionTag(opts[i], draft[field.name]);
      return '<label data-field="' + field.name + '">' + fieldLabel + '<select name="' + field.name + '" ' + required + ">" + blank + optHtml + "</select>" + hint + "</label>";
    }
    if (field.type === "multi") {
      var multiOpts = normalizeOptions(resolveOptions(field, draft));
      var selected = draft[field.name] || [];
      var search = field.searchable ? '<input class="mini-search" type="search" placeholder="Rechercher..." data-search-for="' + field.name + '" />' : "";
      var selectAll = state.page === "monthlyPlans" && field.name === "fdpIds" ? '<button type="button" class="mini-select-all" data-select-all-for="' + field.name + '">Select all</button>' : "";
      var checks = "";
      for (i = 0; i < multiOpts.length; i += 1) checks += '<label><input type="checkbox" name="' + field.name + '" value="' + escapeHtml(multiOpts[i].value) + '" ' + (selected.indexOf(multiOpts[i].value) > -1 ? "checked" : "") + ' /> <span>' + escapeHtml(multiOpts[i].label) + "</span></label>";
      if (!checks) checks = '<p class="muted">Aucune option disponible.</p>';
      return '<fieldset class="multi-field" data-field="' + field.name + '"><legend>' + fieldLabel + "</legend>" + search + selectAll + '<div class="check-list">' + checks + "</div>" + hint + "</fieldset>";
    }
    if (field.type === "country") {
      var countries = countryOptions();
      var datalistId = "countries-" + field.name;
      var countryHtml = "";
      for (i = 0; i < countries.length; i += 1) countryHtml += '<option value="' + escapeHtml(countries[i]) + '"></option>';
      return '<label data-field="' + field.name + '">' + fieldLabel + '<input name="' + field.name + '" type="search" list="' + datalistId + '" ' + required + ' placeholder="Rechercher un pays..." value="' + escapeHtml(draft[field.name] || "") + '" /><datalist id="' + datalistId + '">' + countryHtml + "</datalist>" + hint + "</label>";
    }
    if (field.type === "search") {
      var searchOptions = normalizeOptions(resolveOptions(field, draft));
      var searchListId = "list-" + field.name;
      var searchHtml = "";
      for (i = 0; i < searchOptions.length; i += 1) searchHtml += '<option value="' + escapeHtml(searchOptions[i].value) + '">' + escapeHtml(searchOptions[i].label) + "</option>";
      return '<label data-field="' + field.name + '">' + fieldLabel + '<input name="' + field.name + '" type="search" list="' + searchListId + '" ' + required + ' placeholder="Rechercher..." value="' + escapeHtml(draft[field.name] || "") + '" /><datalist id="' + searchListId + '">' + searchHtml + "</datalist>" + hint + "</label>";
    }
    if (field.type === "foodItems") return renderFoodItemsField(field, draft);
    if (field.type === "projectFdps") return renderProjectFdpsField(field, draft);
    if (field.type === "projectPartnerStaff") return renderProjectPartnerStaffField(field, draft);
    if (field.type === "monthlyGrantContributions") return renderMonthlyGrantContributionsField(field, draft);
    if (field.type === "processKpiDetails") return renderProcessKpiDetailsField(field, draft);
    if (field.type === "budgetGrantAmounts") return renderBudgetGrantAmountsField(field, draft);
    if (field.type === "hgsfMenuItems") return renderHgsfMenuItemsField(field, draft);
    if (field.type === "hgsfIngredientPrices") return renderHgsfIngredientPricesField(field, draft);
    if (field.type === "hgsfApplicableDays") return renderHgsfApplicableDaysField(field, draft);
    if (field.type === "hgsfEstimationRows") return renderHgsfEstimationRowsField(field, draft);
    if (field.type === "hgsfPurchaseOrderLines") return renderHgsfPurchaseOrderLinesField(field, draft);
    if (field.type === "rationItems") return renderRationItemsField(field, draft);
    if (field.type === "needCommodityPercents") return renderNeedCommodityPercentsField(field, draft);
    if (field.type === "needBeneficiaryRows") return renderNeedBeneficiaryRowsField(field, draft);
    if (field.type === "distributionLines") return renderDistributionLinesField(field, draft);
    if (field.type === "nfiInventoryItems") return renderNfiInventoryItemsField(field, draft);
    if (field.type === "partnerInvoiceAmounts") return renderPartnerInvoiceAmountsField(field, draft);
    if (field.type === "textarea") return '<label data-field="' + field.name + '">' + fieldLabel + '<textarea name="' + field.name + '" rows="3">' + escapeHtml(draft[field.name] || "") + "</textarea>" + hint + "</label>";
    var value = draft[field.name] !== undefined && draft[field.name] !== null ? 'value="' + escapeHtml(draft[field.name]) + '"' : "";
    var readonly = isGeneratedIdField(field.name) || state.page === "processIndicators" && field.name === "id" || state.page === "partnerInvoices" && field.name === "invoiceTotalXaf" || state.page === "partnerInvoicePayments" && (field.name === "invoiceAmountXaf" || field.name === "balanceXaf") ? "readonly" : "";
    return '<label data-field="' + field.name + '">' + fieldLabel + '<input name="' + field.name + '" type="' + field.type + '" ' + required + " " + pattern + " " + placeholder + " " + value + " " + readonly + " />" + hint + "</label>";
  }

  function projectMoneyFieldLabel(label, draft) {
    if (!/(XAF|Montant|Budget|Valeur|Solde|Contribution|Depense|dépense|facture|paye|payé)/i.test(label || "")) return label;
    var currency = draft && draft.currency ? draft.currency : projectCurrency(draft && draft.projectId);
    return String(label || "").replace(/\(XAF\)| XAF|XAF/g, "").trim() + " (" + currency + ")";
  }

  function fieldVisible(field, draft) {
    if (field.visibleWhen === "cash") return (draft.grantModality || "Cash") !== "Vivre";
    if (field.visibleWhen === "food") return draft.grantModality === "Vivre";
    if (field.visibleWhen === "grantInKindYes") return draft.hasInKind === "Oui";
    if (field.visibleWhen === "hgsfPriceFallback") return draft.useFallbackPrice === "Oui";
    if (field.visibleWhen === "otherRationReference") return draft.reference === "Autre";
    if (field.visibleWhen === "grantRateAllMonths") return draft.hasInKind === "Oui" && (draft.rateScope || "Oui") === "Oui";
    if (field.visibleWhen === "grantRateByMonth") return draft.hasInKind === "Oui" && draft.rateScope === "Non";
    if (field.visibleWhen === "otherContract") return draft.contractType === "Autre";
    if (field.visibleWhen === "otherFdpType") return draft.fdpType === "Autre";
    if (field.visibleWhen === "otherCoopType") return draft.organizationType === "Autre";
    if (field.visibleWhen === "otherStakeholderInterest") return (draft.interests || []).indexOf("Autre") > -1;
    if (field.visibleWhen === "partnerStaffStakeholder") return draft.isPartnerStaff === "Oui";
    if (field.visibleWhen === "otherKpiFrequency") return draft.frequency === "Autre";
    if (field.visibleWhen === "localizedStakeholder") return draft.localizedStakeholder === "Oui";
    if (field.visibleWhen === "stakeholderCountrySites") return draft.localizedStakeholder === "Oui";
    if (field.visibleWhen === "stakeholderRegionSites") return draft.localizedStakeholder === "Oui" && ["Region", "Departement", "Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "stakeholderDepartmentSites") return draft.localizedStakeholder === "Oui" && ["Departement", "Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "stakeholderArrondissementSites") return draft.localizedStakeholder === "Oui" && ["Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "stakeholderFdpSites") return draft.localizedStakeholder === "Oui" && draft.localizationLevel === "FDP";
    if (field.visibleWhen === "partnerStaff") return draft.staffAffiliation === "Partenaire";
    if (field.visibleWhen === "fieldOfficeStaff") return draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office";
    if (field.visibleWhen === "fieldOrPartnerStaff") return draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office" || draft.staffAffiliation === "Partenaire";
    if (field.visibleWhen === "countryZoning") return (draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office" || draft.staffAffiliation === "Partenaire") && draft.zoningLevel === "Pays";
    if (field.visibleWhen === "regionZoning") return (draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office" || draft.staffAffiliation === "Partenaire") && draft.zoningLevel === "Regional";
    if (field.visibleWhen === "departmentZoning") return (draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office" || draft.staffAffiliation === "Partenaire") && draft.zoningLevel === "Departemental";
    if (field.visibleWhen === "arrondissementZoning") return (draft.staffAffiliation === "Office in charge" || draft.staffAffiliation === "Field Office" || draft.staffAffiliation === "Partenaire") && draft.zoningLevel === "Arrondissement";
    if (field.visibleWhen === "activityHasSubActivities") return subActivitiesForActivity(draft.activityId).length > 0;
    if (field.visibleWhen === "localizedMonthlyActivity") return draft.localizedActivity === "Oui";
    if (field.visibleWhen === "monthlyCountrySites") return draft.localizedActivity === "Oui";
    if (field.visibleWhen === "monthlyRegionSites") return draft.localizedActivity === "Oui" && ["Region", "Departement", "Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "monthlyDepartmentSites") return draft.localizedActivity === "Oui" && ["Departement", "Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "monthlyArrondissementSites") return draft.localizedActivity === "Oui" && ["Arrondissement", "FDP"].indexOf(draft.localizationLevel) > -1;
    if (field.visibleWhen === "monthlyFdpSites") return draft.localizedActivity === "Oui" && draft.localizationLevel === "FDP";
    if (field.visibleWhen === "otherRecommendationSubActivity") return draft.subActivityType === "Autre";
    if (field.visibleWhen === "otherRecommendationWhatWhere") return draft.whatWhere === "Autre";
    if (field.visibleWhen === "otherRecommendationUnit") return draft.unit === "Autre";
    if (field.visibleWhen === "recommendationCompleted") return draft.recommendationStatus === "Completed";
    if (field.visibleWhen === "projectNeedScope") return (draft.needScope || "FDP du projet") === "FDP du projet";
    if (field.visibleWhen === "isolatedNeed") return draft.needScope === "Besoin isole";
    if (field.visibleWhen === "needInKind") return needDraftModality(draft) === "In kind";
    return true;
  }

  function renderFoodItemsField(field, draft) {
    var saved = draft[field.name] || [];
    var types = ["Cereals", "Legumineuse", "Huile", "Sel", "CSB", "CSB++", "Autre"];
    var rows = "";
    for (var i = 0; i < types.length; i += 1) {
      var item = foodItemByType(saved, types[i]);
      var enabled = item ? "checked" : "";
      rows += '<tr data-food-row="' + escapeHtml(types[i]) + '"><td><label><input type="checkbox" name="' + field.name + '-enabled" value="' + escapeHtml(types[i]) + '" ' + enabled + " /> " + escapeHtml(types[i]) + '</label></td><td>' + (types[i] === "Autre" ? '<input name="' + field.name + '-' + i + '-other" type="text" value="' + escapeHtml(item ? item.otherType || "" : "") + '" placeholder="A preciser" />' : "") + '</td><td><input name="' + field.name + '-' + i + '-quantity" type="number" min="0" step="0.001" value="' + escapeHtml(item ? item.quantity || "" : "") + '" /></td><td><input name="' + field.name + '-' + i + '-bdd" type="date" value="' + escapeHtml(item ? item.bdd || "" : "") + '" /></td><td><input name="' + field.name + '-' + i + '-tdd" type="date" value="' + escapeHtml(item ? item.tdd || "" : "") + '" /></td></tr>';
    }
    return '<fieldset class="food-items-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="food-items-wrap"><table><thead><tr><th>Type de vivres</th><th>Autre</th><th>Quantite</th><th>BDD</th><th>TDD</th></tr></thead><tbody>' + rows + "</tbody></table></div></fieldset>";
  }

  function foodItemByType(items, type) {
    for (var i = 0; i < items.length; i += 1) if (items[i].type === type) return items[i];
    return null;
  }

  function renderProjectFdpsField(field, draft) {
    var rows = "";
    var grantOptions = projectGrantOptionsFromDraft(draft);
    for (var i = 0; i < store.fdps.length; i += 1) {
      var fdp = store.fdps[i];
      var saved = projectFdpById(draft, fdp.id);
      var typeValue = saved ? saved.fdpType || fdp.fdpType || "" : fdp.fdpType || "";
      rows += '<tr data-project-fdp-row data-fdp-type="' + escapeHtml(typeValue) + '"><td><label><input type="checkbox" name="' + field.name + '-enabled" value="' + escapeHtml(fdp.id) + '" ' + (saved ? "checked" : "") + " /> " + escapeHtml(fdpLabel(fdp)) + '</label></td><td>' + escapeHtml(typeValue) + '</td><td>' + projectFdpGrantChecks(field.name, i, grantOptions, saved ? saved.grantCodes || [] : []) + '</td><td><input name="' + field.name + "-" + i + '-beneficiaries" type="number" min="0" step="1" value="' + escapeHtml(saved ? saved.beneficiaries || "" : "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="4">Aucun FDP disponible.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><label class="inline-filter">Filtrer par type FDP<select data-project-fdp-filter><option value="">Tous</option>' + projectFdpTypeOptionsHtml("") + '</select></label><div class="project-sites-wrap"><table><thead><tr><th>Final Distribution Point (FDP)</th><th>Type FDP</th><th>Grants rattaches au FDP</th><th>Nombre de beneficiaires</th></tr></thead><tbody>' + rows + "</tbody></table></div></fieldset>";
  }

  function renderHgsfMenuItemsField(field, draft) {
    var items = draft[field.name] || [];
    var ingredientOptions = hgsfUniqueIngredientOptions();
    var count = Math.max(items.length, 1);
    var rows = "";
    for (var i = 0; i < count; i += 1) {
      var item = items[i] || {};
      rows += hgsfMenuItemRowHtml(field.name, ingredientOptions, item);
    }
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Ingredient</th><th>Quantite par eleve (grammes)</th></tr></thead><tbody data-hgsf-menu-items="' + field.name + '">' + rows + '</tbody></table><button type="button" class="secondary-action mini-add-line" data-add-hgsf-menu-line="' + field.name + '">Ajouter une ligne / ingredient</button><small>Les quantites sont saisies en grammes par eleve; l\'estimation les convertira automatiquement en kilogrammes.</small></fieldset>';
  }

  function hgsfMenuItemRowHtml(name, ingredientOptions, item) {
    item = item || {};
    return '<tr><td><select name="' + name + '-ingredient">' + optionsHtml(ingredientOptions, item.ingredientId || "") + '</select></td><td><input name="' + name + '-qty" type="number" min="0" step="0.001" value="' + escapeHtml(item.quantityPerStudent || "") + '" /></td></tr>';
  }

  function hgsfUniqueIngredientOptions() {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.hgsfIngredients.length; i += 1) {
      var item = store.hgsfIngredients[i];
      var key = String(item.name || "").toLowerCase() + "::" + String(item.unit || "").toLowerCase();
      if (!item.name || seen[key]) continue;
      seen[key] = true;
      out.push({ value: item.id, label: item.name + " (" + item.unit + ")" });
    }
    return out;
  }

  function readHgsfMenuItems(name) {
    var ingredients = elements.form.querySelectorAll('select[name="' + name + '-ingredient"]');
    var quantities = elements.form.querySelectorAll('input[name="' + name + '-qty"]');
    var out = [];
    for (var i = 0; i < ingredients.length; i += 1) {
      if (ingredients[i].value && Number(quantities[i].value || 0) > 0) out.push({ ingredientId: ingredients[i].value, quantityPerStudent: Number(quantities[i].value || 0) });
    }
    return out;
  }

  function renderHgsfIngredientPricesField(field, draft) {
    var arrs = draft.localizationArrondissements && draft.localizationArrondissements.length ? draft.localizationArrondissements : (draft.arrondissement ? [draft.arrondissement] : []);
    var rows = "";
    for (var i = 0; i < arrs.length; i += 1) {
      var item = hgsfPriceEntryForArrondissement(draft[field.name] || [], arrs[i]);
      rows += '<tr data-hgsf-price-row><td><input type="hidden" name="' + field.name + '-arrondissement" value="' + escapeHtml(arrs[i]) + '" />' + escapeHtml(arrs[i]) + '</td><td><input name="' + field.name + '-price" type="number" min="0" step="1" value="' + escapeHtml(item ? item.priceXaf || "" : "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="2"><p class="muted">Selectionner d\'abord les arrondissements.</p></td></tr>';
    return '<fieldset class="project-sites-field hgsf-price-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Arrondissement</th><th>Prix unitaire XAF</th></tr></thead><tbody>' + rows + '</tbody></table><small>Un meme ingredient peut avoir des prix differents selon l\'arrondissement. L\'estimation utilisera le prix de l\'arrondissement de l\'ecole.</small></fieldset>';
  }

  function hgsfPriceEntryForArrondissement(items, arrondissement) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].arrondissement === arrondissement) return items[i];
    return null;
  }

  function readHgsfIngredientPrices(name) {
    var arrs = elements.form.querySelectorAll('input[name="' + name + '-arrondissement"]');
    var prices = elements.form.querySelectorAll('input[name="' + name + '-price"]');
    var out = [];
    for (var i = 0; i < arrs.length; i += 1) {
      if (!arrs[i].value) continue;
      out.push({ arrondissement: arrs[i].value, priceXaf: Number(prices[i].value || 0) });
    }
    return out;
  }

  function renderHgsfEstimationRowsField(field, draft) {
    var rows = draft[field.name] || [];
    var schools = hgsfSelectedSchoolOptions(draft);
    var dayOptions = hgsfSelectedDayOptions(draft);
    var html = "";
    for (var i = 0; i < rows.length; i += 1) {
      html += hgsfEstimationRowHtml(field.name, rows[i], schools, dayOptions);
    }
    if (!html) html = '<tr class="empty-row"><td colspan="5"><p class="muted">Aucune ligne. Selectionner les jours et les ecoles, puis cliquer sur Ajouter les lignes.</p></td></tr>';
    return '<fieldset class="project-sites-field hgsf-estimation-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="inline-actions"><button type="button" class="secondary-action" data-add-hgsf-estimation-lines="' + field.name + '">Ajouter les lignes</button></div><table><thead><tr><th>Ecole</th><th>Jour</th><th>Nombre d\'eleves</th><th>Menu</th><th>Action</th></tr></thead><tbody data-hgsf-estimation-rows="' + field.name + '">' + html + '</tbody></table><small>Le bouton cree une ligne pour chaque couple ecole/jour coche. Les lignes vides ne seront pas sauvegardees.</small></fieldset>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Ecole</th><th>Nombre d\'eleves</th><th>Jours</th><th>Menu</th></tr></thead><tbody>' + html + '</tbody></table><small>Utiliser les filtres de l\'école via la liste de recherche; seules les lignes avec école, menu, élèves et jours sont estimees.</small></fieldset>';
  }

  function readHgsfEstimationRows(name) {
    var schoolSelects = elements.form.querySelectorAll('select[name="' + name + '-school"]');
    var daySelects = elements.form.querySelectorAll('select[name="' + name + '-day"]');
    if (daySelects.length) {
      var studentInputs = elements.form.querySelectorAll('input[name="' + name + '-students"]');
      var menuSelects = elements.form.querySelectorAll('select[name="' + name + '-menu"]');
      var rowsOut = [];
      for (var r = 0; r < schoolSelects.length; r += 1) {
        if (schoolSelects[r].value && daySelects[r].value && menuSelects[r].value && Number(studentInputs[r].value || 0) > 0) rowsOut.push({ schoolFdpId: schoolSelects[r].value, day: daySelects[r].value, students: Number(studentInputs[r].value || 0), days: 1, menuId: menuSelects[r].value });
      }
      return rowsOut;
    }
    var schools = elements.form.querySelectorAll('select[name="' + name + '-school"]');
    var students = elements.form.querySelectorAll('input[name="' + name + '-students"]');
    var days = elements.form.querySelectorAll('input[name="' + name + '-days"]');
    var menus = elements.form.querySelectorAll('select[name="' + name + '-menu"]');
    var out = [];
    for (var i = 0; i < schools.length; i += 1) {
      if (schools[i].value && menus[i].value && Number(students[i].value || 0) > 0 && Number(days[i].value || 0) > 0) out.push({ schoolFdpId: schools[i].value, students: Number(students[i].value || 0), days: Number(days[i].value || 0), menuId: menus[i].value });
    }
    return out;
  }

  function renderHgsfApplicableDaysField(field, draft) {
    var days = hgsfApplicableDayOptions(draft);
    var selected = draft[field.name] && draft[field.name].length ? draft[field.name] : hgsfDefaultApplicableDays(draft);
    var html = "";
    for (var i = 0; i < days.length; i += 1) {
      html += '<label><input type="checkbox" name="' + field.name + '" value="' + escapeHtml(days[i].value) + '" ' + (selected.indexOf(days[i].value) > -1 ? "checked" : "") + ' /> <span>' + escapeHtml(days[i].label) + "</span></label>";
    }
    if (!html) html = '<p class="muted">Selectionner d\'abord un mois de reference.</p>';
    return '<fieldset class="multi-field hgsf-days-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="check-list compact-days">' + html + '</div><button type="button" class="secondary-action mini-add-line" data-sync-hgsf-days>OK a ajouter</button><small>Cliquer sur OK a ajouter pour mettre a jour le Nombre de jours couverts selon les jours coches.</small></fieldset>';
  }

  function renderHgsfPurchaseOrderLinesField(field, draft) {
    var rows = "";
    var lines = draft[field.name] && draft[field.name].length ? draft[field.name] : hgsfDefaultPurchaseOrderLines(draft);
    for (var i = 0; i < lines.length; i += 1) {
      var remaining = hgsfRemainingStockForOrderLine(draft, lines[i].ingredient);
      rows += '<tr data-hgsf-order-line><td><input type="hidden" name="' + field.name + '-ingredient" value="' + escapeHtml(lines[i].ingredient || "") + '" />' + escapeHtml(lines[i].ingredient || "") + ' <small>(reste: ' + formatDecimal(remaining, 3) + ' Kg)</small></td><td><input name="' + field.name + '-quantity" type="number" min="0" step="0.001" value="' + escapeHtml(lines[i].quantity || "") + '" /></td><td><input name="' + field.name + '-cost" type="number" min="0" step="1" value="' + escapeHtml(lines[i].cost || "") + '" readonly /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="3">Selectionner une estimation rattachee.</td></tr>';
    return '<fieldset class="project-sites-field hgsf-order-lines-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Ingredient</th><th>Quantite commandee (Kg)</th><th>Cout estime</th></tr></thead><tbody>' + rows + '</tbody></table><small>Les quantites peuvent etre modifiees. La commande ne doit pas depasser le stock restant par ingredient.</small></fieldset>';
  }

  function readHgsfPurchaseOrderLines(name) {
    var ingredients = elements.form.querySelectorAll('input[name="' + name + '-ingredient"]');
    var quantities = elements.form.querySelectorAll('input[name="' + name + '-quantity"]');
    var costs = elements.form.querySelectorAll('input[name="' + name + '-cost"]');
    var out = [];
    for (var i = 0; i < ingredients.length; i += 1) {
      if (!ingredients[i].value) continue;
      out.push({ ingredient: ingredients[i].value, quantity: Number(quantities[i].value || 0), cost: Number(costs[i].value || 0) });
    }
    return out;
  }

  function renderRationItemsField(field, draft) {
    var rows = "";
    var items = draft[field.name] && draft[field.name].length ? draft[field.name] : defaultRationItems(draft);
    if (rationItemsNeedReset(draft, items)) items = defaultRationItems(draft);
    for (var i = 0; i < items.length; i += 1) {
      rows += rationItemRowHtml(field.name, items[i]);
    }
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Commodite / Amount</th><th>Valeur</th><th>Unite</th></tr></thead><tbody data-ration-items="' + field.name + '">' + rows + '</tbody></table><button type="button" class="secondary-action mini-add-line" data-add-ration-line="' + field.name + '">Ajouter une ligne</button></fieldset>';
  }

  function rationItemRowHtml(name, item) {
    item = item || {};
    return '<tr data-ration-row><td><input name="' + name + '-commodity" type="text" value="' + escapeHtml(item.commodity || "") + '" placeholder="Ajouter..." /></td><td><input name="' + name + '-value" type="number" min="0" step="0.001" value="' + escapeHtml(item.value || "") + '" /></td><td><input name="' + name + '-unit" type="text" value="' + escapeHtml(item.unit || "") + '" placeholder="g/BNF/jr ou XAF/BNF/jr" /></td></tr>';
  }

  function rationItemsNeedReset(draft, items) {
    items = items || [];
    var modality = draft.modality || "In kind";
    if (modality === "CBT" || modality === "Voucher") return items.length !== 1 || !/XAF/i.test(items[0].unit || "");
    if (!items.length || /XAF/i.test(items[0].unit || "")) return true;
    var first = String(items[0].commodity || "");
    if (draft.subActivityType === "Nutrition") return ["CSB++", "CSB+"].indexOf(first) < 0;
    return ["Cereals", "Legumineuse"].indexOf(first) < 0;
  }

  function defaultRationItems(draft) {
    var sub = draft.subActivityType || "GFA";
    var modality = draft.modality || "In kind";
    if (modality === "CBT" || modality === "Voucher") return [{ commodity: "Amount", value: "", unit: "XAF/BNF/jr" }];
    if (sub === "Nutrition") return [{ commodity: "CSB++", value: "", unit: "g/BNF/jr" }, { commodity: "CSB+", value: "", unit: "g/BNF/jr" }, { commodity: "Sucre", value: "", unit: "g/BNF/jr" }];
    return [{ commodity: "Cereals", value: "", unit: "g/BNF/jr" }, { commodity: "Legumineuse", value: "", unit: "g/BNF/jr" }, { commodity: "Huile", value: "", unit: "g/BNF/jr" }, { commodity: "Sel", value: "", unit: "g/BNF/jr" }];
  }

  function readRationItems(name) {
    var commodities = elements.form.querySelectorAll('input[name="' + name + '-commodity"]');
    var values = elements.form.querySelectorAll('input[name="' + name + '-value"]');
    var units = elements.form.querySelectorAll('input[name="' + name + '-unit"]');
    var out = [];
    for (var i = 0; i < commodities.length; i += 1) {
      if (commodities[i].value && Number(values[i].value || 0) >= 0) out.push({ commodity: commodities[i].value, value: Number(values[i].value || 0), unit: units[i].value || "" });
    }
    return out;
  }

  function renderNeedCommodityPercentsField(field, draft) {
    var ration = findByRecordId(store.assistanceRations, draft.rationId) || {};
    var items = ration.rationItems || [];
    var saved = draft[field.name] || [];
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      if (/XAF/i.test(items[i].unit || "")) continue;
      var percent = needCommodityPercent(saved, items[i].commodity);
      rows += '<tr><td><input type="hidden" name="' + field.name + '-commodity" value="' + escapeHtml(items[i].commodity || "") + '" />' + escapeHtml(items[i].commodity || "") + '</td><td><input name="' + field.name + '-percent" type="number" min="0" max="100" step="0.001" value="' + escapeHtml(percent) + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="2">Selectionner une ration In kind pour renseigner les pourcentages par commodite.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Commodite</th><th>% de ration a fournir</th></tr></thead><tbody>' + rows + '</tbody></table></fieldset>';
  }

  function readNeedCommodityPercents(name) {
    var commodities = elements.form.querySelectorAll('input[name="' + name + '-commodity"]');
    var percents = elements.form.querySelectorAll('input[name="' + name + '-percent"]');
    var out = [];
    for (var i = 0; i < commodities.length; i += 1) if (commodities[i].value) out.push({ commodity: commodities[i].value, percent: Number(percents[i].value || 100) });
    return out;
  }

  function needCommodityPercent(items, commodity) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].commodity === commodity) return items[i].percent === undefined || items[i].percent === "" ? 100 : items[i].percent;
    return 100;
  }

  function renderNeedBeneficiaryRowsField(field, draft) {
    var fdps = draft.fdpIds || [];
    var saved = draft[field.name] || [];
    var rows = "";
    for (var i = 0; i < fdps.length; i += 1) {
      var fdp = findByRecordId(store.fdps, fdps[i]);
      var item = needBeneficiaryForFdp(saved, fdps[i]) || {};
      var defaultBnf = item.beneficiaries || projectBeneficiariesForFdp(draft.projectId, fdps[i]);
      rows += '<tr><td><input type="hidden" name="' + field.name + '-fdp" value="' + escapeHtml(fdps[i]) + '" />' + escapeHtml(fdp ? fdpLabel(fdp) : fdps[i]) + '</td><td><input name="' + field.name + '-beneficiaries" type="number" min="0" step="1" value="' + escapeHtml(defaultBnf || "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="2">Selectionner les FDPs du projet.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>FDP</th><th>Beneficiaires</th></tr></thead><tbody>' + rows + '</tbody></table></fieldset>';
  }

  function readNeedBeneficiaryRows(name) {
    var fdps = elements.form.querySelectorAll('input[name="' + name + '-fdp"]');
    var beneficiaries = elements.form.querySelectorAll('input[name="' + name + '-beneficiaries"]');
    var out = [];
    for (var i = 0; i < fdps.length; i += 1) if (fdps[i].value) out.push({ fdpId: fdps[i].value, beneficiaries: Number(beneficiaries[i].value || 0) });
    return out;
  }

  function needBeneficiaryForFdp(items, fdpId) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].fdpId === fdpId) return items[i];
    return null;
  }

  function renderDistributionLinesField(field, draft) {
    var lines = draft[field.name] && draft[field.name].length ? draft[field.name] : defaultDistributionLines(draft);
    var isCbt = draft.modality === "CBT";
    var isInKind = !isCbt;
    var rows = "";
    var grantOptions = normalizeOptions(grantOptionsForDistribution(draft));
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var selectedGrants = line.grantCodes || (line.grantCode ? [line.grantCode] : []);
      var grantChecks = "";
      for (var g = 0; g < grantOptions.length; g += 1) {
        grantChecks += '<label><input type="checkbox" name="' + field.name + '-' + i + '-grantCodes" value="' + escapeHtml(grantOptions[g].value) + '" ' + (selectedGrants.indexOf(grantOptions[g].value) > -1 ? "checked" : "") + ' /> <span>' + escapeHtml(grantOptions[g].label) + "</span></label>";
      }
      var commodityHint = distributionCommodityHint(selectedGrants, draft);
      rows += '<tr><td><input type="hidden" name="' + field.name + '-fdpId" value="' + escapeHtml(line.fdpId || "") + '" />' + escapeHtml(resolveReferenceLabel("fdpId", line.fdpId || "")) + '</td>' +
        '<td class="distribution-grants"><div class="check-list compact-list">' + grantChecks + '</div></td>' +
        '<td class="distribution-bnf"><input name="' + field.name + '-plannedBeneficiaries" type="number" value="' + escapeHtml(line.plannedBeneficiaries || "") + '" readonly /></td>' +
        '<td><input name="' + field.name + '-maleBoy" type="number" min="0" step="1" value="' + escapeHtml(line.maleBoy || "") + '" /></td>' +
        '<td><input name="' + field.name + '-femaleGirl" type="number" min="0" step="1" value="' + escapeHtml(line.femaleGirl || "") + '" /></td>' +
        (isInKind ? '<td><input name="' + field.name + '-commodityQuantities" type="text" placeholder="' + escapeHtml(commodityHint || "Cereals:1.5; Oil:0.2") + '" value="' + escapeHtml(line.commodityQuantities || "") + '" /><small>' + escapeHtml(commodityHint) + '</small></td>' : "") +
        (isCbt ? '<td><input name="' + field.name + '-cashTransferredXaf" type="number" min="0" step="1" value="' + escapeHtml(line.cashTransferredXaf || "") + '" /></td>' : "") +
        '<td><input name="' + field.name + '-plannedStartDate" type="date" value="' + escapeHtml(line.plannedStartDate || draft.plannedStartDate || "") + '" /></td>' +
        '<td><input name="' + field.name + '-actualStartDate" type="date" value="' + escapeHtml(line.actualStartDate || "") + '" /></td>' +
        '<td><input name="' + field.name + '-plannedEndDate" type="date" value="' + escapeHtml(line.plannedEndDate || draft.plannedEndDate || "") + '" /></td>' +
        '<td><input name="' + field.name + '-actualEndDate" type="date" value="' + escapeHtml(line.actualEndDate || "") + '" /></td></tr>';
    }
    var heads = '<th>FDP</th><th>Grants</th><th>BNF planifie</th><th>Male/Boy</th><th>Female/Girl</th>' + (isInKind ? '<th>Vivres distribues</th>' : '') + (isCbt ? '<th>Cash transfere (' + escapeHtml(projectCurrency(draft.projectId)) + ')</th>' : '') + '<th>Debut planifie</th><th>Debut actuel</th><th>Fin planifiee</th><th>Fin actuelle</th>';
    if (!rows) rows = '<tr><td colspan="' + (isCbt ? 10 : 10) + '">Selectionner un plan mensuel valide.</td></tr>';
    return '<fieldset class="project-sites-field distribution-lines-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="project-sites-wrap"><table><thead><tr>' + heads + '</tr></thead><tbody>' + rows + '</tbody></table></div><small>Le total BNF assiste est calcule Male/Boy + Female/Girl. Pour les vivres, saisir par exemple: Cereals:1.5; Legumineuse:0.4 en MT.</small></fieldset>';
  }

  function readDistributionLines(name) {
    var fdps = elements.form.querySelectorAll('input[name="' + name + '-fdpId"]');
    var planned = elements.form.querySelectorAll('input[name="' + name + '-plannedBeneficiaries"]');
    var male = elements.form.querySelectorAll('input[name="' + name + '-maleBoy"]');
    var female = elements.form.querySelectorAll('input[name="' + name + '-femaleGirl"]');
    var commodities = elements.form.querySelectorAll('input[name="' + name + '-commodityQuantities"]');
    var cash = elements.form.querySelectorAll('input[name="' + name + '-cashTransferredXaf"]');
    var start = elements.form.querySelectorAll('input[name="' + name + '-plannedStartDate"]');
    var actualStart = elements.form.querySelectorAll('input[name="' + name + '-actualStartDate"]');
    var plannedEnd = elements.form.querySelectorAll('input[name="' + name + '-plannedEndDate"]');
    var end = elements.form.querySelectorAll('input[name="' + name + '-actualEndDate"]');
    var out = [];
    var commodityIndex = 0;
    var cashIndex = 0;
    for (var i = 0; i < fdps.length; i += 1) {
      var checked = elements.form.querySelectorAll('input[name="' + name + '-' + i + '-grantCodes"]:checked');
      var grantCodes = [];
      for (var g = 0; g < checked.length; g += 1) grantCodes.push(checked[g].value);
      var commodityValue = commodities[commodityIndex] ? commodities[commodityIndex].value || "" : "";
      var cashValue = cash[cashIndex] ? Number(cash[cashIndex].value || 0) : 0;
      if (commodities.length) commodityIndex += 1;
      if (cash.length) cashIndex += 1;
      out.push({ fdpId: fdps[i].value, grantCodes: grantCodes, grantCode: grantCodes[0] || "", plannedBeneficiaries: Number(planned[i].value || 0), maleBoy: Number(male[i].value || 0), femaleGirl: Number(female[i].value || 0), totalAssisted: Number(male[i].value || 0) + Number(female[i].value || 0), commodityQuantities: commodityValue, cashTransferredXaf: cashValue, plannedStartDate: start[i].value || "", actualStartDate: actualStart[i].value || "", plannedEndDate: plannedEnd[i].value || "", actualEndDate: end[i].value || "" });
    }
    return out;
  }

  function distributionCommodityHint(grantCodes, draft) {
    var names = [];
    grantCodes = grantCodes && grantCodes.length ? grantCodes : (draft && draft.projectId ? [firstGrantCodeForProject(draft.projectId)] : []);
    for (var i = 0; i < grantCodes.length; i += 1) {
      var grant = findByRecordId(store.grants, grantCodes[i]);
      var items = grant ? grant.foodItems || [] : [];
      for (var j = 0; j < items.length; j += 1) if (items[j].type && names.indexOf(items[j].type) < 0) names.push(items[j].type);
    }
    return names.length ? names.join(":0; ") + ":0" : "";
  }

  function renderNfiInventoryItemsField(field, draft) {
    var items = draft[field.name] && draft[field.name].length ? draft[field.name] : defaultNfiInventoryItems(draft);
    var states = ["100% Fonctionnel", "90-99% fonctionnelle", "60-89% fonctionnelle", "40-59% fonctionnelle", "1-39% fonctionnelle", "Non fonctionnelle"];
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      rows += '<tr><td><input type="hidden" name="' + field.name + '-nfiId" value="' + escapeHtml(items[i].nfiId || "") + '" />' + escapeHtml(resolveReferenceLabel("nfiId", items[i].nfiId || "")) + '</td><td><input name="' + field.name + '-supplied" type="number" value="' + escapeHtml(items[i].quantitySupplied || 0) + '" readonly /></td><td><input name="' + field.name + '-seen" type="number" min="0" step="1" value="' + escapeHtml(items[i].quantitySeen || "") + '" /></td><td><select name="' + field.name + '-state">' + optionsHtml(states, items[i].condition || "") + '</select></td><td><input name="' + field.name + '-comment" type="text" value="' + escapeHtml(items[i].comment || "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="5">Aucun NFI distribue sur ce FDP.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>NFI</th><th>Quantite approvisionnee</th><th>Quantite vue sur site</th><th>Etat</th><th>Commentaire</th></tr></thead><tbody>' + rows + '</tbody></table></fieldset>';
  }

  function readNfiInventoryItems(name) {
    var ids = elements.form.querySelectorAll('input[name="' + name + '-nfiId"]');
    var supplied = elements.form.querySelectorAll('input[name="' + name + '-supplied"]');
    var seen = elements.form.querySelectorAll('input[name="' + name + '-seen"]');
    var states = elements.form.querySelectorAll('select[name="' + name + '-state"]');
    var comments = elements.form.querySelectorAll('input[name="' + name + '-comment"]');
    var out = [];
    for (var i = 0; i < ids.length; i += 1) out.push({ nfiId: ids[i].value, quantitySupplied: Number(supplied[i].value || 0), quantitySeen: Number(seen[i].value || 0), condition: states[i].value, comment: comments[i].value || "" });
    return out;
  }

  function renderPartnerInvoiceAmountsField(field, draft) {
    var rows = draft[field.name] && draft[field.name].length ? draft[field.name] : defaultPartnerInvoiceAmounts(draft);
    var html = "";
    var currency = projectCurrency(draft.projectId);
    for (var i = 0; i < rows.length; i += 1) {
      html += '<tr><td><input name="' + field.name + '-label" type="text" value="' + escapeHtml(rows[i].label || "") + '" readonly /></td><td><input name="' + field.name + '-expected" type="number" value="' + escapeHtml(rows[i].expectedAmountXaf || 0) + '" readonly /></td><td><input name="' + field.name + '-amount" type="number" min="0" max="' + escapeHtml(rows[i].expectedAmountXaf || 0) + '" step="1" value="' + escapeHtml(rows[i].amountXaf || rows[i].expectedAmountXaf || 0) + '" /></td></tr>';
    }
    if (!html) html = '<tr><td colspan="3">Selectionner une facture generee.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><table><thead><tr><th>Activite / Grant</th><th>Montant attendu (' + escapeHtml(currency) + ')</th><th>Montant (' + escapeHtml(currency) + ')</th></tr></thead><tbody>' + html + '</tbody></table></fieldset>';
  }

  function readPartnerInvoiceAmounts(name) {
    var labels = elements.form.querySelectorAll('input[name="' + name + '-label"]');
    var expected = elements.form.querySelectorAll('input[name="' + name + '-expected"]');
    var amounts = elements.form.querySelectorAll('input[name="' + name + '-amount"]');
    var out = [];
    for (var i = 0; i < labels.length; i += 1) out.push({ label: labels[i].value, expectedAmountXaf: Number(expected[i].value || 0), amountXaf: Number(amounts[i].value || 0) });
    return out;
  }

  function hgsfEstimationRowHtml(name, item, schools, dayOptions) {
    item = item || {};
    var students = item.students || defaultStudentsForSchool(item.schoolFdpId) || "";
    return '<tr data-hgsf-estimation-row><td><select name="' + name + '-school">' + optionsHtml(schools, item.schoolFdpId || "") + '</select></td><td><select name="' + name + '-day">' + optionsHtml(dayOptions, item.day || "") + '</select></td><td><input name="' + name + '-students" type="number" min="0" step="1" value="' + escapeHtml(students) + '" /></td><td><select name="' + name + '-menu">' + optionsHtml(hgsfMenuOptionsForSchool(item.schoolFdpId), item.menuId || "") + '</select><small data-hgsf-menu-status>' + escapeHtml(hgsfMenuStatusForSchool(item.schoolFdpId)) + '</small></td><td><button type="button" class="danger-lite" data-remove-hgsf-estimation-row>Supprimer</button></td></tr>';
  }

  function projectFdpGrantChecks(name, rowIndex, options, selected) {
    var html = '<div class="compact-checks">';
    selected = selected || [];
    for (var i = 0; i < options.length; i += 1) {
      html += '<label><input type="checkbox" name="' + name + "-" + rowIndex + '-grants" value="' + escapeHtml(options[i].value) + '" ' + (selected.indexOf(options[i].value) > -1 ? "checked" : "") + " /> " + escapeHtml(options[i].label) + "</label>";
    }
    if (!options.length) html += '<span class="muted">Selectionner les grants du projet</span>';
    return html + "</div>";
  }

  function renderProjectPartnerStaffField(field, draft) {
    var options = normalizeOptions(resolveOptions(field, draft));
    var saved = draft[field.name] || [];
    var rows = "";
    for (var i = 0; i < options.length; i += 1) {
      var item = projectPartnerStaffById(saved, options[i].value);
      rows += '<tr data-project-partner-staff-row><td><label><input type="checkbox" name="' + field.name + '-enabled" value="' + escapeHtml(options[i].value) + '" ' + (item ? "checked" : "") + " /> " + escapeHtml(options[i].label) + '</label></td><td><input name="' + field.name + "-" + i + '-role" type="text" value="' + escapeHtml(item ? item.role || "" : "") + '" /></td><td><select name="' + field.name + "-" + i + '-involvementLevel">' + optionsHtml(["Lead", "Core team", "Support", "Ad hoc"], item ? item.involvementLevel || "" : "") + '</select></td><td><input name="' + field.name + "-" + i + '-zone" type="text" value="' + escapeHtml(item ? item.zone || "" : "") + '" /></td><td><input name="' + field.name + "-" + i + '-startDate" type="date" value="' + escapeHtml(item ? item.startDate || "" : "") + '" /></td><td><input name="' + field.name + "-" + i + '-endDate" type="date" value="' + escapeHtml(item ? item.endDate || "" : "") + '" /></td><td><input name="' + field.name + "-" + i + '-comment" type="text" value="' + escapeHtml(item ? item.comment || "" : "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="7">Aucun staff partenaire disponible pour le partenaire selectionne.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="project-sites-wrap"><table><thead><tr><th>Staff partenaire</th><th>Role projet</th><th>Niveau implication</th><th>Zone couverte</th><th>Debut</th><th>Fin</th><th>Commentaire</th></tr></thead><tbody>' + rows + "</tbody></table></div></fieldset>";
  }

  function projectPartnerStaffById(items, staffId) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].staffId === staffId) return items[i];
    return null;
  }

  function renderMonthlyGrantContributionsField(field, draft) {
    var options = normalizeOptions(resolveOptions(field, draft));
    var saved = normalizeGrantContributionsDraft(draft);
    var rows = "";
    for (var i = 0; i < options.length; i += 1) {
      var item = grantContributionByCode(saved, options[i].value);
      rows += '<tr data-monthly-grant-row><td><label><input type="checkbox" name="' + field.name + '-enabled" value="' + escapeHtml(options[i].value) + '" ' + (item ? "checked" : "") + " /> " + escapeHtml(options[i].label) + '</label></td><td><input name="' + field.name + "-" + i + '-percent" type="number" min="0" max="100" step="0.001" value="' + escapeHtml(item ? item.contributionPercent : "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="2">Aucun grant actif rattache au projet.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="project-sites-wrap"><table><thead><tr><th>Grant</th><th>Contribution (%)</th></tr></thead><tbody>' + rows + "</tbody></table></div><small>Si un seul grant est selectionne, la contribution est mise a 100% par defaut.</small></fieldset>";
  }

  function renderProcessKpiDetailsField(field, draft) {
    var selected = draft.kpiIds || [];
    var saved = draft.processKpiDetails || [];
    var rows = "";
    for (var i = 0; i < selected.length; i += 1) {
      var kpi = findByRecordId(store.kpis, selected[i]);
      if (!kpi) continue;
      var detail = processKpiDetailById(saved, selected[i]) || defaultProcessKpiDetail(kpi, draft.projectId);
      rows += '<tr data-process-kpi-row="' + escapeHtml(selected[i]) + '">' +
        '<td><input name="' + field.name + '-' + i + '-kpiId" type="hidden" value="' + escapeHtml(selected[i]) + '" /><strong>' + escapeHtml(compactKpiLabel(kpi)) + '</strong></td>' +
        '<td><input name="' + field.name + '-' + i + '-label" type="text" value="' + escapeHtml(detail.label || "") + '" /></td>' +
        '<td><select name="' + field.name + '-' + i + '-frequency">' + optionsHtml(["Journaliere", "Hebdomadaire", "Mensuelle", "Trimestrielle", "Semestrielle", "Anuelle", "Ad hoc", "Autre"], detail.frequency || "") + '</select></td>' +
        '<td><input name="' + field.name + '-' + i + '-dataSource" type="text" value="' + escapeHtml(detail.dataSource || "") + '" /></td>' +
        '<td><input name="' + field.name + '-' + i + '-target" type="text" value="' + escapeHtml(detail.target || "") + '" /></td>' +
        '<td><select name="' + field.name + '-' + i + '-responsiblePam">' + optionsHtml(optionPairs(store.staffs, "id", function (s) { return s.firstName + " " + s.lastName; }), detail.responsiblePam || "") + '</select></td>' +
        '<td><select name="' + field.name + '-' + i + '-partnerFocalPoint">' + optionsHtml(projectPartnerStaffOptions(draft.projectId), detail.partnerFocalPoint || "") + '</select></td>' +
        '<td><textarea name="' + field.name + '-' + i + '-comment" rows="2">' + escapeHtml(detail.comment || "") + '</textarea></td>' +
        '</tr>';
    }
    if (!rows) rows = '<tr><td colspan="8"><p class="muted">Cochez un ou plusieurs KPIs du projet pour pre remplir les details.</p></td></tr>';
    return '<fieldset class="project-sites-field process-kpi-details" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="project-sites-wrap"><table><thead><tr><th>KPI source</th><th>Libelle indicateur</th><th>Frequence</th><th>Source de donnees</th><th>Cible</th><th>Responsable organisation</th><th>Point focal partenaire</th><th>Commentaire</th></tr></thead><tbody>' + rows + "</tbody></table></div></fieldset>";
  }

  function renderBudgetGrantAmountsField(field, draft) {
    var grants = grantsForProject(findByRecordId(store.projects, draft.projectId) || {});
    var saved = draft.grantAmounts || [];
    var rows = "";
    for (var i = 0; i < grants.length; i += 1) {
      var item = grantAmountByCode(saved, grants[i].code);
      rows += '<tr data-budget-grant-row><td>' + escapeHtml(grantLabel(grants[i].code)) + '</td><td><input type="number" min="0" step="1" data-budget-grant-code="' + escapeHtml(grants[i].code) + '" value="' + escapeHtml(item ? item.amountXaf || "" : "") + '" /></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="2">Aucun grant rattache au projet.</td></tr>';
    return '<fieldset class="project-sites-field" data-field="' + field.name + '"><legend>' + escapeHtml(field.label) + '</legend><div class="project-sites-wrap"><table><thead><tr><th>Grant</th><th>Montant (' + escapeHtml(projectCurrency(draft.projectId)) + ')</th></tr></thead><tbody>' + rows + '</tbody></table></div><small>Le montant total de la ligne est calcule comme la somme des montants par grant.</small></fieldset>';
  }

  function grantAmountByCode(items, code) {
    for (var i = 0; i < items.length; i += 1) if (items[i].grantCode === code) return items[i];
    return null;
  }

  function budgetGrantAmountsTotal(items) {
    var total = 0;
    items = items || [];
    for (var i = 0; i < items.length; i += 1) total += Number(items[i].amountXaf || 0);
    return total;
  }

  function readBudgetGrantAmounts() {
    var out = [];
    var inputs = elements.form.querySelectorAll("[data-budget-grant-code]");
    for (var i = 0; i < inputs.length; i += 1) {
      var amount = Number(inputs[i].value || 0);
      if (amount > 0) out.push({ grantCode: inputs[i].getAttribute("data-budget-grant-code"), amountXaf: amount });
    }
    return out;
  }

  function processKpiDetailById(items, kpiId) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].kpiId === kpiId) return items[i];
    return null;
  }

  function defaultProcessKpiDetail(kpi, projectId) {
    var activity = findByRecordId(store.projectActivities, kpi.activityId) || {};
    var partnerOptions = projectPartnerStaffOptions(projectId);
    return {
      kpiId: kpi.id,
      activityId: kpi.activityId || "",
      label: kpi.label || "",
      frequency: kpi.frequency || "Mensuelle",
      dataSource: kpi.verificationSource || "",
      target: kpi.target || "",
      responsiblePam: kpi.pamOwner || "",
      partnerFocalPoint: activity.partnerFocalPoint || (partnerOptions.length ? partnerOptions[0].value : ""),
      comment: kpi.comment || ""
    };
  }

  function grantContributionByCode(items, grantCode) {
    for (var i = 0; i < items.length; i += 1) if (items[i].grantCode === grantCode) return items[i];
    return null;
  }

  function projectFdpById(draft, fdpId) {
    var items = draft.projectFdps || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].fdpId === fdpId) return items[i];
    var legacy = draft.fdpIds || [];
    for (var j = 0; j < legacy.length; j += 1) if (legacy[j] === fdpId) return { fdpId: fdpId, fdpType: fdpTypeById(fdpId), grantCodes: draft.grantCodes || [], beneficiaries: "" };
    return null;
  }

  function fdpTypeById(fdpId) {
    var fdp = findByRecordId(store.fdps, fdpId);
    return fdp ? fdp.fdpType || "" : "";
  }

  function projectFdpTypeOptions() {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.fdps.length; i += 1) {
      if (store.fdps[i].fdpType && !seen[store.fdps[i].fdpType]) {
        seen[store.fdps[i].fdpType] = true;
        out.push(store.fdps[i].fdpType);
      }
    }
    var base = ["Communautaire", "Ecole", "FOSA", "Autre"];
    for (var j = 0; j < base.length; j += 1) if (!seen[base[j]]) out.push(base[j]);
    return out;
  }

  function projectFdpTypeOptionsHtml(selectedValue) {
    var options = projectFdpTypeOptions();
    var html = "";
    for (var i = 0; i < options.length; i += 1) html += optionTag({ value: options[i], label: options[i] }, selectedValue);
    return html;
  }

  function fdpLabel(fdp) {
    if (!fdp) return "";
    return fdp.id + " - " + fdp.name + " / " + fdp.arrondissement;
  }

  function readFoodItems(name) {
    var rows = elements.form.querySelectorAll('[data-food-row]');
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var type = rows[i].getAttribute("data-food-row");
      var checked = rows[i].querySelector('input[name="' + name + '-enabled"]:checked');
      if (!checked) continue;
      out.push({
        type: type,
        otherType: formValue(name + "-" + i + "-other"),
        quantity: roundTo3(formValue(name + "-" + i + "-quantity")),
        bdd: formValue(name + "-" + i + "-bdd"),
        tdd: formValue(name + "-" + i + "-tdd")
      });
    }
    return out;
  }

  function readProjectFdps(name) {
    var rows = elements.form.querySelectorAll("[data-project-fdp-row]");
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var checked = rows[i].querySelector('input[name="' + name + '-enabled"]:checked');
      if (!checked) continue;
      out.push({
        fdpId: checked.value,
        fdpType: rows[i].getAttribute("data-fdp-type") || fdpTypeById(checked.value),
        grantCodes: checkedValues(name + "-" + i + "-grants"),
        beneficiaries: Number(formValue(name + "-" + i + "-beneficiaries") || 0)
      });
    }
    return out;
  }

  function checkedValues(name) {
    var checked = elements.form.querySelectorAll('input[name="' + name + '"]:checked');
    var out = [];
    for (var i = 0; i < checked.length; i += 1) out.push(checked[i].value);
    return out;
  }

  function readProjectPartnerStaff(name) {
    var rows = elements.form.querySelectorAll("[data-project-partner-staff-row]");
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var checked = rows[i].querySelector('input[name="' + name + '-enabled"]:checked');
      if (!checked) continue;
      out.push({
        staffId: checked.value,
        role: formValue(name + "-" + i + "-role"),
        involvementLevel: formValue(name + "-" + i + "-involvementLevel"),
        zone: formValue(name + "-" + i + "-zone"),
        startDate: formValue(name + "-" + i + "-startDate"),
        endDate: formValue(name + "-" + i + "-endDate"),
        comment: formValue(name + "-" + i + "-comment")
      });
    }
    return out;
  }

  function readMonthlyGrantContributions(name) {
    var rows = elements.form.querySelectorAll("[data-monthly-grant-row]");
    var selected = [];
    for (var i = 0; i < rows.length; i += 1) {
      var checked = rows[i].querySelector('input[name="' + name + '-enabled"]:checked');
      if (!checked) continue;
      selected.push({
        grantCode: checked.value,
        contributionPercent: roundTo3(formValue(name + "-" + i + "-percent"))
      });
    }
    if (selected.length === 1 && !selected[0].contributionPercent) selected[0].contributionPercent = 100;
    return selected;
  }

  function readProcessKpiDetails(name) {
    var rows = elements.form.querySelectorAll("[data-process-kpi-row]");
    var out = [];
    for (var i = 0; i < rows.length; i += 1) {
      var kpiId = formValue(name + "-" + i + "-kpiId");
      if (!kpiId) continue;
      var kpi = findByRecordId(store.kpis, kpiId) || {};
      out.push({
        kpiId: kpiId,
        activityId: kpi.activityId || "",
        label: formValue(name + "-" + i + "-label"),
        frequency: formValue(name + "-" + i + "-frequency"),
        dataSource: formValue(name + "-" + i + "-dataSource"),
        target: formValue(name + "-" + i + "-target"),
        responsiblePam: formValue(name + "-" + i + "-responsiblePam"),
        partnerFocalPoint: formValue(name + "-" + i + "-partnerFocalPoint"),
        comment: formValue(name + "-" + i + "-comment")
      });
    }
    return out;
  }

  function projectFdpIds(record) {
    var out = [];
    var items = record.projectFdps || [];
    for (var i = 0; i < items.length; i += 1) out.push(items[i].fdpId);
    return out;
  }

  function projectPartnerStaffIds(record) {
    var out = [];
    var items = record.partnerStaffAssignments || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].staffId) out.push(items[i].staffId);
    return out;
  }

  function formValue(name) {
    var control = elements.form.elements[name];
    return control ? control.value : "";
  }

  function roundTo3(value) {
    var number = Number(value || 0);
    return Math.round(number * 1000) / 1000;
  }

  function insertFieldHtml(config, fieldIndex, html) {
    for (var j = fieldIndex - 1; j >= 0; j -= 1) {
      var previous = elements.form.querySelector('[data-field="' + config.fields[j].name + '"]');
      if (previous) {
        previous.insertAdjacentHTML("afterend", html);
        return;
      }
    }
    elements.form.insertAdjacentHTML("afterbegin", html);
  }

  function refreshDependentFields(config) {
    var draft = readForm(config, true);
    if (state.page === "sites") draft = normalizeSiteDraft(draft);
    if (state.page === "cooperativePartners") draft = normalizeCooperativePartnerDraft(draft);
    if (state.page === "hgsfIngredients") draft = normalizeHgsfIngredientDraft(draft);
    if (state.page === "hgsfSchoolMenus") draft = normalizeHgsfSchoolMenuDraft(draft);
    if (state.page === "hgsfEstimations") draft = normalizeHgsfEstimationDraft(draft);
    if (state.page === "hgsfPurchaseOrders") draft = normalizeHgsfPurchaseOrderDraft(draft);
    if (state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds") draft = normalizeNeedEstimateDraft(draft);
    if (state.page === "monthlyPlans") draft = normalizeMonthlyPlanDraft(draft);
    if (state.page === "monthlyExpenses") draft = normalizeMonthlyExpenseDraft(draft);
    if (state.page === "grantInKinds") draft = normalizeGrantInKindDraft(draft);
    if (state.page === "budgets") draft = normalizeBudgetDraft(draft);
    if (state.page === "stakeholders") draft = normalizeStakeholderLocationDraft(draft);
    if (state.page === "processIndicators") draft = normalizeProcessIndicatorDraft(draft);
    for (var i = 0; i < config.fields.length; i += 1) {
      var field = config.fields[i];
      if (field.dependsOn || field.visibleWhen || field.name === "region" || field.name === "department" || field.name === "arrondissement" || (state.page === "monthlyPlans" && (field.name === "activityId" || field.name === "subActivityId" || field.name === "kpiId" || field.name === "grantContributions" || field.name === "grantCode" || field.name === "localizationLevel" || field.name === "localizationCountry" || field.name === "localizationRegions" || field.name === "localizationDepartments" || field.name === "localizationArrondissements" || field.name === "fdpIds" || field.name === "partnerFocalPoint")) || (state.page === "hgsfEstimations" && (field.name === "applicableDays" || field.name === "schoolRows")) || (state.page === "hgsfPurchaseOrders" && (field.name === "estimationId" || field.name === "cooperativePartnerId" || field.name === "orderLines")) || (state.page === "hgsfIngredients" && field.name === "priceEntries") || (state.page === "processIndicators" && (field.name === "kpiIds" || field.name === "processKpiDetails")) || (state.page === "grantInKinds" && field.name === "kpiIds") || (state.page === "budgets" && field.name === "grantAmounts") || (state.page === "distributionReports" && field.name === "distributionLines") || (state.page === "nfiInventories" && field.name === "inventoryItems") || (state.page === "partnerInvoices" && field.name === "activityGrantAmounts")) {
        var wrapper = elements.form.querySelector('[data-field="' + field.name + '"]');
        var html = renderField(field, draft);
        if (wrapper && html) wrapper.outerHTML = html;
        else if (wrapper && !html) wrapper.parentNode.removeChild(wrapper);
        else if (!wrapper && html) insertFieldHtml(config, i, html);
      }
    }
    if (state.page === "sites") updateGeneratedSiteId();
    if (state.page === "fieldOffices") updateGeneratedFieldOfficeId();
    if (state.page === "fdps") updateGeneratedFdpId();
    if (state.page === "cooperativePartners") updateGeneratedCooperativePartnerId();
    if (state.page === "hgsfIngredients") updateGeneratedHgsfIngredientId();
    if (state.page === "stakeholders") updateGeneratedStakeholderId();
    if (state.page === "partnerStaffs") updateGeneratedPartnerStaffId();
    if (state.page === "projectActivities") updateGeneratedActivityId();
    if (state.page === "projectActivities") updateActivityFocalContact();
    if (state.page === "projectSubActivities") updateGeneratedSubActivityId();
    if (state.page === "kpis") updateGeneratedKpiId();
    if (state.page === "monthlyPlans") updateGeneratedMonthlyPlanId();
    if (state.page === "budgets") updateGeneratedBudgetId();
    if (state.page === "grantInKinds") updateGeneratedGrantInKindId();
    if (state.page === "recommendations") updateGeneratedRecommendationId();
    if (state.page === "partnerInvoices") syncPartnerInvoiceTotal();
    if (state.page === "partnerInvoicePayments") syncPartnerInvoicePaymentFields();
    wireSearchableMultis();
    wireSelectAllButtons();
    wireProjectFdpFilter();
    wireMonthlyGrantContributions();
    wireHgsfMenuItemAddButtons();
    wireRationItemAddButtons();
    wireHgsfEstimationRowButtons();
  }

  function normalizeHgsfSchoolMenuDraft(draft) {
    draft = draft || {};
    draft.id = draft.id || generatedSimpleSequentialId("SCHMENU", store.hgsfSchoolMenus, state.editingId);
    draft.localizationRegions = arrayValue(draft.localizationRegions);
    draft.localizationDepartments = filterValuesByOptions(arrayValue(draft.localizationDepartments), hgsfDepartmentOptions(draft));
    draft.localizationArrondissements = filterValuesByOptions(arrayValue(draft.localizationArrondissements), hgsfArrondissementOptions(draft));
    draft.schoolFdpIds = arrayValue(draft.schoolFdpIds);
    if (draft.schoolFdpId && draft.schoolFdpIds.indexOf(draft.schoolFdpId) < 0) draft.schoolFdpIds.push(draft.schoolFdpId);
    draft.schoolFdpIds = filterValuesByOptions(draft.schoolFdpIds, hgsfSchoolHierarchyOptions(draft));
    draft.menuIds = arrayValue(draft.menuIds);
    return draft;
  }

  function normalizeHgsfIngredientDraft(draft) {
    draft = draft || {};
    draft.country = draft.country || "Cameroon";
    draft.id = draft.id || generatedHgsfIngredientId(draft, state.editingId);
    draft.localizationRegions = arrayValue(draft.localizationRegions);
    if (draft.region && draft.localizationRegions.indexOf(draft.region) < 0) draft.localizationRegions.push(draft.region);
    draft.localizationDepartments = filterValuesByOptions(arrayValue(draft.localizationDepartments || draft.department), hgsfDepartmentOptions(draft));
    draft.localizationArrondissements = filterValuesByOptions(arrayValue(draft.localizationArrondissements || draft.arrondissement), hgsfArrondissementOptions(draft));
    draft.priceEntries = draft.priceEntries || [];
    if (!draft.priceEntries.length && draft.arrondissement) draft.priceEntries = [{ arrondissement: draft.arrondissement, priceXaf: Number(draft.priceXaf || 0) }];
    return draft;
  }

  function normalizeHgsfEstimationDraft(draft) {
    draft = draft || {};
    draft.id = draft.id || generatedHgsfEstimationId({ periodValue: draft.periodValue || currentMonthValue() }, state.editingId);
    draft.periodType = draft.periodType || "Mensuelle";
    draft.periodValue = draft.periodValue || currentMonthValue();
    draft.periodStartDate = draft.periodStartDate || monthDateRange(draft.periodValue).start;
    draft.workdaysOnly = draft.workdaysOnly || "Oui";
    if (draft.coveredDays === undefined || draft.coveredDays === "" || Number(draft.coveredDays || 0) <= 0) draft.coveredDays = hgsfDefaultCoveredDays(draft.periodType);
    draft.applicableDays = arrayValue(draft.applicableDays);
    if (!draft.applicableDays.length) draft.applicableDays = hgsfDefaultApplicableDays(draft);
    draft.localizationRegions = arrayValue(draft.localizationRegions);
    draft.localizationDepartments = filterValuesByOptions(arrayValue(draft.localizationDepartments), hgsfDepartmentOptions(draft));
    draft.localizationArrondissements = filterValuesByOptions(arrayValue(draft.localizationArrondissements), hgsfArrondissementOptions(draft));
    draft.schoolFdpIds = filterValuesByOptions(arrayValue(draft.schoolFdpIds), hgsfSchoolHierarchyOptions(draft));
    draft.schoolRows = draft.schoolRows || [];
    draft.initiatedAt = draft.initiatedAt || draft.createdAt || new Date().toISOString();
    draft.initiatorEmail = draft.initiatorEmail || currentUserEmail();
    return draft;
  }

  function normalizeHgsfPurchaseOrderDraft(draft) {
    draft = draft || {};
    draft.id = draft.id || generatedSimpleSequentialId("BCHGSF", store.hgsfPurchaseOrders, state.editingId);
    draft.schoolFdpIds = filterValuesByOptions(arrayValue(draft.schoolFdpIds), hgsfSchoolHierarchyOptions(draft));
    if (!draft.estimationId) {
      var opts = hgsfEstimationOptionsForPurchaseOrder(draft);
      draft.estimationId = opts.length ? opts[0].value : "";
    }
    if (!draft.cooperativePartnerId) {
      var coopOpts = hgsfCooperativeOptionsForSchools(draft);
      draft.cooperativePartnerId = coopOpts.length ? coopOpts[0].value : "";
    }
    var estimation = findByRecordId(store.hgsfEstimations, draft.estimationId) || {};
    if (!draft.periodFrom && estimation.applicableDays && estimation.applicableDays.length) draft.periodFrom = estimation.applicableDays[0];
    if (!draft.periodTo && estimation.applicableDays && estimation.applicableDays.length) draft.periodTo = estimation.applicableDays[estimation.applicableDays.length - 1];
    if (!draft.applicableDaysCount) draft.applicableDaysCount = estimation.coveredDays || (estimation.applicableDays || []).length || "";
    draft.initiatorName = draft.initiatorName || currentUserLabel();
    draft.initiatedAt = draft.initiatedAt || new Date().toISOString();
    draft.orderLines = draft.orderLines || hgsfDefaultPurchaseOrderLines(draft);
    return draft;
  }

  function normalizeNeedEstimateDraft(draft) {
    draft = draft || {};
    var prefix = state.page === "cbtNeeds" ? "CBT" : state.page === "nutritionNeeds" ? "NUT" : "GFD";
    draft.id = draft.id || generatedSimpleSequentialId(prefix, store[state.page] || [], state.editingId);
    draft.projectId = draft.projectId || firstProjectId();
    draft.modality = draft.modality || (state.page === "cbtNeeds" ? "CBT" : "In kind");
    draft.periodType = draft.periodType || "Mensuelle";
    if (!draft.coveredDays) draft.coveredDays = needDefaultCoveredDays(draft.periodType);
    draft.needScope = draft.needScope || "FDP du projet";
    draft.commodityPercents = draft.commodityPercents || [];
    draft.localizationRegions = arrayValue(draft.localizationRegions);
    draft.localizationDepartments = filterValuesByOptions(arrayValue(draft.localizationDepartments), needProjectDepartmentOptions(draft));
    draft.localizationArrondissements = filterValuesByOptions(arrayValue(draft.localizationArrondissements), needProjectArrondissementOptions(draft));
    draft.fdpIds = filterValuesByOptions(arrayValue(draft.fdpIds), needProjectFdpOptions(draft));
    draft.beneficiaryRows = draft.beneficiaryRows || [];
    if (draft.needScope === "Besoin isole") {
      draft.localizationRegions = [];
      draft.localizationDepartments = [];
      draft.localizationArrondissements = [];
      draft.fdpIds = [];
      draft.beneficiaryRows = [];
    }
    return draft;
  }

  function needDefaultCoveredDays(periodType) {
    var map = { Journaliere: 1, Mensuelle: 30, Trimestrielle: 90, Semestrielle: 180, Annuelle: 365 };
    return map[periodType || "Mensuelle"] || 30;
  }

  function arrayValue(value) {
    if (Object.prototype.toString.call(value) === "[object Array]") return value.slice();
    return value ? [value] : [];
  }

  function filterValuesByOptions(values, options) {
    var allowed = normalizeOptions(options || []).map(function (option) { return String(option.value); });
    var out = [];
    for (var i = 0; i < values.length; i += 1) if (!allowed.length || allowed.indexOf(String(values[i])) > -1) out.push(values[i]);
    return out;
  }

  function normalizeMonthlyPlanDraft(draft) {
    draft = draft || {};
    draft.projectId = draft.projectId || firstProjectId();
    var activityOptions = projectActivitiesForProject(draft.projectId);
    if (!optionValueExists(activityOptions, draft.activityId)) draft.activityId = activityOptions.length ? activityOptions[0].value : "";
    var subActivityOptions = subActivitiesForActivity(draft.activityId);
    if (!optionValueExists(subActivityOptions, draft.subActivityId)) draft.subActivityId = "";
    var kpiOptions = monthlyPlanKpiOptions(draft);
    if (!optionValueExists(kpiOptions, draft.kpiId)) draft.kpiId = kpiOptions.length ? kpiOptions[0].value : "";
    var grantOptions = monthlyGrantOptions(draft);
    if (!optionValueExists(grantOptions, draft.grantCode)) draft.grantCode = grantOptions.length ? grantOptions[0].value : "";
    draft.grantContributions = normalizeGrantContributionsDraft(draft);
    draft.localizedActivity = draft.localizedActivity || "Non";
    draft.localizationLevel = draft.localizationLevel || draft.siteReferenceType || "FDP";
    draft.localizationCountry = draft.localizationCountry || "Cameroon";
    var planRange = monthDateRange(draft.month || currentMonthValue());
    if (!draft.plannedStartDate) draft.plannedStartDate = planRange.start;
    if (!draft.plannedEndDate) draft.plannedEndDate = planRange.end;
    normalizeMonthlyLocationDraft(draft);
    return draft;
  }

  function normalizeMonthlyExpenseDraft(draft) {
    draft = draft || {};
    draft.projectId = draft.projectId || firstProjectId();
    draft.month = draft.month || currentMonthValue();
    var categoryOptions = budgetCategoriesForProject(draft.projectId);
    if (!optionValueExists(categoryOptions, draft.costCategory)) draft.costCategory = categoryOptions.length ? categoryOptions[0].value || categoryOptions[0] : "";
    var subOptions = budgetSubCategoriesForExpense(draft);
    if (!optionValueExists(subOptions, draft.subCategory)) draft.subCategory = subOptions.length ? subOptions[0].value || subOptions[0] : "";
    var lineOptions = budgetLinesForExpense(draft);
    if (!optionValueExists(lineOptions, draft.budgetLineId)) draft.budgetLineId = lineOptions.length ? lineOptions[0].value : "";
    var line = findByRecordId(store.budgets, draft.budgetLineId);
    if (line) {
      draft.costCategory = line.costCategory || draft.costCategory;
      draft.subCategory = line.subCategory || draft.subCategory;
      draft.projectId = line.projectId || draft.projectId;
    }
    var grantOptions = grantOptionsForBudgetLine(draft.budgetLineId, draft.projectId);
    if (!optionValueExists(grantOptions, draft.grantCode)) draft.grantCode = grantOptions.length ? grantOptions[0].value : "";
    return draft;
  }

  function normalizeBudgetDraft(draft) {
    draft = draft || {};
    draft.projectId = draft.projectId || firstProjectId();
    var project = findByRecordId(store.projects, draft.projectId) || {};
    draft.partnerVendor = project.partnerVendor || draft.partnerVendor || "";
    draft.grantAmounts = draft.grantAmounts || [];
    return draft;
  }

  function normalizeMonthlyLocationDraft(draft) {
    if (draft.localizedActivity !== "Oui") return;
    if ((!draft.localizationArrondissements || !draft.localizationArrondissements.length) && draft.siteIds && draft.siteIds.length) draft.localizationArrondissements = draft.siteIds.slice();
    if ((!draft.localizationArrondissements || !draft.localizationArrondissements.length) && draft.arrondissement) draft.localizationArrondissements = [draft.arrondissement];
    if ((!draft.localizationArrondissements || !draft.localizationArrondissements.length) && draft.fdpIds && draft.fdpIds.length) draft.localizationArrondissements = arrondissementsForFdps(draft.fdpIds);
    var regionOptionsList = monthlyRegionOptions(draft);
    draft.localizationRegions = filterValidValues(draft.localizationRegions || [], regionOptionsList);
    var departmentOptionsList = monthlyDepartmentOptions(draft);
    draft.localizationDepartments = filterValidValues(draft.localizationDepartments || [], departmentOptionsList);
    var arrondissementOptionsList = monthlyArrondissementHierarchyOptions(draft);
    draft.localizationArrondissements = filterValidValues(draft.localizationArrondissements || [], arrondissementOptionsList);
    var fdpOptionsList = monthlyFdpHierarchyOptions(draft);
    draft.fdpIds = filterValidValues(draft.fdpIds || [], fdpOptionsList);
  }

  function normalizeStakeholderLocationDraft(draft) {
    draft = draft || {};
    draft.localizedStakeholder = draft.localizedStakeholder || "Non";
    draft.localizationLevel = draft.localizationLevel || "FDP";
    draft.localizationCountry = draft.localizationCountry || "Cameroon";
    if (draft.localizedStakeholder !== "Oui") return draft;
    if ((!draft.localizationArrondissements || !draft.localizationArrondissements.length) && draft.siteIds && draft.siteIds.length) draft.localizationArrondissements = draft.siteIds.slice();
    if ((!draft.localizationArrondissements || !draft.localizationArrondissements.length) && draft.fdpIds && draft.fdpIds.length) draft.localizationArrondissements = arrondissementsForFdps(draft.fdpIds);
    var regionOptionsList = monthlyRegionOptions(draft);
    draft.localizationRegions = filterValidValues(draft.localizationRegions || [], regionOptionsList);
    var departmentOptionsList = monthlyDepartmentOptions(draft);
    draft.localizationDepartments = filterValidValues(draft.localizationDepartments || [], departmentOptionsList);
    var arrondissementOptionsList = monthlyArrondissementHierarchyOptions(draft);
    draft.localizationArrondissements = filterValidValues(draft.localizationArrondissements || [], arrondissementOptionsList);
    var fdpOptionsList = monthlyFdpHierarchyOptions(draft);
    draft.fdpIds = filterValidValues(draft.fdpIds || [], fdpOptionsList);
    return draft;
  }

  function normalizeProcessIndicatorDraft(draft) {
    draft = draft || {};
    draft.projectId = draft.projectId || firstProjectId();
    if ((!draft.kpiIds || !draft.kpiIds.length) && draft.kpiId) draft.kpiIds = [draft.kpiId];
    draft.kpiIds = filterValidValues(draft.kpiIds || [], kpisForProject(draft.projectId));
    if ((!draft.processKpiDetails || !draft.processKpiDetails.length) && draft.kpiId) {
      draft.processKpiDetails = [{
        kpiId: draft.kpiId,
        activityId: draft.activityId || "",
        label: draft.label || "",
        frequency: draft.frequency || "",
        dataSource: draft.dataSource || "",
        target: draft.target || "",
        responsiblePam: draft.responsiblePam || "",
        partnerFocalPoint: draft.partnerFocalPoint || "",
        comment: draft.comment || ""
      }];
    }
    var filtered = [];
    var details = draft.processKpiDetails || [];
    for (var i = 0; i < details.length; i += 1) if (draft.kpiIds.indexOf(details[i].kpiId) > -1) filtered.push(details[i]);
    draft.processKpiDetails = filtered;
    return draft;
  }

  function arrondissementsForFdps(fdpIds) {
    var seen = {};
    var out = [];
    fdpIds = fdpIds || [];
    for (var i = 0; i < fdpIds.length; i += 1) {
      var fdp = findByRecordId(store.fdps, fdpIds[i]);
      if (fdp && fdp.arrondissement && !seen[fdp.arrondissement]) {
        seen[fdp.arrondissement] = true;
        out.push(fdp.arrondissement);
      }
    }
    return out;
  }

  function filterValidValues(values, options) {
    var allowed = {};
    var normalized = normalizeOptions(options || []);
    for (var i = 0; i < normalized.length; i += 1) allowed[normalized[i].value] = true;
    var out = [];
    values = values || [];
    for (var j = 0; j < values.length; j += 1) if (allowed[values[j]]) out.push(values[j]);
    return out;
  }

  function normalizeGrantContributionsDraft(draft) {
    var source = draft.grantContributions || [];
    if ((!source || !source.length) && draft.grantCode) source = [{ grantCode: draft.grantCode, contributionPercent: 100 }];
    if ((!source || !source.length) && draft.grantCodes && draft.grantCodes.length) {
      source = [];
      for (var g = 0; g < draft.grantCodes.length; g += 1) source.push({ grantCode: draft.grantCodes[g], contributionPercent: draft.grantCodes.length === 1 ? 100 : "" });
    }
    var options = monthlyGrantOptions(draft);
    var allowed = {};
    for (var i = 0; i < options.length; i += 1) allowed[options[i].value] = true;
    var out = [];
    for (var j = 0; j < source.length; j += 1) {
      var code = source[j].grantCode || source[j].code || source[j];
      if (!code || (draft.projectId && !allowed[code])) continue;
      out.push({ grantCode: code, contributionPercent: source[j].contributionPercent === "" || source[j].contributionPercent === undefined ? "" : roundTo3(source[j].contributionPercent) });
    }
    if (out.length === 1 && !out[0].contributionPercent) out[0].contributionPercent = 100;
    return out;
  }

  function monthlyGrantCodes(record) {
    var out = [];
    var items = record.grantContributions || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].grantCode) out.push(items[i].grantCode);
    return out;
  }

  function optionValueExists(options, value) {
    if (!value) return false;
    var normalized = normalizeOptions(options || []);
    for (var i = 0; i < normalized.length; i += 1) if (normalized[i].value === value) return true;
    return false;
  }

  function wireSearchableMultis() {
    var searches = elements.form.querySelectorAll("[data-search-for]");
    for (var i = 0; i < searches.length; i += 1) {
      searches[i].oninput = function () {
        var term = this.value.toLowerCase();
        var field = parentByClass(this, "multi-field");
        var labels = field ? field.querySelectorAll(".check-list label") : [];
        for (var j = 0; j < labels.length; j += 1) labels[j].style.display = labels[j].textContent.toLowerCase().indexOf(term) > -1 ? "" : "none";
      };
    }
  }

  function wireSelectAllButtons() {
    var buttons = elements.form.querySelectorAll("[data-select-all-for]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var name = this.getAttribute("data-select-all-for");
        var field = parentByClass(this, "multi-field");
        var checks = field ? field.querySelectorAll('input[name="' + name + '"]') : [];
        for (var j = 0; j < checks.length; j += 1) checks[j].checked = true;
      };
    }
  }

  function wireProjectFdpFilter() {
    var filter = elements.form.querySelector("[data-project-fdp-filter]");
    if (!filter) return;
    filter.onchange = function () {
      var rows = elements.form.querySelectorAll("[data-project-fdp-row]");
      for (var i = 0; i < rows.length; i += 1) {
        rows[i].style.display = !this.value || rows[i].getAttribute("data-fdp-type") === this.value ? "" : "none";
      }
    };
  }

  function wireMonthlyGrantContributions() {
    var rows = elements.form.querySelectorAll("[data-monthly-grant-row]");
    if (!rows.length) return;
    for (var i = 0; i < rows.length; i += 1) {
      var checkbox = rows[i].querySelector('input[type="checkbox"]');
      if (checkbox) checkbox.onchange = applySingleMonthlyGrantDefault;
    }
    applySingleMonthlyGrantDefault();
  }

  function wireHgsfMenuItemAddButtons() {
    var buttons = elements.form ? elements.form.querySelectorAll("[data-add-hgsf-menu-line]") : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var name = this.getAttribute("data-add-hgsf-menu-line");
        var body = elements.form.querySelector('[data-hgsf-menu-items="' + name + '"]');
        if (!body) return;
        body.insertAdjacentHTML("beforeend", hgsfMenuItemRowHtml(name, hgsfUniqueIngredientOptions(), {}));
      };
    }
  }

  function wireHgsfDaysSyncButton() {
    var button = elements.form ? elements.form.querySelector("[data-sync-hgsf-days]") : null;
    if (!button) return;
    button.onclick = function () {
      syncHgsfCoveredDaysWithChecks();
      refreshDependentFields(configs.hgsfEstimations);
    };
  }

  function wireRationItemAddButtons() {
    var buttons = elements.form ? elements.form.querySelectorAll("[data-add-ration-line]") : [];
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var name = this.getAttribute("data-add-ration-line");
        var body = elements.form.querySelector('[data-ration-items="' + name + '"]');
        if (!body) return;
        body.insertAdjacentHTML("beforeend", rationItemRowHtml(name, {}));
      };
    }
  }

  function wireHgsfEstimationRowButtons() {
    if (!elements.form) return;
    var addButtons = elements.form.querySelectorAll("[data-add-hgsf-estimation-lines]");
    for (var i = 0; i < addButtons.length; i += 1) {
      addButtons[i].onclick = function () {
        var name = this.getAttribute("data-add-hgsf-estimation-lines");
        var body = elements.form.querySelector('[data-hgsf-estimation-rows="' + name + '"]');
        if (!body) return;
        var selectedSchools = checkedValues("schoolFdpIds");
        var selectedDays = checkedValues("applicableDays");
        if (!selectedSchools.length || !selectedDays.length) {
          window.alert("Selectionner au moins une ecole et un jour applicable.");
          return;
        }
        var existing = {};
        var rows = elements.form.querySelectorAll("[data-hgsf-estimation-row]");
        for (var r = 0; r < rows.length; r += 1) {
          var school = rows[r].querySelector('select[name="' + name + '-school"]');
          var day = rows[r].querySelector('select[name="' + name + '-day"]');
          if (school && day && school.value && day.value) existing[school.value + "::" + day.value] = true;
        }
        var currentDraft = readForm(configs.hgsfEstimations, true);
        var schools = hgsfSelectedSchoolOptions(currentDraft);
        var dayOptions = hgsfSelectedDayOptions(currentDraft);
        var added = "";
        for (var s = 0; s < selectedSchools.length; s += 1) {
          for (var d = 0; d < selectedDays.length; d += 1) {
            var key = selectedSchools[s] + "::" + selectedDays[d];
            if (existing[key]) continue;
            added += hgsfEstimationRowHtml(name, { schoolFdpId: selectedSchools[s], day: selectedDays[d] }, schools, dayOptions);
          }
        }
        if (!added) return;
        var empty = body.querySelector(".empty-row");
        if (empty) empty.parentNode.removeChild(empty);
        body.insertAdjacentHTML("beforeend", added);
        wireHgsfEstimationRowButtons();
      };
    }
    var removeButtons = elements.form.querySelectorAll("[data-remove-hgsf-estimation-row]");
    for (var j = 0; j < removeButtons.length; j += 1) {
      removeButtons[j].onclick = function () {
        var row = parentByAttribute(this, "data-hgsf-estimation-row");
        if (row && row.parentNode) row.parentNode.removeChild(row);
      };
    }
  }

  function updateHgsfEstimationRowMenuOptions(schoolSelect) {
    var row = parentByAttribute(schoolSelect, "data-hgsf-estimation-row");
    if (!row) return;
    var menu = row.querySelector('select[name="schoolRows-menu"]');
    if (!menu) return;
    updateSelectOptions(menu, hgsfMenuOptionsForSchool(schoolSelect.value));
    var status = row.querySelector("[data-hgsf-menu-status]");
    if (status) status.textContent = hgsfMenuStatusForSchool(schoolSelect.value);
    var students = row.querySelector('input[name="schoolRows-students"]');
    if (students && !students.value) students.value = defaultStudentsForSchool(schoolSelect.value) || "";
  }

  function updateHgsfOrderLineCost(quantityInput) {
    var row = parentByAttribute(quantityInput, "data-hgsf-order-line");
    if (!row) return;
    var ingredientInput = row.querySelector('input[name="orderLines-ingredient"]');
    var costInput = row.querySelector('input[name="orderLines-cost"]');
    var estimation = findByRecordId(store.hgsfEstimations, formValue("estimationId")) || {};
    var calc = hgsfEstimateNeeds(estimation);
    var unit = 0;
    for (var i = 0; i < calc.summary.length; i += 1) {
      if (calc.summary[i].ingredient === ingredientInput.value && Number(calc.summary[i].quantity || 0) > 0) unit = Number(calc.summary[i].cost || 0) / Number(calc.summary[i].quantity || 1);
    }
    if (costInput) costInput.value = Math.round(Number(quantityInput.value || 0) * unit);
  }

  function applySingleMonthlyGrantDefault() {
    var checked = elements.form.querySelectorAll('[data-monthly-grant-row] input[type="checkbox"]:checked');
    if (checked.length !== 1) return;
    var row = parentByAttribute(checked[0], "data-monthly-grant-row");
    var percent = row ? row.querySelector('input[type="number"]') : null;
    if (percent && !percent.value) percent.value = "100";
  }

  function readForm(config, partial) {
    var record = {};
    for (var i = 0; i < config.fields.length; i += 1) {
      var field = config.fields[i];
      if (field.type === "multi") {
        var checked = elements.form.querySelectorAll('input[name="' + field.name + '"]:checked');
        record[field.name] = [];
        for (var c = 0; c < checked.length; c += 1) record[field.name].push(checked[c].value);
      } else if (field.type === "foodItems") {
        record[field.name] = readFoodItems(field.name);
      } else if (field.type === "projectFdps") {
        record[field.name] = readProjectFdps(field.name);
      } else if (field.type === "projectPartnerStaff") {
        record[field.name] = readProjectPartnerStaff(field.name);
      } else if (field.type === "monthlyGrantContributions") {
        record[field.name] = readMonthlyGrantContributions(field.name);
      } else if (field.type === "processKpiDetails") {
        record[field.name] = readProcessKpiDetails(field.name);
      } else if (field.type === "budgetGrantAmounts") {
        record[field.name] = readBudgetGrantAmounts(field.name);
      } else if (field.type === "hgsfMenuItems") {
        record[field.name] = readHgsfMenuItems(field.name);
      } else if (field.type === "hgsfIngredientPrices") {
        record[field.name] = readHgsfIngredientPrices(field.name);
      } else if (field.type === "hgsfApplicableDays") {
        record[field.name] = checkedValues(field.name);
      } else if (field.type === "hgsfEstimationRows") {
        record[field.name] = readHgsfEstimationRows(field.name);
      } else if (field.type === "hgsfPurchaseOrderLines") {
        record[field.name] = readHgsfPurchaseOrderLines(field.name);
      } else if (field.type === "rationItems") {
        record[field.name] = readRationItems(field.name);
      } else if (field.type === "needCommodityPercents") {
        record[field.name] = readNeedCommodityPercents(field.name);
      } else if (field.type === "needBeneficiaryRows") {
        record[field.name] = readNeedBeneficiaryRows(field.name);
      } else if (field.type === "distributionLines") {
        record[field.name] = readDistributionLines(field.name);
      } else if (field.type === "nfiInventoryItems") {
        record[field.name] = readNfiInventoryItems(field.name);
      } else if (field.type === "partnerInvoiceAmounts") {
        record[field.name] = readPartnerInvoiceAmounts(field.name);
      } else {
        if (workflowPage(state.page) && field.name === "status") continue;
        var control = elements.form.elements[field.name];
        var value = control ? control.value : "";
        record[field.name] = field.type === "number" && value !== "" ? Number(value) : value;
      }
    }
    if (state.page === "projects") {
      delete record.grantCode;
      record.fdpIds = projectFdpIds(record);
      record.partnerStaffIds = projectPartnerStaffIds(record);
    }
    if (state.page === "projectActivities") delete record.grantCode;
    if (!partial) record.createdAt = new Date().toISOString();
    return record;
  }

  function renderTable(config, records) {
    if (state.page === "monthlyPlans") {
      renderMonthlyPlansGroupedTable(records);
      return;
    }
    if (state.page === "budgets") {
      renderBudgetGroupedTable(records);
      return;
    }
    if (state.page === "monthlyReports" || state.page === "monthlyExpenses" || state.page === "processReports") {
      renderExecutionGroupedTable(records);
      return;
    }
    var hasActions = workflowPage(state.page) || state.page === "monthlyReports" || state.page === "monthlyExpenses" || state.page === "processReports" || state.page === "amendments" || state.page === "users";
    var columns = tableColumns(config);
    updateBudgetRegisterTotal(records);
    var head = "<tr>";
    for (var i = 0; i < columns.length; i += 1) head += "<th>" + labelize(columns[i]) + "</th>";
    if (hasActions) head += "<th>Actions</th>";
    elements.tableHead.innerHTML = head + "</tr>";
    if (!records.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="' + (columns.length + (hasActions ? 1 : 0)) + '"><p class="muted">Aucun enregistrement pour le moment.</p></td></tr>';
      return;
    }
    var body = "";
    for (var r = 0; r < records.length; r += 1) {
      body += "<tr>";
      for (var c = 0; c < columns.length; c += 1) {
        var column = columns[c];
        var value = workflowPage(state.page) && column === "status" ? normalizeWorkflowStatus(records[r][column]) : records[r][column];
        if (state.page === "grants" && column === "grantModality") value = grantModalityLabel(records[r]);
        if (state.page === "hgsfIngredients" && column === "priceEntries") value = (records[r].priceEntries || []).length + " arrondissement(s)";
        if (state.page === "hgsfMenus" && column === "menuItems") value = hgsfMenuItemsLabel(records[r]);
        if (state.page === "hgsfSchoolMenus" && column === "schoolFdpIds") value = hgsfSchoolIdsLabel(records[r].schoolFdpIds || (records[r].schoolFdpId ? [records[r].schoolFdpId] : []));
        if (state.page === "hgsfEstimations" && column === "createdAt") value = formatDateTime(records[r].initiatedAt || records[r].createdAt || "");
        if (state.page === "hgsfEstimations" && column === "schoolFdpIds") value = hgsfSchoolIdsLabel(records[r].schoolFdpIds || hgsfSchoolsFromRows(records[r].schoolRows || []));
        if (state.page === "hgsfEstimations" && column === "schoolRows") value = (records[r].schoolRows || []).length + " ligne(s)";
        if (state.page === "hgsfPurchaseOrders" && column === "schoolFdpIds") value = hgsfSchoolIdsLabel(records[r].schoolFdpIds || []);
        if (state.page === "hgsfPurchaseOrders" && column === "periodFrom") value = (records[r].periodFrom || "") + " - " + (records[r].periodTo || "");
        if (state.page === "staffs" && column === "fieldOfficeId") value = fieldOfficeLabel(records[r][column]);
        if (column === "portfolioId") value = resolveReferenceLabel("portfolioId", records[r][column]);
        if (column === "programmeId") value = resolveReferenceLabel("programmeId", records[r][column]);
        if (column === "ownerId" || column === "managerId") value = resolveReferenceLabel("staffId", records[r][column]);
        if (column === "strategicDocumentId") value = resolveReferenceLabel("strategicDocumentId", records[r][column]);
        if (state.page === "projects" && column === "fdpIds") value = projectFdpsLabel(records[r]);
        if (state.page === "monthlyPlans" && column === "grantContributions") value = monthlyGrantContributionsLabel(records[r]);
        if (state.page === "monthlyPlans" && column === "subActivityLabel") value = subActivityLabel(records[r].subActivityId);
        if (state.page === "monthlyPlans" && column === "kpiLabel") value = kpiLabel(records[r].kpiId);
        if (state.page === "processIndicators" && column === "kpiId") value = kpiLabel(records[r].kpiId);
        if (state.page === "recommendations" && column === "actionUpdate") value = recommendationActionSummary(records[r]);
        if (state.page === "distributionReports" && column === "distributionLines") value = (records[r].distributionLines || []).length + " FDP(s)";
        if (state.page === "nfiInventories" && column === "inventoryItems") value = (records[r].inventoryItems || []).length + " NFI(s)";
        if (state.page === "partnerInvoices" && column === "activityGrantAmounts") value = (records[r].activityGrantAmounts || []).length + " ligne(s)";
        if (state.page === "partnerInvoices" && column === "invoiceTotalXaf") value = moneyText(Number(records[r].invoiceTotalXaf || 0), recordCurrency(records[r], "partnerInvoices"));
        body += "<td>" + formatCell(value) + "</td>";
      }
      if (hasActions) body += '<td><div class="row-actions">' + reportActions(recordKey(records[r])) + "</div></td>";
      body += "</tr>";
    }
    elements.tableBody.innerHTML = body;
    wireReportActions();
  }

  function updateBudgetRegisterTotal(records) {
    if (state.page !== "budgets") return;
    var budgetTarget = document.getElementById("budget-filter-total");
    var cpTarget = document.getElementById("budget-cp-total");
    var cpPercentTarget = document.getElementById("budget-cp-percent");
    var grandTarget = document.getElementById("budget-grand-total");
    if (!budgetTarget) return;
    var budgetGrantFilter = document.getElementById("filter-budget-grant");
    var selectedGrant = budgetGrantFilter ? budgetGrantFilter.value : "";
    var budgetTotal = 0;
    var cpTotal = 0;
    for (var i = 0; i < records.length; i += 1) {
      var totals = budgetLineContributionTotals(records[i], selectedGrant);
      budgetTotal += totals.pamTotal;
      cpTotal += totals.cpTotal;
    }
    var grandTotal = budgetTotal + cpTotal;
    var cpPercent = grandTotal ? Math.round((cpTotal / grandTotal) * 1000) / 10 : 0;
    var currencyProject = document.getElementById("filter-budget-project");
    var currency = projectCurrency(currencyProject && currencyProject.value || (records[0] && records[0].projectId) || state.contextProjectId || "");
    budgetTarget.textContent = moneyText(budgetTotal, currency);
    if (cpTarget) cpTarget.textContent = moneyText(cpTotal, currency);
    if (cpPercentTarget) cpPercentTarget.textContent = "(" + formatDecimal(cpPercent, 1) + "%)";
    if (grandTarget) grandTarget.textContent = moneyText(grandTotal, currency);
  }

  function renderMonthlyPlansGroupedTable(records) {
    var groups = monthlyPlanGroups(records);
    elements.tableCount.textContent = groups.length;
    elements.tableHead.innerHTML = "<tr><th>ID plan mensuel</th><th>Mois</th><th>ID Projet</th><th>Lignes detaillees</th><th>Statut</th><th>Actions</th></tr>";
    if (!groups.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="6"><p class="muted">Aucun plan mensuel pour le moment.</p></td></tr>';
      return;
    }
    var body = "";
    for (var i = 0; i < groups.length; i += 1) {
      body += "<tr>" +
        "<td>" + escapeHtml(groups[i].id) + "</td>" +
        "<td>" + escapeHtml(groups[i].month) + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("projectId", groups[i].projectId)) + "</td>" +
        "<td>" + groups[i].items.length + " activite(s) / KPI</td>" +
        "<td>" + escapeHtml(groups[i].statusLabel) + "</td>" +
        '<td><div class="row-actions">' + monthlyPlanGroupActions(groups[i]) + "</div></td>" +
        "</tr>";
    }
    elements.tableBody.innerHTML = body;
    wireMonthlyPlanGroupActions();
  }

  function renderBudgetGroupedTable(records) {
    var groups = budgetGroups(records);
    updateBudgetRegisterTotal(records);
    elements.tableCount.textContent = groups.length;
    elements.tableHead.innerHTML = "<tr><th>ID Projet</th><th>Contribution organisation</th><th>Contribution CP</th><th>Budget total</th><th>Lignes</th><th>Statut</th><th>Actions</th></tr>";
    if (!groups.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="7"><p class="muted">Aucun budget pour le moment.</p></td></tr>';
      return;
    }
    var body = "";
    for (var i = 0; i < groups.length; i += 1) {
      var groupCurrency = projectCurrency(groups[i].projectId);
      body += "<tr><td>" + escapeHtml(resolveReferenceLabel("projectId", groups[i].projectId)) + "</td><td>" + moneyText(groups[i].pamTotal, groupCurrency) + "</td><td>" + moneyText(groups[i].cpTotal, groupCurrency) + "</td><td>" + moneyText(groups[i].total, groupCurrency) + "</td><td>" + groups[i].items.length + "</td><td>" + escapeHtml(groups[i].statusLabel) + "</td><td><div class=\"row-actions\">" + budgetGroupActions(groups[i]) + "</div></td></tr>";
    }
    elements.tableBody.innerHTML = body;
    wireBudgetGroupActions();
  }

  function budgetGroups(records) {
    var map = {};
    var out = [];
    var budgetGrantFilter = document.getElementById("filter-budget-grant");
    var selectedGrant = budgetGrantFilter ? budgetGrantFilter.value : "";
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var key = record.projectId || "";
      if (!map[key]) {
        map[key] = { projectId: key, items: [], pamTotal: 0, cpTotal: 0, total: 0 };
        out.push(map[key]);
      }
      map[key].items.push(record);
      var totals = budgetLineContributionTotals(record, selectedGrant);
      map[key].pamTotal += totals.pamTotal;
      map[key].cpTotal += totals.cpTotal;
      map[key].total += totals.total;
    }
    for (var j = 0; j < out.length; j += 1) applyBudgetGroupStatus(out[j]);
    return out;
  }

  function applyBudgetGroupStatus(group) {
    var statuses = {};
    for (var i = 0; i < group.items.length; i += 1) statuses[normalizeWorkflowStatus(group.items[i].status)] = true;
    var keys = Object.keys(statuses);
    group.statusLabel = keys.length === 1 ? keys[0] : "Mixte";
    if (statuses.Draft || statuses.Returned) group.status = "Draft";
    else if (statuses.Submitted) group.status = "Submitted";
    else if (statuses.Verified) group.status = "Verified";
    else group.status = "Validated";
  }

  function budgetGroupActions(group) {
    var projectId = escapeHtml(group.projectId);
    var html = '<button type="button" data-budget-action="print" data-project="' + projectId + '">Imprimer</button>';
    html += '<button type="button" data-budget-action="details" data-project="' + projectId + '">Lignes / modifier</button>';
    html += '<button type="button" data-budget-action="bulk" data-project="' + projectId + '">Bulk creation</button>';
    if (group.status === "Draft" || group.status === "Returned") html += '<button type="button" data-budget-action="submit" data-project="' + projectId + '">Soumettre</button><button type="button" data-budget-action="delete" data-project="' + projectId + '">Supprimer</button>';
    else if (group.status === "Submitted") html += '<button type="button" data-budget-action="verify" data-project="' + projectId + '">Verifier</button><button type="button" data-budget-action="return" data-project="' + projectId + '">Renvoyer</button>';
    else if (group.status === "Verified") html += '<button type="button" data-budget-action="approve" data-project="' + projectId + '">Valider</button><button type="button" data-budget-action="return" data-project="' + projectId + '">Renvoyer</button>';
    else if (group.status === "Validated") html += '<button type="button" data-budget-action="return" data-project="' + projectId + '">Renvoyer</button>';
    return html;
  }

  function wireBudgetGroupActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-budget-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var projectId = this.getAttribute("data-project");
        handleBudgetGroupAction(this.getAttribute("data-budget-action"), projectId);
      };
    }
  }

  function handleBudgetGroupAction(action, projectId) {
    if (action === "print") {
      showBudgetGroupPreview(projectId, true);
      return;
    }
    if (action === "details") {
      showBudgetLineManager(projectId);
      return;
    }
    if (action === "bulk") {
      openBudgetBulkDialog(projectId);
      return;
    }
    var items = [];
    for (var i = 0; i < store.budgets.length; i += 1) if (store.budgets[i].projectId === projectId) items.push(store.budgets[i]);
    if (!items.length) return;
    var group = { projectId: projectId, items: items };
    applyBudgetGroupStatus(group);
    if (action === "delete") {
      if (window.confirm && !window.confirm("Supprimer tout le budget detaille de ce projet ?")) return;
      for (var d = store.budgets.length - 1; d >= 0; d -= 1) if (store.budgets[d].projectId === projectId) store.budgets.splice(d, 1);
      render();
      return;
    }
    if (!(action === "return" && group.status === "Validated") && !validWorkflowMove(group.status, action)) {
      window.alert("Workflow attendu: Draft -> Soumettre -> Verifier -> Valider.");
      return;
    }
    if (action === "return" && !recordReturnReasonForItems(items, "budget du projet")) return;
    var nextStatus = action === "submit" ? "Submitted" : action === "verify" ? "Verified" : action === "approve" ? "Validated" : "Returned";
    for (var j = 0; j < items.length; j += 1) items[j].status = nextStatus;
    render();
  }

  function showBudgetLineManager(projectId) {
    var project = findByRecordId(store.projects, projectId) || {};
    var items = [];
    for (var i = 0; i < store.budgets.length; i += 1) if (store.budgets[i].projectId === projectId) items.push(store.budgets[i]);
    elements.tableTitle.textContent = "Lignes budgetaires - " + (project.title || projectId);
    elements.tableCount.textContent = items.length;
    elements.tableHead.innerHTML = "<tr><th>ID ligne</th><th>Libelle</th><th>Categorie</th><th>Sous categorie</th><th>Montants par grant</th><th>Total</th><th>Statut</th><th>Actions</th></tr>";
    var rows = "";
    for (var r = 0; r < items.length; r += 1) {
      var id = escapeHtml(recordKey(items[r]));
      var totals = budgetLineContributionTotals(items[r]);
      rows += "<tr><td>" + escapeHtml(items[r].id || "") + "</td><td>" + escapeHtml(items[r].label || "") + "</td><td>" + escapeHtml(items[r].costCategory || "") + "</td><td>" + escapeHtml(items[r].subCategory || "") + "</td><td>" + escapeHtml(budgetGrantAmountsLabel(items[r])) + "</td><td>" + moneyText(totals.total, projectCurrency(projectId)) + "</td><td>" + escapeHtml(normalizeWorkflowStatus(items[r].status)) + '</td><td><div class="row-actions"><button type="button" data-budget-line-action="edit" data-budget-id="' + id + '">Modifier</button><button type="button" data-budget-line-action="delete" data-budget-id="' + id + '">Supprimer</button></div></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="8">Aucune ligne budgetaire.</td></tr>';
    elements.tableBody.innerHTML = rows + '<tr><td colspan="8"><button type="button" id="budget-lines-back">Retour au budget par projet</button></td></tr>';
    var back = document.getElementById("budget-lines-back");
    if (back) back.onclick = function () { render(); };
    wireBudgetLineManagerActions();
  }

  function wireBudgetLineManagerActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-budget-line-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var action = this.getAttribute("data-budget-line-action");
        var id = this.getAttribute("data-budget-id");
        if (action === "edit") {
          state.editingId = id;
          state.formOpen = true;
          render();
          return;
        }
        if (action === "delete") {
          if (window.confirm && !window.confirm("Supprimer cette ligne budgetaire ?")) return;
          removeRecord(store.budgets, id);
          render();
        }
      };
    }
  }

  function showBudgetGroupPreview(projectId, shouldPrint) {
    var items = [];
    for (var i = 0; i < store.budgets.length; i += 1) if (store.budgets[i].projectId === projectId) items.push(store.budgets[i]);
    var rows = "";
    var total = 0;
    var pamTotal = 0;
    var cpTotal = 0;
    for (var r = 0; r < items.length; r += 1) {
      var totals = budgetLineContributionTotals(items[r]);
      total += totals.total;
      pamTotal += totals.pamTotal;
      cpTotal += totals.cpTotal;
      rows += "<tr><td>" + escapeHtml(items[r].id || "") + "</td><td>" + escapeHtml(items[r].label || "") + "</td><td>" + escapeHtml(items[r].costCategory || "") + "</td><td>" + escapeHtml(items[r].subCategory || "") + "</td><td>" + escapeHtml(budgetGrantAmountsLabel(items[r])) + "</td><td>" + moneyText(totals.total, projectCurrency(projectId)) + "</td><td>" + escapeHtml(normalizeWorkflowStatus(items[r].status)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="7">Aucune ligne budgetaire.</td></tr>';
    else rows += '<tr><th colspan="5">Contribution organisation</th><th>' + moneyText(pamTotal, projectCurrency(projectId)) + '</th><th></th></tr><tr><th colspan="5">Contribution CP</th><th>' + moneyText(cpTotal, projectCurrency(projectId)) + '</th><th></th></tr><tr><th colspan="5">Budget total</th><th>' + moneyText(total, projectCurrency(projectId)) + '</th><th></th></tr>';
    var project = findByRecordId(store.projects, projectId) || {};
    var printButton = shouldPrint ? '<button onclick="window.print()" style="min-height:40px;border:0;border-radius:8px;padding:0 14px;background:#007dbc;color:#fff;font-weight:700;margin-bottom:16px">Lancer l\\\'impression</button>' : "";
    var html = '<!doctype html><html><head><title>Budget detaille</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2a44}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #c9d9e5;padding:8px;text-align:left;vertical-align:top}th{background:#e3f2f8}@media print{button{display:none}}</style></head><body>' + printButton + '<h1>Budget detaille</h1><p><strong>Projet:</strong> ' + escapeHtml(projectId + (project.title ? " - " + project.title : "")) + '</p><table><thead><tr><th>ID</th><th>Libelle</th><th>Categorie</th><th>Sous categorie</th><th>Montants par grant</th><th>Total</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table></body></html>';
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  function budgetGrantAmountsLabel(record) {
    var items = record.grantAmounts || [];
    if (!items.length && record.grantCode) return grantLabel(record.grantCode) + ": " + moneyText(record.amountXaf || 0, recordCurrency(record, "budgets"));
    var rows = [];
    for (var i = 0; i < items.length; i += 1) rows.push(grantLabel(items[i].grantCode) + ": " + moneyText(items[i].amountXaf || 0, recordCurrency(record, "budgets")));
    return rows.join(" | ");
  }

  function budgetLineContributionTotals(record, onlyGrantCode) {
    var totals = { pamTotal: 0, cpTotal: 0, total: 0 };
    var items = record && record.grantAmounts && record.grantAmounts.length ? record.grantAmounts : null;
    if (items) {
      for (var i = 0; i < items.length; i += 1) {
        if (onlyGrantCode && items[i].grantCode !== onlyGrantCode) continue;
        var amount = Number(items[i].amountXaf || 0);
        if (isCpContribution(items[i].grantCode)) totals.cpTotal += amount;
        else totals.pamTotal += amount;
      }
    } else {
      var fallbackAmount = Number(record && record.amountXaf || 0);
      if (onlyGrantCode && record && record.grantCode !== onlyGrantCode) fallbackAmount = 0;
      if (isCpContribution(record && record.grantCode)) totals.cpTotal += fallbackAmount;
      else totals.pamTotal += fallbackAmount;
    }
    totals.total = totals.pamTotal + totals.cpTotal;
    return totals;
  }

  function budgetRecordHasGrant(record, grantCode) {
    if (!grantCode) return true;
    var items = record && record.grantAmounts && record.grantAmounts.length ? record.grantAmounts : null;
    if (items) {
      for (var i = 0; i < items.length; i += 1) if (items[i].grantCode === grantCode && Number(items[i].amountXaf || 0) > 0) return true;
      return false;
    }
    return record && record.grantCode === grantCode;
  }

  function openBudgetBulkDialog(projectId) {
    state.editingId = "";
    state.formOpen = true;
    render();
    var projectControl = elements.form.elements.projectId;
    if (projectControl) {
      projectControl.value = projectId || projectControl.value;
      refreshDependentFields(configs.budgets);
    }
  }

  function monthlyPlanGroups(records) {
    var map = {};
    var out = [];
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var key = monthlyPlanGroupKey(record.projectId, record.month);
      if (!map[key]) {
        map[key] = { id: monthlyPlanGroupId(record.projectId, record.month), key: key, projectId: record.projectId, month: record.month, items: [] };
        out.push(map[key]);
      }
      map[key].items.push(record);
    }
    for (var j = 0; j < out.length; j += 1) applyMonthlyPlanGroupStatus(out[j]);
    out.sort(function (a, b) {
      if (a.month === b.month) return a.projectId > b.projectId ? 1 : -1;
      return a.month > b.month ? 1 : -1;
    });
    return out;
  }

  function applyMonthlyPlanGroupStatus(group) {
    var statuses = {};
    for (var i = 0; i < group.items.length; i += 1) statuses[normalizeWorkflowStatus(group.items[i].status)] = true;
    var keys = Object.keys(statuses);
    group.statusLabel = keys.length === 1 ? keys[0] : "Mixte";
    if (statuses.Draft || statuses.Returned) group.status = "Draft";
    else if (statuses.Submitted) group.status = "Submitted";
    else if (statuses.Verified) group.status = "Verified";
    else group.status = "Validated";
  }

  function monthlyPlanGroupKey(projectId, month) {
    return encodeURIComponent(projectId || "") + "::" + encodeURIComponent(month || "");
  }

  function monthlyPlanGroupId(projectId, month) {
    return "MP/" + (month || currentMonthValue()) + "/" + slugPart(projectId || "PROJECT");
  }

  function monthlyPlanGroupFromKey(key) {
    var parts = String(key || "").split("::");
    var projectId = decodeURIComponent(parts[0] || "");
    var month = decodeURIComponent(parts[1] || "");
    var items = [];
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      if (store.monthlyPlans[i].projectId === projectId && store.monthlyPlans[i].month === month) items.push(store.monthlyPlans[i]);
    }
    var group = { id: monthlyPlanGroupId(projectId, month), key: monthlyPlanGroupKey(projectId, month), projectId: projectId, month: month, items: items };
    applyMonthlyPlanGroupStatus(group);
    return group;
  }

  function monthlyPlanGroupActions(group) {
    var key = escapeHtml(group.key);
    var html = '<button type="button" data-monthly-plan-action="print" data-group="' + key + '">Imprimer</button>';
    html += '<button type="button" data-monthly-plan-action="edit" data-group="' + key + '">Modifier</button>';
    if (group.status === "Draft" || group.status === "Returned") html += '<button type="button" data-monthly-plan-action="submit" data-group="' + key + '">Soumettre</button><button type="button" data-monthly-plan-action="delete" data-group="' + key + '">Supprimer</button>';
    else if (group.status === "Submitted") html += '<button type="button" data-monthly-plan-action="verify" data-group="' + key + '">Verifier</button><button type="button" data-monthly-plan-action="return" data-group="' + key + '">Renvoyer</button>';
    else if (group.status === "Verified") html += '<button type="button" data-monthly-plan-action="approve" data-group="' + key + '">Valider</button><button type="button" data-monthly-plan-action="return" data-group="' + key + '">Renvoyer</button>';
    return html;
  }

  function wireMonthlyPlanGroupActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-monthly-plan-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handleMonthlyPlanGroupAction(this.getAttribute("data-monthly-plan-action"), this.getAttribute("data-group"));
      };
    }
  }

  function handleMonthlyPlanGroupAction(action, key) {
    var group = monthlyPlanGroupFromKey(key);
    if (!group.items.length) return;
    if (action === "print") {
      showMonthlyPlanGroupPreview(group, true);
      return;
    }
    if (action === "edit") {
      openBulkPlanningDialog({ projectId: group.projectId, month: group.month });
      return;
    }
    if (action === "delete") {
      if (window.confirm && !window.confirm("Supprimer ce plan mensuel et toutes ses lignes detaillees ?")) return;
      for (var d = store.monthlyPlans.length - 1; d >= 0; d -= 1) {
        if (store.monthlyPlans[d].projectId === group.projectId && store.monthlyPlans[d].month === group.month) store.monthlyPlans.splice(d, 1);
      }
      render();
      return;
    }
    if (!validWorkflowMove(group.status, action)) {
      window.alert("Workflow attendu: Draft -> Soumettre -> Verifier -> Valider.");
      return;
    }
    if (action === "return" && !recordReturnReasonForItems(group.items, "plan mensuel")) return;
    var nextStatus = "";
    if (action === "submit") nextStatus = "Submitted";
    if (action === "verify") nextStatus = "Verified";
    if (action === "approve") nextStatus = "Validated";
    if (action === "return") nextStatus = "Returned";
    for (var i = 0; i < group.items.length; i += 1) group.items[i].status = nextStatus;
    render();
  }

  function renderExecutionGroupedTable(records) {
    var groups = executionGroups(records);
    elements.tableCount.textContent = groups.length;
    elements.tableHead.innerHTML = "<tr><th>ID rapport</th><th>Mois</th><th>ID Projet</th><th>Details</th><th>Statut</th><th>Actions</th></tr>";
    if (!groups.length) {
      elements.tableBody.innerHTML = '<tr><td colspan="6"><p class="muted">Aucun enregistrement pour le moment.</p></td></tr>';
      return;
    }
    var body = "";
    for (var i = 0; i < groups.length; i += 1) {
      body += "<tr>" +
        "<td>" + escapeHtml(groups[i].id) + "</td>" +
        "<td>" + escapeHtml(groups[i].month) + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("projectId", groups[i].projectId)) + "</td>" +
        "<td>" + groups[i].items.length + " ligne(s)</td>" +
        "<td>" + escapeHtml(groups[i].statusLabel) + "</td>" +
        '<td><div class="row-actions">' + executionGroupActions(groups[i]) + "</div></td>" +
        "</tr>";
    }
    elements.tableBody.innerHTML = body;
    wireExecutionGroupActions();
  }

  function executionGroups(records) {
    var map = {};
    var out = [];
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var projectId = executionRecordProjectId(record);
      var key = executionGroupKey(projectId, record.month);
      if (!map[key]) {
        map[key] = { id: executionGroupId(state.page, projectId, record.month), key: key, projectId: projectId, month: record.month, items: [] };
        out.push(map[key]);
      }
      map[key].items.push(record);
    }
    for (var j = 0; j < out.length; j += 1) applyExecutionGroupStatus(out[j]);
    out.sort(function (a, b) {
      if (a.month === b.month) return a.projectId > b.projectId ? 1 : -1;
      return a.month > b.month ? 1 : -1;
    });
    return out;
  }

  function executionRecordProjectId(record) {
    return executionRecordProjectIdForPage(record, state.page);
  }

  function executionRecordProjectIdForPage(record, pageId) {
    if (record.projectId) return record.projectId;
    if (pageId === "monthlyReports") {
      var plan = findByRecordId(store.monthlyPlans, record.planId);
      return plan ? plan.projectId || "" : "";
    }
    if (pageId === "processReports") {
      var indicator = findByRecordId(store.processIndicators, record.processIndicatorId);
      return indicator ? indicator.projectId || "" : "";
    }
    return "";
  }

  function executionGroupKey(projectId, month) {
    return encodeURIComponent(projectId || "") + "::" + encodeURIComponent(month || "");
  }

  function executionGroupId(pageId, projectId, month) {
    var prefix = pageId === "monthlyReports" ? "RQM" : pageId === "monthlyExpenses" ? "EXP" : "RPM";
    return prefix + "/" + (month || currentMonthValue()) + "/" + slugPart(projectId || "PROJECT");
  }

  function executionGroupFromKey(key) {
    var parts = String(key || "").split("::");
    var projectId = decodeURIComponent(parts[0] || "");
    var month = decodeURIComponent(parts[1] || "");
    var items = [];
    var source = store[state.page] || [];
    for (var i = 0; i < source.length; i += 1) {
      if (executionRecordProjectId(source[i]) === projectId && source[i].month === month) items.push(source[i]);
    }
    var group = { id: executionGroupId(state.page, projectId, month), key: executionGroupKey(projectId, month), projectId: projectId, month: month, items: items };
    applyExecutionGroupStatus(group);
    return group;
  }

  function applyExecutionGroupStatus(group) {
    var statuses = {};
    for (var i = 0; i < group.items.length; i += 1) statuses[normalizeWorkflowStatus(group.items[i].status)] = true;
    var keys = Object.keys(statuses);
    group.statusLabel = keys.length === 1 ? keys[0] : "Mixte";
    if (statuses.Draft || statuses.Returned) group.status = "Draft";
    else if (statuses.Submitted) group.status = "Submitted";
    else if (statuses.Verified) group.status = "Verified";
    else group.status = "Validated";
  }

  function executionGroupActions(group) {
    var key = escapeHtml(group.key);
    var html = '<button type="button" data-execution-action="print" data-group="' + key + '">Imprimer</button>';
    if (state.page === "monthlyExpenses" && (group.status === "Draft" || group.status === "Returned")) html += '<button type="button" data-execution-action="edit" data-group="' + key + '">Modifier</button>';
    if (group.status === "Draft" || group.status === "Returned") html += '<button type="button" data-execution-action="submit" data-group="' + key + '">Soumettre</button><button type="button" data-execution-action="delete" data-group="' + key + '">Supprimer</button>';
    else if (group.status === "Submitted") html += '<button type="button" data-execution-action="verify" data-group="' + key + '">Verifier</button><button type="button" data-execution-action="return" data-group="' + key + '">Renvoyer</button>';
    else if (group.status === "Verified") html += '<button type="button" data-execution-action="approve" data-group="' + key + '">Valider</button><button type="button" data-execution-action="return" data-group="' + key + '">Renvoyer</button>';
    else if (group.status === "Validated") html += '<button type="button" data-execution-action="return" data-group="' + key + '">Renvoyer</button>';
    return html;
  }

  function wireExecutionGroupActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-execution-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handleExecutionGroupAction(this.getAttribute("data-execution-action"), this.getAttribute("data-group"));
      };
    }
  }

  function handleExecutionGroupAction(action, key) {
    var group = executionGroupFromKey(key);
    if (!group.items.length) return;
    if (action === "print") {
      showExecutionGroupPreview(group, true);
      return;
    }
    if (action === "edit" && state.page === "monthlyExpenses") {
      showMonthlyExpenseLineManager(group);
      return;
    }
    if (action === "delete") {
      if (window.confirm && !window.confirm("Supprimer ce rapport groupe et toutes ses lignes ?")) return;
      var source = store[state.page] || [];
      for (var d = source.length - 1; d >= 0; d -= 1) {
        if (executionRecordProjectId(source[d]) === group.projectId && source[d].month === group.month) source.splice(d, 1);
      }
      render();
      return;
    }
    if (!(action === "return" && group.status === "Validated") && !validWorkflowMove(group.status, action)) {
      window.alert("Workflow attendu: Draft -> Soumettre -> Verifier -> Valider.");
      return;
    }
    if (action === "return" && !recordReturnReasonForItems(group.items, "rapport groupe")) return;
    var nextStatus = action === "submit" ? "Submitted" : action === "verify" ? "Verified" : action === "approve" ? "Validated" : "Returned";
    for (var i = 0; i < group.items.length; i += 1) group.items[i].status = nextStatus;
    render();
  }

  function showMonthlyExpenseLineManager(group) {
    elements.tableTitle.textContent = "Lignes de depenses - " + group.month;
    elements.tableCount.textContent = group.items.length;
    elements.tableHead.innerHTML = "<tr><th>ID depense</th><th>Ligne budgetaire</th><th>Grant</th><th>Montant (" + escapeHtml(projectCurrency(group.projectId)) + ")</th><th>Statut</th><th>Actions</th></tr>";
    var rows = "";
    for (var i = 0; i < group.items.length; i += 1) {
      var expense = group.items[i];
      var id = escapeHtml(recordKey(expense));
      rows += "<tr><td>" + escapeHtml(expense.id || "") + "</td><td>" + escapeHtml(resolveReferenceLabel("budgetLineId", expense.budgetLineId || "")) + "</td><td>" + escapeHtml(grantLabel(expense.grantCode || "")) + "</td><td>" + moneyText(Number(expense.amountXaf || 0), projectCurrency(group.projectId)) + "</td><td>" + escapeHtml(normalizeWorkflowStatus(expense.status)) + '</td><td><div class="row-actions"><button type="button" data-expense-line-action="edit" data-expense-id="' + id + '">Modifier</button><button type="button" data-expense-line-action="delete" data-expense-id="' + id + '">Supprimer</button></div></td></tr>';
    }
    if (!rows) rows = '<tr><td colspan="6">Aucune ligne de depense.</td></tr>';
    elements.tableBody.innerHTML = rows + '<tr><td colspan="6"><button type="button" id="expense-lines-back">Retour au registre groupe</button></td></tr>';
    var back = document.getElementById("expense-lines-back");
    if (back) back.onclick = function () { render(); };
    wireMonthlyExpenseLineManagerActions();
  }

  function wireMonthlyExpenseLineManagerActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-expense-line-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        var action = this.getAttribute("data-expense-line-action");
        var id = this.getAttribute("data-expense-id");
        if (action === "edit") {
          state.editingId = id;
          state.formOpen = true;
          render();
          return;
        }
        if (action === "delete") {
          if (window.confirm && !window.confirm("Supprimer cette ligne de depense ?")) return;
          removeRecord(store.monthlyExpenses, id);
          render();
        }
      };
    }
  }

  function tableColumns(config) {
    if (state.page === "projectActivities") {
      return config.columns.filter(function (column) {
        return column !== "projectId";
      });
    }
    if (state.page === "kpis") {
      return config.columns.filter(function (column) {
        return column !== "projectId" && column !== "activityId";
      });
    }
    if (state.page !== "projectSubActivities") return config.columns;
    return config.columns.filter(function (column) {
      return column !== "projectId" && column !== "activityId" && column !== "kpiIds";
    });
  }

  function reportActions(id) {
    if (state.page === "users") {
      var user = findByRecordId(store.users, id);
      var html = '<button type="button" data-action="view" data-id="' + escapeHtml(id) + '">Voir</button><button type="button" data-action="print" data-id="' + escapeHtml(id) + '">Imprimer</button>';
      if (userCanWorkflowAction(user, "edit")) html += '<button type="button" data-action="edit" data-id="' + escapeHtml(id) + '">Modifier acces</button>';
      if (userCanWorkflowAction(user, "delete")) html += '<button type="button" data-action="delete" data-id="' + escapeHtml(id) + '">Supprimer</button>';
      return html;
    }
    if (workflowPage(state.page)) return workflowActions(findByRecordId(store[state.page], id));
    var edit = workflowPage(state.page) ? '<button type="button" data-action="edit" data-id="' + escapeHtml(id) + '">Modifier</button>' : "";
    var verify = workflowPage(state.page) ? '<button type="button" data-action="verify" data-id="' + escapeHtml(id) + '">Verifier</button>' : "";
    var review = workflowPage(state.page) ? "" : '<button type="button" data-action="review" data-id="' + escapeHtml(id) + '">Revoir</button>';
    return '<button type="button" data-action="print" data-id="' + escapeHtml(id) + '">Imprimer</button>' + edit + '<button type="button" data-action="submit" data-id="' + escapeHtml(id) + '">Soumettre</button>' + verify + review + '<button type="button" data-action="approve" data-id="' + escapeHtml(id) + '">Approuver</button><button type="button" data-action="return" data-id="' + escapeHtml(id) + '">Renvoyer</button><button type="button" data-action="delete" data-id="' + escapeHtml(id) + '">Supprimer</button>';
  }

  function grantModalityLabel(record) {
    if (record.grantModality !== "Vivre") return record.grantModality || "";
    return "Vivre (" + formatDecimal(totalFoodQuantity(record), 3) + ")";
  }

  function fieldOfficeLabel(id) {
    var office = findByRecordId(store.fieldOffices, id);
    return office ? office.name : id;
  }

  function projectFdpsLabel(record) {
    var items = projectFdpsForRecord(record);
    if (!items.length) return "";
    return items.length + " FDP / " + formatNumber(projectBeneficiaryTotal(record)) + " beneficiaires";
  }

  function monthlyGrantContributionsLabel(record) {
    var items = normalizeGrantContributionsDraft(record);
    var labels = [];
    for (var i = 0; i < items.length; i += 1) labels.push(resolveReferenceLabel("grantCode", items[i].grantCode) + " (" + formatDecimal(items[i].contributionPercent || 0, 3) + "%)");
    return labels.join(", ");
  }

  function subActivityLabel(subActivityId) {
    if (!subActivityId) return "";
    var sub = findByRecordId(store.projectSubActivities, subActivityId);
    return sub ? sub.label || sub.id : subActivityId;
  }

  function kpiLabel(kpiId) {
    if (!kpiId) return "";
    var kpi = findByRecordId(store.kpis, kpiId);
    return kpi ? kpi.label || kpi.id : kpiId;
  }

  function grantCodesLabel(codes) {
    codes = codes || [];
    var labels = [];
    for (var i = 0; i < codes.length; i += 1) labels.push(resolveReferenceLabel("grantCode", codes[i]));
    return labels.join(", ");
  }

  function projectFdpsForRecord(record) {
    var items = record.projectFdps || [];
    if (!items.length && record.fdpIds) {
      for (var i = 0; i < record.fdpIds.length; i += 1) items.push({ fdpId: record.fdpIds[i], fdpType: fdpTypeById(record.fdpIds[i]), beneficiaries: "" });
    }
    return items;
  }

  function projectFdpOptions(projectId) {
    var project = findByRecordId(store.projects, projectId);
    if (!project) return [];
    var items = projectFdpsForRecord(project);
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId);
      if (fdp) out.push({ value: fdp.id, label: fdp.name + " - " + fdp.arrondissement });
    }
    return out;
  }

  function validatedMonthlyPlanOptions(draft) {
    var out = [];
    var projectId = draft && draft.projectId ? draft.projectId : state.contextProjectId || "";
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (normalizeWorkflowStatus(plan.status) !== "Validated") continue;
      if (projectId && plan.projectId !== projectId) continue;
      out.push({ value: plan.id, label: plan.id + " - " + (plan.month || "") + " - " + resolveReferenceLabel("projectId", plan.projectId || "") });
    }
    return out;
  }

  function projectOptionsForMonthlyPlan(planId) {
    var plan = findByRecordId(store.monthlyPlans, planId);
    if (!plan) return optionPairs(store.projects, "id", "title");
    var project = findByRecordId(store.projects, plan.projectId);
    return project ? [{ value: project.id, label: project.id + " - " + project.title }] : [];
  }

  function defaultDistributionLines(draft) {
    var plan = findByRecordId(store.monthlyPlans, draft.planId) || {};
    var projectId = draft.projectId || plan.projectId || "";
    var project = findByRecordId(store.projects, projectId) || {};
    var fdps = plan.fdpIds && plan.fdpIds.length ? plan.fdpIds : projectFdpsForRecord(project).map(function (item) { return item.fdpId; });
    var out = [];
    var defaultGrants = plan.grantCodes && plan.grantCodes.length ? plan.grantCodes : projectGrantCodes(project);
    for (var i = 0; i < fdps.length; i += 1) out.push({ fdpId: fdps[i], grantCodes: defaultGrants, grantCode: defaultGrants[0] || firstGrantCodeForProject(projectId), plannedBeneficiaries: projectBeneficiariesForFdp(projectId, fdps[i]), plannedStartDate: plan.plannedStartDate || "", plannedEndDate: plan.plannedEndDate || "" });
    return out;
  }

  function grantOptionsForDistribution(draft) {
    var plan = findByRecordId(store.monthlyPlans, draft.planId) || {};
    var projectId = draft.projectId || plan.projectId || "";
    return invoiceGrantOptionsForProject(projectId);
  }

  function nfiOptionsForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.nfis.length; i += 1) {
      if (projectId && store.nfis[i].projectId !== projectId) continue;
      out.push({ value: store.nfis[i].id, label: store.nfis[i].id + " - " + store.nfis[i].name });
    }
    return out;
  }

  function defaultNfiInventoryItems(draft) {
    var map = {};
    for (var i = 0; i < store.nfiDistributions.length; i += 1) {
      var dist = store.nfiDistributions[i];
      if (draft.projectId && dist.projectId !== draft.projectId) continue;
      if (draft.fdpId && dist.fdpId !== draft.fdpId) continue;
      if (!map[dist.nfiId]) map[dist.nfiId] = { nfiId: dist.nfiId, quantitySupplied: 0, quantitySeen: "", condition: "100% Fonctionnel", comment: "" };
      map[dist.nfiId].quantitySupplied += Number(dist.quantitySupplied || 0);
    }
    var out = [];
    for (var key in map) if (Object.prototype.hasOwnProperty.call(map, key)) out.push(map[key]);
    return out;
  }

  function savedInvoiceOptionsForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.savedInvoices.length; i += 1) {
      var invoice = store.savedInvoices[i];
      if (projectId && invoice.projectId !== projectId) continue;
      out.push({ value: invoice.id, label: (invoice.invoiceRef || invoice.id) + " - " + (invoice.title || "") });
    }
    return out;
  }

  function defaultPartnerInvoiceAmounts(draft) {
    var saved = findByRecordId(store.savedInvoices, draft.invoiceSystemId) || {};
    var params = saved.params || {};
    var project = findByRecordId(store.projects, draft.projectId || saved.projectId || params.projectId) || {};
    var grants = invoiceGrantsForProject(project);
    var matrix = invoiceMatrix(project.id || "", grants, params);
    var out = [];
    for (var g = 0; g < grants.length; g += 1) {
      var total = 0;
      var categories = Object.keys(matrix || {});
      for (var c = 0; c < categories.length; c += 1) total += Number(matrix[categories[c]][grants[g].code] && matrix[categories[c]][grants[g].code].amount || 0);
      var label = grantLabel(grants[g].code);
      var remaining = partnerInvoiceRemainingAmount(draft.invoiceSystemId, label, Math.round(total));
      out.push({ label: label, expectedAmountXaf: remaining, amountXaf: remaining });
    }
    return out;
  }

  function partnerInvoiceRemainingAmount(invoiceSystemId, label, originalAmount) {
    var used = 0;
    for (var i = 0; i < store.partnerInvoices.length; i += 1) {
      var invoice = store.partnerInvoices[i];
      if (state.editingId && recordKey(invoice) === state.editingId) continue;
      if (invoice.invoiceSystemId !== invoiceSystemId) continue;
      var lines = invoice.activityGrantAmounts || [];
      for (var l = 0; l < lines.length; l += 1) {
        if (lines[l].label === label) used += Number(lines[l].amountXaf || 0);
      }
    }
    return Math.max(0, Number(originalAmount || 0) - used);
  }

  function recommendationSiteOptions(draft) {
    var projectId = draft && draft.projectId ? draft.projectId : "";
    var options = projectId ? projectFdpOptions(projectId) : optionPairs(store.fdps, "id", fdpLabel);
    return [{ value: "N/A", label: "Non applicable" }].concat(options);
  }

  function recommendationSubActivityOptions(projectId) {
    var project = findByRecordId(store.projects, projectId) || {};
    var values = project.subActivityTypes && project.subActivityTypes.length ? project.subActivityTypes : ["GFA", "Nutrition", "FFA", "HGSF", "Autre"];
    return values.map(function (value) { return { value: value, label: value }; });
  }

  function recommendationModalityOptions(projectId) {
    var project = findByRecordId(store.projects, projectId) || {};
    var values = project.modalities && project.modalities.length ? project.modalities : ["CBT", "In Kind", "Voucher"];
    return values.map(function (value) { return { value: value, label: value }; });
  }

  function recommendationResponsibleOptions(draft) {
    var unit = draft && draft.unit ? draft.unit : "";
    var out = [];
    if (!unit || unit === "Organisation" || unit === "WFP" || unit === "Autre") {
      for (var i = 0; i < store.staffs.length; i += 1) {
        var staff = store.staffs[i];
        if (staff.staffStatus && staff.staffStatus !== "Actif") continue;
        out.push({ value: staff.id, label: staff.id + " - " + staffFullName(staff) + (staff.functionName ? " - " + staff.functionName : "") });
      }
    }
    if (unit === "Cooperating partner" || unit === "Autre") {
      var project = findByRecordId(store.projects, draft ? draft.projectId : "");
      var vendor = project ? project.partnerVendor : "";
      for (var j = 0; j < store.partnerStaffs.length; j += 1) {
        var partnerStaff = store.partnerStaffs[j];
        if (partnerStaff.staffStatus && partnerStaff.staffStatus !== "Actif") continue;
        if (vendor && partnerStaff.partnerVendor && partnerStaff.partnerVendor !== vendor) continue;
        out.push({ value: partnerStaff.id, label: partnerStaff.id + " - " + staffFullName(partnerStaff) + (partnerStaff.functionName ? " - " + partnerStaff.functionName : "") });
      }
    }
    return out;
  }

  function recommendationActionSummary(record) {
    var history = record.actionHistory || [];
    if (!history.length) return "Aucune action";
    var last = history[history.length - 1];
    return history.length + " action(s) - dernier statut: " + (last.recommendationStatus || record.recommendationStatus || "");
  }

  function stakeholderFdpFilterOptions(projectId) {
    if (projectId) return projectFdpOptions(projectId);
    return optionPairs(store.fdps, "id", fdpLabel);
  }

  function stakeholderTypeOptions() {
    return ["Government", "Traditional authority", "Community leader", "Donor", "Sector coordination", "Local NGO", "Private sector", "Media", "Beneficiary representative", "UN Agency", "Supplier", "Municipality Autorities", "Local Comittee", "International NGO", "Association/OSC", "Other"];
  }

  function projectStakeholderOptions(projectId) {
    var out = [];
    for (var i = 0; i < store.stakeholders.length; i += 1) {
      var stakeholder = store.stakeholders[i];
      if (projectId && stakeholder.projectId !== projectId) continue;
      out.push({ value: stakeholder.id, label: stakeholderLabel(stakeholder) });
    }
    return out;
  }

  function partnerStaffOptions(partnerVendor) {
    var out = [];
    for (var i = 0; i < store.partnerStaffs.length; i += 1) {
      var staff = store.partnerStaffs[i];
      if (partnerVendor && staff.partnerVendor !== partnerVendor) continue;
      if (staff.staffStatus && staff.staffStatus !== "Actif") continue;
      out.push({ value: staff.id, label: staff.id + " - " + staffFullName(staff) + (staff.functionName ? " - " + staff.functionName : "") });
    }
    return out;
  }

  function projectPartnerStaffOptions(projectId) {
    var project = findByRecordId(store.projects, projectId);
    if (!project) return [];
    var out = [];
    for (var i = 0; i < store.partnerStaffs.length; i += 1) {
      var staff = store.partnerStaffs[i];
      if (staff.staffStatus && staff.staffStatus !== "Actif") continue;
      if (staff.projectId && staff.projectId !== projectId) continue;
      if (!staff.projectId && staff.partnerVendor !== project.partnerVendor) continue;
      out.push({ value: staff.id, label: staff.id + " - " + staffFullName(staff) + (staff.functionName ? " - " + staff.functionName : "") });
    }
    return out;
  }

  function partnerOptionsForProject(projectId) {
    var project = findByRecordId(store.projects, projectId);
    if (!project) return optionPairs(store.partners, "vendor", "name");
    var partner = findById(store.partners, "vendor", project.partnerVendor);
    return partner ? [{ value: partner.vendor, label: partner.vendor + " - " + partner.name }] : [];
  }

  function stakeholderLabel(stakeholder) {
    var name = (stakeholder.firstName || "") + " " + (stakeholder.lastName || "");
    name = name.trim() || stakeholder.id;
    return name + (stakeholder.functionName ? " - " + stakeholder.functionName : "");
  }

  function projectBeneficiaryTotal(record) {
    var total = 0;
    var items = projectFdpsForRecord(record);
    for (var i = 0; i < items.length; i += 1) total += Number(items[i].beneficiaries || 0);
    return total;
  }

  function totalFoodQuantity(record) {
    var total = 0;
    var items = record.foodItems || [];
    for (var i = 0; i < items.length; i += 1) total += Number(items[i].quantity || 0);
    return Math.round(total * 1000) / 1000;
  }

  function workflowActions(record) {
    if (!record) return "";
    var id = escapeHtml(recordKey(record));
    var status = normalizeWorkflowStatus(record.status);
    var html = userCanWorkflowAction(record, "view") ? '<button type="button" data-action="view" data-id="' + id + '">Voir</button>' : "";
    if (userCanWorkflowAction(record, "print")) html += '<button type="button" data-action="print" data-id="' + id + '">Imprimer</button>';
    if (status === "Draft" || status === "Returned") {
      if (userCanWorkflowAction(record, "edit")) html += '<button type="button" data-action="edit" data-id="' + id + '">Modifier</button>';
      if (userCanWorkflowAction(record, "submit")) html += '<button type="button" data-action="submit" data-id="' + id + '">Soumettre</button>';
      if (userCanWorkflowAction(record, "delete")) html += '<button type="button" data-action="delete" data-id="' + id + '">Supprimer</button>';
    } else if (status === "Submitted") {
      if (userCanWorkflowAction(record, "verify")) html += '<button type="button" data-action="verify" data-id="' + id + '">Verifier</button>';
      if (userCanWorkflowAction(record, "return")) html += '<button type="button" data-action="return" data-id="' + id + '">Renvoyer</button>';
    } else if (status === "Verified") {
      if (userCanWorkflowAction(record, "approve")) html += '<button type="button" data-action="approve" data-id="' + id + '">Valider</button>';
      if (userCanWorkflowAction(record, "return")) html += '<button type="button" data-action="return" data-id="' + id + '">Renvoyer</button>';
    } else if (status === "Validated") {
      if (userCanWorkflowAction(record, "edit")) html += '<button type="button" data-action="edit" data-id="' + id + '">Modifier</button>';
    }
    if (state.page === "recommendations" && userCanWorkflowAction(record, "edit")) html += '<button type="button" data-action="recommendation-update" data-id="' + id + '">Action/Update</button>';
    return html;
  }

  function wireReportActions() {
    var buttons = elements.tableBody.querySelectorAll("[data-action]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].onclick = function () {
        handleReportAction(this.getAttribute("data-action"), this.getAttribute("data-id"));
      };
    }
  }

  function handleReportAction(action, id) {
    var record = findByRecordId(store[state.page], id);
    if (!record) return;
    if (action === "recommendation-update" && userCanWorkflowAction(record, "edit")) {
      openRecommendationUpdate(record);
      return;
    }
    if (!userCanWorkflowAction(record, action)) {
      window.alert("Votre niveau d'acces ne permet pas cette action sur cet enregistrement.");
      return;
    }
    if (action === "edit") {
      state.editingId = id;
      state.formOpen = true;
      render();
      return;
    }
    if (action === "preview") {
      showPreview(record, false);
      return;
    }
    if (action === "view") {
      showPreview(record, false);
      return;
    }
    if (action === "print") {
      showPreview(record, true);
      return;
    }
    if (action === "delete") {
      if (state.page === "users" && record.email === adminEmail) {
        window.alert("Le compte administrateur principal ne peut pas etre supprime.");
        return;
      }
      if (window.confirm && !window.confirm("Supprimer cet enregistrement ?")) return;
      removeRecord(store[state.page], id);
      render();
      return;
    }
    if (workflowPage(state.page) && !validWorkflowMove(record.status, action)) {
      window.alert("Workflow attendu: Draft -> Soumettre -> Verifier -> Valider. Modifiez l'enregistrement pour le remettre en Draft.");
      return;
    }
    if (action === "submit") {
      record.status = "Submitted";
      record.submittedByEmail = currentUserEmail();
      record.submittedAt = new Date().toISOString();
      if (state.page === "hgsfIngredients") stampHgsfPriceHistory(record, "submitter");
    }
    if (action === "verify") {
      record.status = "Verified";
      record.verifiedByEmail = currentUserEmail();
      record.verifiedAt = new Date().toISOString();
      if (state.page === "hgsfIngredients") stampHgsfPriceHistory(record, "verifier");
    }
    if (action === "review") record.status = "Reviewed";
    if (action === "approve") {
      if (state.page === "monthlyExpenses" && expenseOverBudget(record)) {
        var message = "Surdepense detectee: le montant depasse le solde de la ligne budgetaire. Continuer la validation ?";
        if (!window.confirm || !window.confirm(message)) return;
      }
      record.status = workflowPage(state.page) || state.page === "monthlyExpenses" ? "Validated" : "Approved";
      record.validatedByEmail = currentUserEmail();
      record.validatedAt = new Date().toISOString();
      if (state.page === "hgsfIngredients") stampHgsfPriceHistory(record, "validator");
      if (state.page === "amendments") applyAmendment(record);
    }
    if (action === "return") {
      if (!recordReturnReason(record, pageLabel(state.page) || "enregistrement")) return;
      record.status = "Returned";
    }
    render();
  }

  function recordReturnReason(record, label) {
    if (!record) return false;
    var reason = window.prompt ? window.prompt("Veuillez fournir la raison du renvoi de " + (label || "cet enregistrement") + " :") : "";
    if (reason === null) return false;
    reason = String(reason || "").trim();
    if (!reason) {
      window.alert("La raison du renvoi est obligatoire.");
      return false;
    }
    appendReturnHistory(record, reason);
    return true;
  }

  function recordReturnReasonForItems(items, label) {
    var reason = window.prompt ? window.prompt("Veuillez fournir la raison du renvoi de " + (label || "ce groupe") + " :") : "";
    if (reason === null) return false;
    reason = String(reason || "").trim();
    if (!reason) {
      window.alert("La raison du renvoi est obligatoire.");
      return false;
    }
    for (var i = 0; i < items.length; i += 1) appendReturnHistory(items[i], reason);
    return true;
  }

  function appendReturnHistory(record, reason) {
    if (!record.returnHistory || Object.prototype.toString.call(record.returnHistory) !== "[object Array]") record.returnHistory = [];
    record.returnHistory.push({
      date: new Date().toISOString(),
      reason: reason,
      returnedBy: currentUserEmail()
    });
    record.returnedAt = new Date().toISOString();
    record.returnReason = reason;
  }

  function openRecommendationUpdate(record) {
    closeRecommendationModal();
    var backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "recommendation-update-modal";
    backdrop.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true">' +
      '<div class="modal-header"><div><p>Suivi recommandation</p><h3>Action / Update</h3></div><button type="button" class="modal-close" data-close-recommendation-modal>x</button></div>' +
      '<form id="recommendation-update-form" class="modal-form">' +
      '<label>Date du jour<input name="date" type="date" required value="' + escapeHtml(todayIsoDate()) + '" /></label>' +
      '<label>Action prise<textarea name="actionTaken" rows="3" required></textarea></label>' +
      '<label>Observation / commentaires<textarea name="observation" rows="3"></textarea></label>' +
      '<label>Mise a jour du statut<select name="recommendationStatus" required>' + optionsHtml(["Not started", "Ongoing", "Completed"], record.recommendationStatus || "Not started") + '</select></label>' +
      '<label data-completion-field>Date of completion<input name="completionDate" type="date" value="' + escapeHtml(record.completionDate || "") + '" /></label>' +
      '<div class="modal-actions"><button type="button" data-close-recommendation-modal>Annuler</button><button class="primary-action" type="submit">Enregistrer l\'update</button></div>' +
      '</form></div>';
    document.body.appendChild(backdrop);
    var form = document.getElementById("recommendation-update-form");
    var status = form.elements.recommendationStatus;
    var completionWrapper = form.querySelector("[data-completion-field]");
    var syncCompletion = function () { completionWrapper.style.display = status.value === "Completed" ? "" : "none"; };
    status.onchange = syncCompletion;
    syncCompletion();
    var closers = backdrop.querySelectorAll("[data-close-recommendation-modal]");
    for (var i = 0; i < closers.length; i += 1) closers[i].onclick = closeRecommendationModal;
    form.onsubmit = function (event) {
      if (event.preventDefault) event.preventDefault();
      var nextStatus = normalizeRecommendationStatus(form.elements.recommendationStatus.value) || "Not started";
      var completionDate = nextStatus === "Completed" ? form.elements.completionDate.value || form.elements.date.value || todayIsoDate() : "";
      if (!record.actionHistory) record.actionHistory = [];
      record.actionHistory.push({
        date: form.elements.date.value || todayIsoDate(),
        actionTaken: form.elements.actionTaken.value || "",
        observation: form.elements.observation.value || "",
        recommendationStatus: nextStatus,
        completionDate: completionDate,
        updatedBy: currentUserLabel(),
        updatedAt: new Date().toISOString()
      });
      record.recommendationStatus = nextStatus;
      record.completionDate = completionDate;
      closeRecommendationModal();
      render();
      return false;
    };
  }

  function closeRecommendationModal() {
    var modal = document.getElementById("recommendation-update-modal");
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function normalizeRecommendationStatus(value) {
    var text = String(value || "").toLowerCase().trim();
    if (text === "not started" || text === "notstarted" || text === "non demarre") return "Not started";
    if (text === "ongoing" || text === "on going" || text === "en cours") return "Ongoing";
    if (text === "completed" || text === "complete" || text === "termine" || text === "terminé") return "Completed";
    return "";
  }

  function showPreview(record, shouldPrint) {
    var title = state.page === "fieldOffices" ? "Office in charge" : state.page === "sites" ? "Site administratif" : state.page === "fdps" ? "Final Distribution Point" : state.page === "partners" ? "Partenaire cooperant" : state.page === "cooperativePartners" ? "Coop/GIC/partenaire local" : state.page === "strategicDocuments" ? "Document strategique" : state.page === "hgsfIngredients" ? "Ingredient et prix HGSF" : state.page === "hgsfMenus" ? "Menu HGSF" : state.page === "hgsfSchoolMenus" ? "Rattachement ecole-menu HGSF" : state.page === "hgsfEstimations" ? "Estimation besoins HGSF" : state.page === "hgsfPurchaseOrders" ? "Bon de commande HGSF" : state.page === "hgsfDeliveries" ? "Reception livraison HGSF" : state.page === "hgsfDeliveryInvoices" ? "Facture livraison HGSF" : state.page === "hgsfInvoicePayments" ? "Paiement facture HGSF" : state.page === "hgsfSchoolCoopPayments" ? "Paiement ecole cooperative" : state.page === "assistanceRations" ? "Ration assistance alimentaire" : state.page === "gfdNeeds" ? "Besoins GFD In kind" : state.page === "cbtNeeds" ? "Besoins CBT" : state.page === "nutritionNeeds" ? "Besoins Nutrition" : state.page === "recommendations" ? "Suivi des recommandations" : state.page === "grants" ? "Grant" : state.page === "projects" ? "Projet" : state.page === "partnerStaffs" ? "Staff partenaire" : state.page === "projectActivities" ? "Activite projet" : state.page === "projectSubActivities" ? "Sous activite" : state.page === "monthlyExpenses" ? "Rapport financier mensuel" : state.page === "monthlyReports" ? "Rapport mensuel de realisation" : state.page === "amendments" ? "Amendement projet" : state.page === "users" ? "Utilisateur" : "Rapport process monitoring";
    var printButton = shouldPrint ? '<button onclick="window.print()" style="min-height:40px;border:0;border-radius:8px;padding:0 14px;background:#007dbc;color:#fff;font-weight:700;margin-bottom:16px">Lancer l\\\'impression</button>' : "";
    var html = '<!doctype html><html><head><title>' + title + '</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2a44}h1{margin-top:0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #c9d9e5;padding:8px;text-align:left;vertical-align:top}th{background:#e3f2f8}@media print{button{display:none}}</style></head><body>' + printButton + '<h1>' + title + '</h1><table><tbody>';
    for (var key in record) {
      if (state.page === "grants" && key === "foodItems") continue;
      if (state.page === "projects" && key === "projectFdps") continue;
      if (state.page === "projects" && key === "fdpIds") continue;
      if (state.page === "projects" && key === "projectSites") continue;
      if (state.page === "projects" && key === "siteIds") continue;
      if (state.page === "projects" && key === "partnerStaffAssignments") continue;
      if (state.page === "projects" && key === "partnerStaffIds") continue;
      if (state.page === "monthlyPlans" && (key === "grantCode" || key === "grantCodes")) continue;
      if (state.page === "hgsfEstimations" && (key === "schoolRows" || key === "schoolFdpIds" || key === "applicableDays")) continue;
      if (state.page === "hgsfIngredients" && key === "priceEntries") continue;
      if (state.page === "recommendations" && key === "actionHistory") continue;
      if (key === "returnHistory") continue;
      if (key === "password") continue;
      if (Object.prototype.hasOwnProperty.call(record, key) && key.charAt(0) !== "_") html += "<tr><th>" + escapeHtml(labelize(key)) + "</th><td>" + formatPreviewCell(key, record[key]) + "</td></tr>";
    }
    html += fdpAdminPreviewRows(record);
    html += "</tbody></table>" + grantFoodItemsPreview(record) + projectFdpsPreview(record) + hgsfIngredientPricesPreview(record) + hgsfEstimationPreview(record) + hgsfPurchaseOrderPreview(record) + genericNeedEstimatePreview(record) + recommendationHistoryPreview(record) + returnHistoryPreview(record) + "</body></html>";
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  function showMonthlyPlanGroupPreview(group, shouldPrint) {
    var project = findByRecordId(store.projects, group.projectId) || {};
    var items = group.items.slice().sort(function (a, b) {
      var aKey = String(a.activityId || "") + "::" + String(a.subActivityId || "") + "::" + String(a.kpiId || "");
      var bKey = String(b.activityId || "") + "::" + String(b.subActivityId || "") + "::" + String(b.kpiId || "");
      return aKey > bKey ? 1 : aKey < bKey ? -1 : 0;
    });
    var printButton = shouldPrint ? '<button onclick="window.print()" style="min-height:40px;border:0;border-radius:8px;padding:0 14px;background:#007dbc;color:#fff;font-weight:700;margin-bottom:16px">Lancer l\\\'impression</button>' : "";
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      var line = items[i];
      rows += "<tr>" +
        "<td>" + escapeHtml(line.id || "") + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("activityId", line.activityId)) + "</td>" +
        "<td>" + escapeHtml(subActivityLabel(line.subActivityId)) + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("kpiId", line.kpiId)) + "</td>" +
        "<td>" + escapeHtml(monthlyPlanGrantPlanningLabel(line)) + "</td>" +
        "<td>" + escapeHtml(line.target || "") + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("pamFocalPoint", line.pamFocalPoint || "")) + "</td>" +
        "<td>" + escapeHtml(resolveReferenceLabel("partnerFocalPoint", line.partnerFocalPoint || "")) + "</td>" +
        "<td>" + escapeHtml(line.plannedStartDate || "") + "</td>" +
        "<td>" + escapeHtml(line.plannedEndDate || "") + "</td>" +
        "<td>" + escapeHtml(normalizeWorkflowStatus(line.status)) + "</td>" +
        "</tr>";
    }
    if (!rows) rows = '<tr><td colspan="11">Aucune ligne detaillee.</td></tr>';
    var html = '<!doctype html><html><head><title>Plan mensuel</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2a44}h1{margin-top:0}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #c9d9e5;padding:8px;text-align:left;vertical-align:top}th{background:#e3f2f8}@media print{button{display:none}}</style></head><body>' +
      printButton +
      '<h1>Plan mensuel</h1>' +
      '<table><tbody>' +
      '<tr><th>ID plan mensuel</th><td>' + escapeHtml(group.id) + '</td></tr>' +
      '<tr><th>Mois</th><td>' + escapeHtml(group.month) + '</td></tr>' +
      '<tr><th>Projet</th><td>' + escapeHtml(group.projectId + (project.title ? " - " + project.title : "")) + '</td></tr>' +
      '<tr><th>Nombre de lignes detaillees</th><td>' + items.length + '</td></tr>' +
      '<tr><th>Statut</th><td>' + escapeHtml(group.statusLabel) + '</td></tr>' +
      '</tbody></table>' +
      '<h2>Activites, sous activites et KPIs planifies</h2>' +
      '<table><thead><tr><th>ID ligne</th><th>Activite</th><th>Sous activite</th><th>KPI</th><th>Grants</th><th>Cible</th><th>Point focal organisation</th><th>Point focal partenaire</th><th>Debut</th><th>Fin</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '</body></html>';
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  function monthlyPlanGrantPlanningLabel(plan) {
    var targets = plan.grantTargets || [];
    if (targets.length) {
      var out = [];
      for (var i = 0; i < targets.length; i += 1) out.push(grantLabel(targets[i].grantCode) + ": cible " + targets[i].target);
      return out.join(" | ");
    }
    return monthlyGrantContributionsLabel(plan);
  }

  function showExecutionGroupPreview(group, shouldPrint) {
    var title = state.page === "monthlyReports" ? "Reporting Quantitatif Mensuel" : state.page === "monthlyExpenses" ? "Depenses mensuelles" : "Rapport process";
    var project = findByRecordId(store.projects, group.projectId) || {};
    var printButton = shouldPrint ? '<button onclick="window.print()" style="min-height:40px;border:0;border-radius:8px;padding:0 14px;background:#007dbc;color:#fff;font-weight:700;margin-bottom:16px">Lancer l\\\'impression</button>' : "";
    var html = '<!doctype html><html><head><title>' + title + '</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2a44}h1{margin-top:0}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #c9d9e5;padding:8px;text-align:left;vertical-align:top}th{background:#e3f2f8}@media print{button{display:none}}</style></head><body>' +
      printButton +
      '<h1>' + title + '</h1>' +
      '<table><tbody>' +
      '<tr><th>ID rapport</th><td>' + escapeHtml(group.id) + '</td></tr>' +
      '<tr><th>Mois</th><td>' + escapeHtml(group.month) + '</td></tr>' +
      '<tr><th>Projet</th><td>' + escapeHtml(group.projectId + (project.title ? " - " + project.title : "")) + '</td></tr>' +
      '<tr><th>Nombre de lignes</th><td>' + group.items.length + '</td></tr>' +
      '<tr><th>Statut</th><td>' + escapeHtml(group.statusLabel) + '</td></tr>' +
      '</tbody></table>' + executionGroupDetailsHtml(group) + '</body></html>';
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  function executionGroupDetailsHtml(group) {
    if (state.page === "monthlyReports") return monthlyReportGroupDetailsHtml(group);
    if (state.page === "monthlyExpenses") return monthlyExpenseGroupDetailsHtml(group);
    return processReportGroupDetailsHtml(group);
  }

  function monthlyReportGroupDetailsHtml(group) {
    var rows = "";
    for (var i = 0; i < group.items.length; i += 1) {
      var report = group.items[i];
      var plan = findByRecordId(store.monthlyPlans, report.planId) || {};
      rows += "<tr><td>" + escapeHtml(report.id || "") + "</td><td>" + escapeHtml(activitySubActivityPlanLabel(plan)) + "</td><td>" + escapeHtml(resolveReferenceLabel("kpiId", plan.kpiId || "")) + "</td><td>" + escapeHtml(plan.target || "") + "</td><td>" + escapeHtml(report.achieved || "") + "</td><td>" + escapeHtml(report.narrative || "") + "</td><td>" + escapeHtml(normalizeWorkflowStatus(report.status)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="7">Aucune ligne.</td></tr>';
    return '<h2>Realisations quantitatives</h2><table><thead><tr><th>ID</th><th>Activite / sous activite</th><th>KPI</th><th>Cible</th><th>Realisation</th><th>Commentaire</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<h2>Synthese globale</h2><table><tbody>' +
      '<tr><th>Contraintes / defis</th><td>' + reportGroupGlobalText(group.items, "challenges") + '</td></tr>' +
      '<tr><th>Actions correctives</th><td>' + reportGroupGlobalText(group.items, "correctiveActions") + '</td></tr>' +
      '<tr><th>Recommandations</th><td>' + reportGroupGlobalText(group.items, "recommendations") + '</td></tr>' +
      '</tbody></table>';
  }

  function reportGroupGlobalText(items, field) {
    var values = [];
    for (var i = 0; i < items.length; i += 1) {
      var value = String(items[i][field] || "").trim();
      if (value && values.indexOf(value) < 0) values.push(value);
    }
    if (!values.length) return '<span class="muted">Non renseigne.</span>';
    if (values.length === 1) return escapeHtml(values[0]);
    return '<ul>' + values.map(function (value) { return '<li>' + escapeHtml(value) + '</li>'; }).join("") + '</ul>';
  }

  function monthlyExpenseGroupDetailsHtml(group) {
    var rows = "";
    var total = 0;
    var currency = projectCurrency(group.projectId);
    for (var i = 0; i < group.items.length; i += 1) {
      var expense = group.items[i];
      total += Number(expense.amountXaf || 0);
      var line = findByRecordId(store.budgets, expense.budgetLineId) || {};
      var budgetAmount = Number(line.amountXaf || 0);
      var consumed = expenseTotalForBudgetLine(expense.budgetLineId, { projectId: group.projectId });
      var remaining = budgetAmount - consumed;
      var consumptionRate = budgetAmount ? Math.round((consumed / budgetAmount) * 1000) / 10 : 0;
      rows += "<tr><td>" + escapeHtml(expense.id || "") + "</td><td>" + escapeHtml(resolveReferenceLabel("budgetLineId", expense.budgetLineId || "")) + "</td><td>" + escapeHtml((expense.costCategory || "") + (expense.subCategory ? " / " + expense.subCategory : "")) + "</td><td>" + escapeHtml(grantLabel(expense.grantCode || "")) + "</td><td>" + moneyText(Number(expense.amountXaf || 0), currency) + "</td><td>" + moneyText(remaining, currency) + "</td><td>" + formatDecimal(consumptionRate, 1) + "%</td><td>" + escapeHtml(expense.comment || "") + "</td><td>" + escapeHtml(normalizeWorkflowStatus(expense.status)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="9">Aucune ligne.</td></tr>';
    else rows += '<tr><th colspan="4">Total depenses</th><th>' + moneyText(total, currency) + '</th><th></th><th></th><th></th><th></th></tr>';
    return '<h2>Depenses mensuelles</h2><table><thead><tr><th>ID</th><th>Ligne budgetaire</th><th>Categorie</th><th>Grant</th><th>Montant (' + escapeHtml(currency) + ')</th><th>Solde restant</th><th>% consommation ligne</th><th>Commentaire</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function processReportGroupDetailsHtml(group) {
    var rows = "";
    for (var i = 0; i < group.items.length; i += 1) {
      var report = group.items[i];
      var indicator = findByRecordId(store.processIndicators, report.processIndicatorId) || {};
      rows += "<tr><td>" + escapeHtml(report.id || "") + "</td><td>" + escapeHtml(resolveReferenceLabel("processIndicatorId", report.processIndicatorId || "")) + "</td><td>" + escapeHtml(indicator.target || "") + "</td><td>" + escapeHtml(report.value || "") + "</td><td>" + escapeHtml(report.findings || "") + "</td><td>" + escapeHtml(normalizeWorkflowStatus(report.status)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="6">Aucune ligne.</td></tr>';
    return '<h2>Indicateurs process renseignes</h2><table><thead><tr><th>ID</th><th>Indicateur</th><th>Cible</th><th>Valeur observee</th><th>Commentaire</th><th>Statut</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function fdpAdminPreviewRows(record) {
    if (state.page !== "fdps") return "";
    var meta = adminMetaForArrondissement(record.arrondissement, "Cameroon");
    if (!meta) return "";
    return "<tr><th>Pays</th><td>" + escapeHtml(meta.country) + "</td></tr>" +
      "<tr><th>Region</th><td>" + escapeHtml(meta.region) + "</td></tr>" +
      "<tr><th>Departement</th><td>" + escapeHtml(meta.department) + "</td></tr>";
  }

  function grantFoodItemsPreview(record) {
    if (state.page !== "grants" || record.grantModality !== "Vivre") return "";
    var items = record.foodItems || [];
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      rows += "<tr><td>" + escapeHtml(items[i].type === "Autre" && items[i].otherType ? items[i].otherType : items[i].type) + "</td><td>" + escapeHtml(items[i].quantity) + "</td><td>" + escapeHtml(items[i].bdd || "") + "</td><td>" + escapeHtml(items[i].tdd || "") + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="4">Aucune quantite de vivres renseignee.</td></tr>';
    else rows += '<tr><th>Total</th><th>' + escapeHtml(formatDecimal(totalFoodQuantity(record), 3)) + '</th><th></th><th></th></tr>';
    return '<h2>Quantites par commodite</h2><table><thead><tr><th>Commodite</th><th>Quantite</th><th>BDD</th><th>TDD</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function projectFdpsPreview(record) {
    if (state.page !== "projects") return "";
    var items = projectFdpsForRecord(record);
    var rows = "";
    for (var j = 0; j < items.length; j += 1) {
      var fdp = findByRecordId(store.fdps, items[j].fdpId) || { id: items[j].fdpId, name: "", arrondissement: "" };
      rows += "<tr><td>" + escapeHtml(fdpLabel(fdp)) + "</td><td>" + escapeHtml(items[j].fdpType || fdp.fdpType || "") + "</td><td>" + escapeHtml(grantCodesLabel(items[j].grantCodes || [])) + "</td><td>" + formatNumber(Number(items[j].beneficiaries || 0)) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="4">Aucun FDP rattache.</td></tr>';
    else rows += '<tr><th colspan="3">Total beneficiaires</th><th>' + formatNumber(projectBeneficiaryTotal(record)) + "</th></tr>";
    return '<h2>FDP rattaches et beneficiaires</h2><table><thead><tr><th>Final Distribution Point (FDP)</th><th>Type FDP</th><th>Grants rattaches</th><th>Nombre de beneficiaires</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function projectPartnerStaffPreview(record) {
    if (state.page !== "projects") return "";
    var items = record.partnerStaffAssignments || [];
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      var staff = findByRecordId(store.partnerStaffs, items[i].staffId);
      rows += "<tr><td>" + escapeHtml(staff ? items[i].staffId + " - " + staffFullName(staff) : items[i].staffId) + "</td><td>" + escapeHtml(items[i].role || "") + "</td><td>" + escapeHtml(items[i].involvementLevel || "") + "</td><td>" + escapeHtml(items[i].zone || "") + "</td><td>" + escapeHtml(items[i].startDate || "") + "</td><td>" + escapeHtml(items[i].endDate || "") + "</td><td>" + escapeHtml(items[i].comment || "") + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="7">Aucun staff partenaire rattache au projet.</td></tr>';
    return '<h2>Staff du partenaire implique</h2><table><thead><tr><th>Staff</th><th>Role projet</th><th>Niveau implication</th><th>Zone couverte</th><th>Debut</th><th>Fin</th><th>Commentaire</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function hgsfSchoolOptions() {
    var out = [];
    for (var i = 0; i < store.fdps.length; i += 1) {
      if (store.fdps[i].fdpType === "Ecole") out.push({ value: store.fdps[i].id, label: fdpLabel(store.fdps[i]) });
    }
    return out;
  }

  function hgsfSelectedSchoolOptions(draft) {
    draft = draft || {};
    var selected = draft.schoolFdpIds || [];
    if (!selected.length) return hgsfSchoolHierarchyOptions(draft);
    var out = [];
    for (var i = 0; i < selected.length; i += 1) {
      var fdp = findByRecordId(store.fdps, selected[i]);
      if (fdp) out.push({ value: fdp.id, label: fdpLabel(fdp) });
    }
    return out;
  }

  function defaultStudentsForSchool(schoolFdpId) {
    var fdp = findByRecordId(store.fdps, schoolFdpId);
    if (fdp && fdp.studentCount) return Number(fdp.studentCount || 0);
    for (var i = 0; i < store.projects.length; i += 1) {
      var items = store.projects[i].projectFdps || [];
      for (var j = 0; j < items.length; j += 1) if (items[j].fdpId === schoolFdpId && items[j].beneficiaries) return Number(items[j].beneficiaries || 0);
    }
    return "";
  }

  function hgsfSchoolIdsLabel(ids) {
    ids = ids || [];
    var labels = [];
    for (var i = 0; i < ids.length; i += 1) {
      var fdp = findByRecordId(store.fdps, ids[i]);
      labels.push(fdp ? fdpLabel(fdp) : ids[i]);
    }
    return labels.join(" | ");
  }

  function hgsfRegionOptions() {
    var out = [];
    var tree = countryTree.Cameroon || {};
    for (var region in tree) if (Object.prototype.hasOwnProperty.call(tree, region)) out.push(region);
    return out;
  }

  function hgsfDepartmentOptions(draft) {
    draft = draft || {};
    var tree = countryTree.Cameroon || {};
    var regions = draft.localizationRegions && draft.localizationRegions.length ? draft.localizationRegions : Object.keys(tree);
    var out = [];
    var seen = {};
    for (var i = 0; i < regions.length; i += 1) {
      var departments = tree[regions[i]] || {};
      for (var department in departments) if (Object.prototype.hasOwnProperty.call(departments, department) && !seen[department]) {
        seen[department] = true;
        out.push({ value: department, label: department + " / " + regions[i] });
      }
    }
    return out;
  }

  function hgsfArrondissementOptions(draft) {
    draft = draft || {};
    var tree = countryTree.Cameroon || {};
    var regions = draft.localizationRegions && draft.localizationRegions.length ? draft.localizationRegions : Object.keys(tree);
    var departments = draft.localizationDepartments || [];
    var out = [];
    var seen = {};
    for (var r = 0; r < regions.length; r += 1) {
      var regionDepartments = tree[regions[r]] || {};
      for (var department in regionDepartments) if (Object.prototype.hasOwnProperty.call(regionDepartments, department)) {
        if (departments.length && departments.indexOf(department) < 0) continue;
        var arrs = regionDepartments[department] || [];
        for (var a = 0; a < arrs.length; a += 1) if (!seen[arrs[a]]) {
          seen[arrs[a]] = true;
          out.push({ value: arrs[a], label: arrs[a] + " - " + department + " / " + regions[r] });
        }
      }
    }
    return out;
  }

  function hgsfPriceArrondissementOptions() {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.hgsfIngredients.length; i += 1) {
      var entries = store.hgsfIngredients[i].priceEntries || [];
      for (var j = 0; j < entries.length; j += 1) if (entries[j].arrondissement && !seen[entries[j].arrondissement]) {
        seen[entries[j].arrondissement] = true;
        out.push(entries[j].arrondissement);
      }
      if (store.hgsfIngredients[i].arrondissement && !seen[store.hgsfIngredients[i].arrondissement]) {
        seen[store.hgsfIngredients[i].arrondissement] = true;
        out.push(store.hgsfIngredients[i].arrondissement);
      }
    }
    return out;
  }

  function hgsfSchoolHierarchyOptions(draft) {
    draft = draft || {};
    var regions = draft.localizationRegions || [];
    var departments = draft.localizationDepartments || [];
    var arrondissements = draft.localizationArrondissements || [];
    var out = [];
    for (var i = 0; i < store.fdps.length; i += 1) {
      var fdp = store.fdps[i];
      if (fdp.fdpType !== "Ecole") continue;
      var meta = adminMetaForArrondissement(fdp.arrondissement, "Cameroon") || {};
      if (regions.length && regions.indexOf(meta.region) < 0) continue;
      if (departments.length && departments.indexOf(meta.department) < 0) continue;
      if (arrondissements.length && arrondissements.indexOf(fdp.arrondissement) < 0) continue;
      out.push({ value: fdp.id, label: fdpLabel(fdp) });
    }
    return out;
  }

  function hgsfMenuOptionsForSchool(schoolFdpId) {
    var mapping = hgsfSchoolMenuRecordForSchool(schoolFdpId);
    var ids = mapping && mapping.menuIds && mapping.menuIds.length ? mapping.menuIds : [];
    if (!schoolFdpId || !ids.length) return [];
    var out = [];
    for (var i = 0; i < store.hgsfMenus.length; i += 1) if (ids.indexOf(store.hgsfMenus[i].id) > -1) out.push({ value: store.hgsfMenus[i].id, label: store.hgsfMenus[i].name });
    return out;
  }

  function hgsfMenuStatusForSchool(schoolFdpId) {
    if (!schoolFdpId) return "Selectionner une ecole pour afficher ses menus rattaches.";
    return hgsfMenuOptionsForSchool(schoolFdpId).length ? "" : "Aucun menu rattache a cette ecole dans HGSF - Ecoles/Menu.";
  }

  function hgsfEstimationOptionsForPurchaseOrder(draft) {
    draft = draft || {};
    var schools = draft.schoolFdpIds || [];
    var out = [];
    for (var i = 0; i < store.hgsfEstimations.length; i += 1) {
      var item = store.hgsfEstimations[i];
      if (schools.length && !arraysOverlap(schools, item.schoolFdpIds || hgsfSchoolsFromRows(item.schoolRows || []))) continue;
      out.push({ value: item.id, label: item.id + " - " + (item.periodType || "") + " " + (item.periodValue || "") + " / " + hgsfSchoolIdsLabel(item.schoolFdpIds || hgsfSchoolsFromRows(item.schoolRows || [])) });
    }
    return out;
  }

  function hgsfCooperativeOptionsForSchools(draft) {
    var schools = (draft && draft.schoolFdpIds) || [];
    var out = [];
    for (var i = 0; i < store.cooperativePartners.length; i += 1) {
      var coopSchools = store.cooperativePartners[i].schoolFdpIds || [];
      if (schools.length && coopSchools.length && !arraysOverlap(schools, coopSchools)) continue;
      if (schools.length && !coopSchools.length) continue;
      out.push({ value: store.cooperativePartners[i].id, label: store.cooperativePartners[i].name || store.cooperativePartners[i].id });
    }
    return out;
  }

  function arraysOverlap(a, b) {
    a = a || [];
    b = b || [];
    for (var i = 0; i < a.length; i += 1) if (b.indexOf(a[i]) > -1) return true;
    return false;
  }

  function hgsfSchoolsFromRows(rows) {
    var out = [];
    rows = rows || [];
    for (var i = 0; i < rows.length; i += 1) if (rows[i].schoolFdpId && out.indexOf(rows[i].schoolFdpId) < 0) out.push(rows[i].schoolFdpId);
    return out;
  }

  function rationOptionsForNeed(type, modality) {
    var out = [];
    for (var i = 0; i < store.assistanceRations.length; i += 1) {
      var ration = store.assistanceRations[i];
      if (modality && ration.modality !== modality) continue;
      if (type === "CBT" && ration.modality !== "CBT" && ration.modality !== "Voucher") continue;
      if (type === "Nutrition" && ration.subActivityType !== "Nutrition") continue;
      if (type === "GFD" && ration.subActivityType === "Nutrition") continue;
      out.push({ value: ration.id, label: ration.id + " - " + ration.subActivityType + " / " + ration.modality });
    }
    return out;
  }

  function needDraftModality(draft) {
    if (draft && draft.modality) return draft.modality;
    var ration = findByRecordId(store.assistanceRations, draft ? draft.rationId : "") || {};
    return ration.modality || (state.page === "cbtNeeds" ? "CBT" : "In kind");
  }

  function needProjectRecord(draft) {
    return findByRecordId(store.projects, draft.projectId) || {};
  }

  function needProjectRegionOptions(draft) {
    return uniqueAdminOptionsForProject(draft, "region");
  }

  function needProjectDepartmentOptions(draft) {
    return uniqueAdminOptionsForProject(draft, "department");
  }

  function needProjectArrondissementOptions(draft) {
    return uniqueAdminOptionsForProject(draft, "arrondissement");
  }

  function needProjectFdpOptions(draft) {
    var project = needProjectRecord(draft);
    var items = projectFdpsForRecord(project);
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId);
      if (!fdp) continue;
      var meta = adminMetaForArrondissement(fdp.arrondissement, "Cameroon") || {};
      if ((draft.localizationRegions || []).length && draft.localizationRegions.indexOf(meta.region) < 0) continue;
      if ((draft.localizationDepartments || []).length && draft.localizationDepartments.indexOf(meta.department) < 0) continue;
      if ((draft.localizationArrondissements || []).length && draft.localizationArrondissements.indexOf(fdp.arrondissement) < 0) continue;
      out.push({ value: fdp.id, label: fdpLabel(fdp) });
    }
    return out;
  }

  function uniqueAdminOptionsForProject(draft, level) {
    var project = needProjectRecord(draft);
    var items = projectFdpsForRecord(project);
    var seen = {};
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId);
      if (!fdp) continue;
      var meta = adminMetaForArrondissement(fdp.arrondissement, "Cameroon") || {};
      if (level === "department" && (draft.localizationRegions || []).length && draft.localizationRegions.indexOf(meta.region) < 0) continue;
      if (level === "arrondissement" && (draft.localizationDepartments || []).length && draft.localizationDepartments.indexOf(meta.department) < 0) continue;
      var value = level === "arrondissement" ? fdp.arrondissement : meta[level];
      if (value && !seen[value]) {
        seen[value] = true;
        out.push(value);
      }
    }
    return out;
  }

  function projectBeneficiariesForFdp(projectId, fdpId) {
    var project = findByRecordId(store.projects, projectId) || {};
    var items = project.projectFdps || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].fdpId === fdpId) return Number(items[i].beneficiaries || 0);
    return defaultStudentsForSchool(fdpId) || 0;
  }

  function hgsfSchoolMenuRecordForSchool(schoolFdpId) {
    for (var i = 0; i < store.hgsfSchoolMenus.length; i += 1) {
      var item = store.hgsfSchoolMenus[i];
      if (item.schoolFdpId === schoolFdpId) return item;
      if ((item.schoolFdpIds || []).indexOf(schoolFdpId) > -1) return item;
    }
    return null;
  }

  function hgsfDefaultCoveredDays(periodType) {
    var map = { Journaliere: 1, Hebdomadaire: 5, Mensuelle: 20, Trimestrielle: 60, Semestrielle: 120, Annuelle: 240 };
    return map[periodType || "Mensuelle"] || 20;
  }

  function hgsfApplicableDayOptions(draft) {
    draft = draft || {};
    var month = draft.periodValue || currentMonthValue();
    var parts = String(month).split("-");
    if (parts.length < 2) return [];
    var year = Number(parts[0]);
    var monthIndex = Number(parts[1]) - 1;
    var count = new Date(year, monthIndex + 1, 0).getDate();
    var workdaysOnly = (draft.workdaysOnly || "Oui") === "Oui";
    var limit = Number(draft.coveredDays || 0);
    var out = [];
    for (var d = 1; d <= count; d += 1) {
      var date = new Date(year, monthIndex, d);
      var dow = date.getDay();
      if (workdaysOnly && (dow === 0 || dow === 6)) continue;
      var day = String(d);
      if (day.length < 2) day = "0" + day;
      var value = parts[0] + "-" + parts[1] + "-" + day;
      out.push({ value: value, label: day + "/" + parts[1] + "/" + parts[0] });
      if (limit > 0 && out.length >= limit) break;
    }
    return out;
  }

  function hgsfDefaultApplicableDays(draft) {
    var options = hgsfApplicableDayOptions(draft);
    var count = Math.min(hgsfDefaultCoveredDays(draft ? draft.periodType : "Mensuelle"), options.length);
    var out = [];
    for (var i = 0; i < count; i += 1) out.push(options[i].value);
    return out;
  }

  function hgsfSelectedDayOptions(draft) {
    draft = draft || {};
    var selected = draft.applicableDays && draft.applicableDays.length ? draft.applicableDays : hgsfDefaultApplicableDays(draft);
    var options = hgsfApplicableDayOptions(draft);
    var out = [];
    for (var i = 0; i < options.length; i += 1) if (selected.indexOf(options[i].value) > -1) out.push(options[i]);
    return out;
  }

  function hgsfMenuItemsLabel(record) {
    var items = record.menuItems || [];
    return items.length + " ingredient(s)";
  }

  function hgsfIngredientPricesPreview(record) {
    if (state.page !== "hgsfIngredients") return "";
    var items = record.priceEntries || [];
    var rows = "";
    for (var i = 0; i < items.length; i += 1) rows += "<tr><td>" + escapeHtml(items[i].arrondissement || "") + "</td><td>" + formatNumber(Number(items[i].priceXaf || 0)) + " XAF</td></tr>";
    if (!rows) rows = '<tr><td colspan="2">Aucun prix par arrondissement.</td></tr>';
    return '<h2>Prix par arrondissement</h2><table><thead><tr><th>Arrondissement</th><th>Prix unitaire</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function hgsfEstimationPreview(record) {
    if (state.page !== "hgsfEstimations") return "";
    var calc = hgsfEstimateNeeds(record);
    var detailRows = "";
    for (var d = 0; d < calc.details.length; d += 1) {
      detailRows += "<tr><td>" + escapeHtml(calc.details[d].school) + "</td><td>" + escapeHtml(calc.details[d].day || "") + "</td><td>" + escapeHtml(calc.details[d].menu) + "</td><td>" + formatNumber(calc.details[d].students) + "</td><td>" + formatNumber(calc.details[d].days) + "</td></tr>";
    }
    if (!detailRows) detailRows = '<tr><td colspan="5">Aucune ligne ecole / menu.</td></tr>';
    var summaryRows = "";
    for (var i = 0; i < calc.summary.length; i += 1) {
      var line = calc.summary[i];
      summaryRows += "<tr><td>" + escapeHtml(line.ingredient) + "</td><td>" + formatDecimal(line.quantity, 3) + " Kg</td><td>" + (line.price ? formatNumber(line.price) + " Fcfa" : "-") + "</td><td>" + formatNumber(line.cost) + " Fcfa</td></tr>";
    }
    if (!summaryRows) summaryRows = '<tr><td colspan="4">Aucune quantite estimee.</td></tr>';
    var warnings = hgsfWarningsHtml(calc.warnings);
    var headStyle = ' style="background:#005eb8;color:#fff"';
    var totalStyle = ' style="background:#e8f5e9;font-weight:800"';
    return '<h2>Details ecoles / menus</h2><table><thead><tr><th>Ecole</th><th>Jour</th><th>Menu</th><th>Eleves</th><th>Jours</th></tr></thead><tbody>' + detailRows + '</tbody></table>' + warnings + '<h2>Quantites et couts estimes</h2><table class="hgsf-summary-preview"><thead><tr><th' + headStyle + '>Ingredient</th><th' + headStyle + '>Quantite totale (Kg)</th><th' + headStyle + '>Prix/Kg</th><th' + headStyle + '>Cout total</th></tr></thead><tbody>' + summaryRows + '<tr><th' + totalStyle + '>TOTAL</th><th' + totalStyle + '>' + formatDecimal(calc.totalQuantity, 3) + ' Kg</th><th' + totalStyle + '></th><th' + totalStyle + '>' + formatNumber(calc.totalCost) + ' Fcfa</th></tr></tbody></table>';
  }

  function hgsfWarningsHtml(warnings) {
    if (!warnings || !warnings.length) return "";
    var rows = "";
    for (var i = 0; i < warnings.length; i += 1) rows += "<li>" + escapeHtml(warnings[i]) + "</li>";
    return '<div class="alert warning"><strong>Points a corriger / verifier</strong><ul>' + rows + "</ul></div>";
  }

  function hgsfPurchaseOrderPreview(record, calc) {
    if (state.page === "hgsfPurchaseOrders") {
      var estimation = findByRecordId(store.hgsfEstimations, record.estimationId) || {};
      var estimateCalc = hgsfEstimateNeeds(estimation);
      var coopRecord = findByRecordId(store.cooperativePartners, record.cooperativePartnerId) || {};
      var partnerRecord = partnerForSchoolList(record.schoolFdpIds || []);
      var rows = "";
      var lines = record.orderLines && record.orderLines.length ? record.orderLines : hgsfDefaultPurchaseOrderLines(record);
      var totalQty = 0;
      var totalCost = 0;
      for (var i = 0; i < lines.length; i += 1) {
        totalQty += Number(lines[i].quantity || 0);
        totalCost += Number(lines[i].cost || 0);
        rows += "<tr><td>" + escapeHtml(lines[i].ingredient) + "</td><td>" + formatDecimal(lines[i].quantity, 3) + " Kg</td><td>" + formatNumber(lines[i].cost) + " Fcfa</td></tr>";
      }
      if (!rows) rows = '<tr><td colspan="3">Aucune estimation rattachee.</td></tr>';
      return '<h2>Bon de commande indicatif</h2><table><tbody><tr><th>Ecoles</th><td>' + escapeHtml(hgsfSchoolIdsLabel(record.schoolFdpIds || [])) + '</td></tr><tr><th>Partenaire cooperant</th><td>' + escapeHtml(partnerRecord ? partnerRecord.name + " / Vendor: " + partnerRecord.vendor : "") + '</td></tr><tr><th>Cooperative / GIC</th><td>' + escapeHtml(coopRecord.name || record.cooperativePartnerId || "") + '</td></tr><tr><th>Details cooperative</th><td>' + escapeHtml(cooperativeDetailsLabel(coopRecord)) + '</td></tr><tr><th>Estimation</th><td>' + escapeHtml(record.estimationId || "") + '</td></tr><tr><th>Periode couverte</th><td>Du ' + escapeHtml(record.periodFrom || "") + ' au ' + escapeHtml(record.periodTo || "") + ' (' + escapeHtml(record.applicableDaysCount || "") + ' jour(s))</td></tr><tr><th>Date de livraison souhaitee</th><td>' + escapeHtml(record.desiredDeliveryDate || "") + '</td></tr></tbody></table><table><thead><tr><th>Ingredient</th><th>Quantite commandee</th><th>Cout estime</th></tr></thead><tbody>' + rows + '<tr><th>Total</th><th>' + formatDecimal(totalQty, 3) + ' Kg</th><th>' + formatNumber(totalCost) + ' Fcfa</th></tr></tbody></table>';
    }
    var coop = findByRecordId(store.cooperativePartners, record.cooperativePartnerId) || {};
    if (!record.cooperativePartnerId) return "";
    return '<h2>Bon de commande indicatif</h2><table><tbody><tr><th>Cooperative / GIC</th><td>' + escapeHtml(coop.name || record.cooperativePartnerId) + '</td></tr><tr><th>Periode couverte</th><td>' + escapeHtml(record.periodType + " - " + record.periodValue + " / " + record.coveredDays + " jour(s)") + '</td></tr><tr><th>Date de livraison souhaitee</th><td>' + escapeHtml(record.desiredDeliveryDate || "") + '</td></tr><tr><th>Montant estime</th><td>' + formatNumber(calc.totalCost) + ' XAF</td></tr></tbody></table>';
  }

  function genericNeedEstimatePreview(record) {
    if (["gfdNeeds", "cbtNeeds", "nutritionNeeds"].indexOf(state.page) < 0) return "";
    var ration = findByRecordId(store.assistanceRations, record.rationId) || {};
    var items = ration.rationItems || [];
    var rows = "";
    var bnfRows = record.beneficiaryRows || [];
    var totalBnf = 0;
    if (record.needScope === "Besoin isole") totalBnf = Number(record.isolatedBeneficiaries || 0);
    else for (var b = 0; b < bnfRows.length; b += 1) totalBnf += Number(bnfRows[b].beneficiaries || 0);
    var days = Number(record.coveredDays || 0);
    var isCash = needDraftModality(record) === "CBT" || needDraftModality(record) === "Voucher";
    var totalQuantity = 0;
    var totalAmount = 0;
    for (var i = 0; i < items.length; i += 1) {
      var percent = isCash ? 1 : Number(needCommodityPercent(record.commodityPercents, items[i].commodity) || 100) / 100;
      var qty = Number(items[i].value || 0) * totalBnf * days * percent;
      var unit = items[i].unit || "";
      if (/g\/BNF/i.test(unit)) {
        qty = qty / 1000000;
        unit = "MT";
        totalQuantity += qty;
      } else if (/XAF/i.test(unit)) {
        unit = "XAF";
        totalAmount += qty;
      }
      var label = isCash ? "Amount" : items[i].commodity;
      rows += "<tr><td>" + escapeHtml(label) + "</td><td>" + formatDecimal(qty, unit === "XAF" ? 0 : 3) + " " + escapeHtml(unit) + "</td><td>" + formatNumber(days) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="3">Selectionner une ration pour visualiser l estimation.</td></tr>';
    var totalRow = isCash ? '<tr><th>Total</th><th>' + formatDecimal(totalAmount, 0) + ' XAF</th><th>' + formatNumber(days) + '</th></tr>' : '<tr><th>Total</th><th>' + formatDecimal(totalQuantity, 3) + ' MT</th><th>' + formatNumber(days) + '</th></tr>';
    var meta = '<h2>Parametres de calcul</h2><table><tbody><tr><th>Beneficiaires</th><td>' + formatNumber(totalBnf) + '</td></tr><tr><th>Jours couverts</th><td>' + formatNumber(days) + '</td></tr></tbody></table>';
    return meta + '<h2>Estimation des besoins</h2><table><thead><tr><th>' + (isCash ? "Amount" : "Commodite") + '</th><th>Besoin estime</th><th>Jours</th></tr></thead><tbody>' + rows + totalRow + "</tbody></table>";
  }

  function recommendationHistoryPreview(record) {
    if (state.page !== "recommendations") return "";
    var history = record.actionHistory || [];
    var rows = "";
    for (var i = 0; i < history.length; i += 1) {
      rows += "<tr><td>" + escapeHtml(history[i].date || "") + "</td><td>" + escapeHtml(history[i].actionTaken || "") + "</td><td>" + escapeHtml(history[i].observation || "") + "</td><td>" + escapeHtml(history[i].recommendationStatus || "") + "</td><td>" + escapeHtml(history[i].completionDate || "") + "</td><td>" + escapeHtml(history[i].updatedBy || "") + "</td><td>" + escapeHtml(formatDateTime(history[i].updatedAt || "")) + "</td></tr>";
    }
    if (!rows) rows = '<tr><td colspan="7">Aucune action/update enregistree.</td></tr>';
    return '<h2>Historique des actions et updates</h2><table><thead><tr><th>Date action</th><th>Action prise</th><th>Observation / commentaires</th><th>Statut mis a jour</th><th>Date completion</th><th>Mis a jour par</th><th>Date enregistrement</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function returnHistoryPreview(record) {
    var history = record && Object.prototype.toString.call(record.returnHistory) === "[object Array]" ? record.returnHistory : [];
    if (!history.length) return "";
    var rows = "";
    for (var i = 0; i < history.length; i += 1) {
      rows += "<tr><td>" + escapeHtml(formatDateTime(history[i].date || "")) + "</td><td>" + escapeHtml(history[i].returnedBy || "") + "</td><td>" + escapeHtml(history[i].reason || "") + "</td></tr>";
    }
    return '<h2>Historique des renvois</h2><table><thead><tr><th>Date du renvoi</th><th>Renvoye par</th><th>Raison du renvoi</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  function hgsfDefaultPurchaseOrderLines(draft) {
    if (draft.purchaseOrderId) {
      var po = findByRecordId(store.hgsfPurchaseOrders, draft.purchaseOrderId) || {};
      return (po.orderLines || []).map(function (line) { return { ingredient: line.ingredient, quantity: line.quantity, cost: line.cost }; });
    }
    var estimation = findByRecordId(store.hgsfEstimations, draft.estimationId) || {};
    var calc = hgsfEstimateNeeds(estimation);
    var out = [];
    for (var i = 0; i < calc.summary.length; i += 1) {
      var remaining = hgsfRemainingStockForOrderLine(draft, calc.summary[i].ingredient);
      var qty = Math.min(Number(calc.summary[i].quantity || 0), remaining || Number(calc.summary[i].quantity || 0));
      out.push({ ingredient: calc.summary[i].ingredient, quantity: roundTo3(qty), cost: Math.round((qty / Number(calc.summary[i].quantity || 1)) * Number(calc.summary[i].cost || 0)) });
    }
    return out;
  }

  function cooperativeDetailsLabel(coop) {
    if (!coop) return "";
    var parts = [];
    if (coop.organizationType) parts.push("Type: " + coop.organizationType);
    if (coop.arrondissement) parts.push("Arrondissement: " + coop.arrondissement);
    if (coop.focalPointName) parts.push("PF: " + coop.focalPointName);
    if (coop.phone) parts.push("Tel: " + coop.phone);
    return parts.join(" | ");
  }

  function partnerForSchoolList(schoolIds) {
    schoolIds = schoolIds || [];
    for (var i = 0; i < store.projects.length; i += 1) {
      var projectFdps = projectFdpsForRecord(store.projects[i]);
      for (var j = 0; j < projectFdps.length; j += 1) {
        if (schoolIds.indexOf(projectFdps[j].fdpId) > -1) return findById(store.partners, "vendor", store.projects[i].partnerVendor);
      }
    }
    return null;
  }

  function hgsfRemainingStockForOrderLine(draft, ingredient) {
    var estimation = findByRecordId(store.hgsfEstimations, draft.estimationId) || {};
    var calc = hgsfEstimateNeeds(estimation);
    var planned = 0;
    for (var i = 0; i < calc.summary.length; i += 1) if (calc.summary[i].ingredient === ingredient) planned += Number(calc.summary[i].quantity || 0);
    var used = 0;
    for (var j = 0; j < store.hgsfPurchaseOrders.length; j += 1) {
      var order = store.hgsfPurchaseOrders[j];
      if (state.editingId && order.id === state.editingId) continue;
      if (order.estimationId !== draft.estimationId) continue;
      var lines = order.orderLines || [];
      for (var k = 0; k < lines.length; k += 1) if (lines[k].ingredient === ingredient) used += Number(lines[k].quantity || 0);
    }
    return Math.max(0, planned - used);
  }

  function hgsfEstimateNeeds(record) {
    var result = { lines: [], details: [], summary: [], warnings: [], totalCost: 0, totalQuantity: 0 };
    var summaryMap = {};
    var detailSeen = {};
    var rows = record.schoolRows || [];
    for (var i = 0; i < rows.length; i += 1) {
      var school = findByRecordId(store.fdps, rows[i].schoolFdpId) || {};
      var menu = findByRecordId(store.hgsfMenus, rows[i].menuId) || {};
      var menuItems = menu.menuItems || [];
      if (!hgsfMenuOptionsForSchool(rows[i].schoolFdpId).length) result.warnings.push("Aucun menu rattache a l'ecole " + fdpLabel(school) + " dans HGSF - Ecoles/Menu.");
      var detailKey = rows[i].schoolFdpId + "::" + rows[i].day + "::" + rows[i].menuId;
      if (!detailSeen[detailKey]) {
        detailSeen[detailKey] = true;
        result.details.push({ school: fdpLabel(school), day: rows[i].day || "", menu: menu.name || rows[i].menuId, students: Number(rows[i].students || 0), days: Number(rows[i].days || 0) });
      }
      for (var m = 0; m < menuItems.length; m += 1) {
        var ingredient = findByRecordId(store.hgsfIngredients, menuItems[m].ingredientId) || {};
        var priceInfo = hgsfIngredientPriceForArrondissement(menuItems[m].ingredientId, school.arrondissement, record);
        if (!priceInfo.found) result.warnings.push("Prix absent pour " + (ingredient.name || menuItems[m].ingredientId) + " dans l'arrondissement " + (school.arrondissement || "") + ".");
        if (priceInfo.fallbackUsed) result.warnings.push("Prix alternatif utilise pour " + (ingredient.name || menuItems[m].ingredientId) + ": " + priceInfo.arrondissement + ".");
        var quantity = Number(rows[i].students || 0) * Number(rows[i].days || 0) * Number(menuItems[m].quantityPerStudent || 0) / 1000;
        var cost = quantity * priceInfo.price;
        result.totalCost += cost;
        result.totalQuantity += quantity;
        var key = normalizeText(ingredient.name || menuItems[m].ingredientId);
        if (!summaryMap[key]) summaryMap[key] = { ingredient: ingredient.name || menuItems[m].ingredientId, quantity: 0, price: priceInfo.price, cost: 0 };
        summaryMap[key].quantity += quantity;
        summaryMap[key].cost += cost;
        if (!summaryMap[key].price && priceInfo.price) summaryMap[key].price = priceInfo.price;
        result.lines.push({ school: fdpLabel(school), day: rows[i].day || "", menu: menu.name || rows[i].menuId, students: Number(rows[i].students || 0), days: Number(rows[i].days || 0), ingredient: ingredient.name || menuItems[m].ingredientId, quantity: quantity, price: priceInfo.price, cost: cost });
      }
    }
    var keys = Object.keys(summaryMap);
    for (var s = 0; s < keys.length; s += 1) result.summary.push(summaryMap[keys[s]]);
    return result;
  }

  function hgsfIngredientPriceForArrondissement(ingredientId, arrondissement, record) {
    var ingredient = findByRecordId(store.hgsfIngredients, ingredientId);
    if (!ingredient) return { price: 0, found: false, fallbackUsed: false, arrondissement: arrondissement };
    var local = hgsfPriceEntryForArrondissement(ingredient.priceEntries || [], arrondissement);
    if (local && Number(local.priceXaf || 0) > 0) return { price: Number(local.priceXaf || 0), found: true, fallbackUsed: false, arrondissement: arrondissement };
    if (record && record.useFallbackPrice === "Oui" && record.fallbackPriceArrondissement) {
      var fallback = hgsfPriceEntryForArrondissement(ingredient.priceEntries || [], record.fallbackPriceArrondissement);
      if (fallback && Number(fallback.priceXaf || 0) > 0) return { price: Number(fallback.priceXaf || 0), found: true, fallbackUsed: true, arrondissement: record.fallbackPriceArrondissement };
    }
    for (var i = 0; i < store.hgsfIngredients.length; i += 1) {
      var item = store.hgsfIngredients[i];
      if (normalizeText(item.name) === normalizeText(ingredient.name) && item.arrondissement === arrondissement && Number(item.priceXaf || 0) > 0) return { price: Number(item.priceXaf || 0), found: true, fallbackUsed: false, arrondissement: arrondissement };
    }
    return { price: 0, found: false, fallbackUsed: false, arrondissement: arrondissement };
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function printHtml(title, content) {
    var invoiceMode = /invoice/i.test(title) || String(content || "").indexOf("invoice-template") > -1;
    var baseStyle = "body{font-family:Arial,sans-serif;padding:28px;color:#1f2a44}h1,h2{margin-top:0}p,li{text-align:left;line-height:1.45}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #c9d9e5;padding:8px;text-align:left;vertical-align:top}th{background:#e3f2f8}";
    var invoiceStyle = "@page{size:A4 landscape;margin:8mm}body{padding:0;color:#001b3f;font-size:9px}.invoice-preview{width:100%;min-width:0;border:1.5px solid #00689e;background:#fff;box-sizing:border-box}.invoice-preview table{width:100%;border-collapse:collapse;margin:0;table-layout:fixed}.invoice-preview th,.invoice-preview td{border:1px solid #b9d2df;padding:4px 5px;text-align:left;vertical-align:top;line-height:1.25;overflow-wrap:anywhere}.invoice-preview h2{margin:0;padding:7px;background:#00689e;color:#fff;text-align:center;font-size:12px;letter-spacing:.2px}.invoice-top-grid{display:grid;grid-template-columns:30% 70%;border-bottom:1.5px solid #00689e}.invoice-top-grid>div{padding:6px;border-right:1.5px solid #00689e}.invoice-top-grid>div:last-child{border-right:0}.invoice-top-grid p{margin:0 0 7px}.invoice-template th{background:#dff4fc;color:#26455f;text-transform:uppercase;font-size:8px}.invoice-template .invoice-side-head{width:115px;text-align:center;vertical-align:middle}.invoice-matrix{table-layout:fixed}.invoice-matrix th,.invoice-matrix td{font-size:7.2px;padding:4px}.invoice-matrix thead th{text-align:center}.invoice-matrix td,.invoice-matrix tbody th:last-child{text-align:center;vertical-align:middle}.invoice-matrix tbody th:first-child{text-align:left}.invoice-matrix tbody th:first-child,.invoice-matrix thead th:first-child{width:23%}.invoice-total th,.invoice-total td{background:#8bd65f!important;font-weight:800}.financial-report-preview{width:100%;min-width:0;margin-top:10mm;border:1.5px solid #111827;background:#fff;box-sizing:border-box;page-break-before:always}.financial-report-preview h2{margin:0;padding:6px;background:#fff;color:#000;border-bottom:1.5px solid #111827;text-align:left;font-size:10px}.financial-report-preview table{width:100%;border-collapse:collapse;table-layout:fixed}.financial-report-preview th,.financial-report-preview td{border:1px solid #111827;padding:2.5px 3px;font-size:5.8px;line-height:1.15}.financial-report-info th{background:#f7f7c6;width:75px}.financial-report-table thead th{background:#0aa6d8;color:#fff;text-align:center;font-weight:800}.financial-report-table thead th span{font-size:5px}.financial-report-table td:not(:first-child),.financial-report-table tbody th:not(:first-child){background:#d1ffd5;text-align:center;vertical-align:middle}.financial-report-table td:first-child,.financial-report-table tbody th:first-child{width:140px;background:#fff;color:#000;text-align:left}.financial-activities-label{background:#fff!important;color:#000!important;text-align:center!important}.financial-section th{background:#bdd7ee!important;color:#000!important;font-weight:800}.financial-subtotal th,.financial-subtotal td{background:#c6efce!important;font-weight:800}.financial-grand-total th,.financial-grand-total td{background:#bfbfbf!important;color:#000!important;font-weight:900}.financial-certification{border-top:1.5px solid #111827;padding:5px;font-size:6px}.financial-certification p{margin:3px 0 0}.invoice-signatures{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border:1px solid #b9d2df;border-top:0;min-height:82px}.invoice-signatures>div{padding:6px;border-right:1px solid #b9d2df}.invoice-signatures>div:last-child{border-right:0}.invoice-signatures strong{font-weight:800}.invoice-signatures.financial-signatures{grid-template-columns:1fr 1fr;border-color:#111827;min-height:55px}.invoice-signatures.financial-signatures>div{padding:5px;border-right:1px solid #111827}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.invoice-preview{page-break-inside:avoid}}";
    var html = '<!doctype html><html><head><title>' + escapeHtml(title) + '</title><style>' + (invoiceMode ? invoiceStyle : baseStyle) + '</style></head><body>' + content + "</body></html>";
    var win = window.open("", "_blank");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function applyAmendment(record) {
    if (record.appliedAt) return;
    if (record.amendmentType === "Budget" || record.amendmentType === "Budget et Activite") applyBudgetAmendment(record);
    if (record.amendmentType === "Activite" || record.amendmentType === "Budget et Activite") applyActivityAmendment(record);
    record.appliedAt = new Date().toISOString();
  }

  function applyBudgetAmendment(record) {
    var line = findById(store.budgets, "id", record.budgetLineId);
    if (record.changeType === "Add" || !line) {
      var newId = record.budgetLineId || "AMD-BUD/" + record.id;
      store.budgets.push({ id: newId, projectId: record.projectId, partnerVendor: "", costCategory: "Amendment", subCategory: "Amendment", label: record.justification || "Budget amendment", cspActivityId: "", amountXaf: Number(record.newBudgetAmountXaf || record.budgetDeltaXaf || 0), amendmentId: record.id });
      return;
    }
    if (record.changeType === "Cancel" || record.changeType === "Suspend") {
      line.status = record.changeType;
      return;
    }
    if (record.newBudgetAmountXaf !== "") line.amountXaf = Number(record.newBudgetAmountXaf || line.amountXaf);
    else line.amountXaf = Number(line.amountXaf || 0) + Number(record.budgetDeltaXaf || 0);
    line.lastAmendmentId = record.id;
  }

  function applyActivityAmendment(record) {
    var activity = findById(store.projectActivities, "id", record.activityId);
    if (record.changeType === "Add" || !activity) {
      store.projectActivities.push({ id: record.activityId || "AMD-ACT/" + record.id, projectId: record.projectId, label: record.newActivityLabel || "New amended activity", cspActivityIds: [], startDate: record.effectiveDate, endDate: "", partnerFocalPoint: "", phone: "", email: "", amendmentId: record.id });
      return;
    }
    if (record.changeType === "Cancel" || record.changeType === "Suspend") {
      activity.status = record.changeType;
      activity.lastAmendmentId = record.id;
      return;
    }
    if (record.newActivityLabel) activity.label = record.newActivityLabel;
    activity.lastAmendmentId = record.id;
  }

  function removeRecord(items, id) {
    for (var i = items.length - 1; i >= 0; i -= 1) if (recordKey(items[i]) === id) items.splice(i, 1);
  }

  function updateRecord(items, id, nextRecord) {
    for (var i = 0; i < items.length; i += 1) {
      if (recordKey(items[i]) === id) {
        nextRecord.createdAt = items[i].createdAt || nextRecord.createdAt;
        nextRecord.modifiedAt = new Date().toISOString();
        items[i] = nextRecord;
        return;
      }
    }
  }

  function uniqueRecordKey(record) {
    var key = recordKey(record);
    if (!key) return true;
    var items = store[state.page] || [];
    for (var i = 0; i < items.length; i += 1) {
      if (recordKey(items[i]) === key && recordKey(items[i]) !== state.editingId) {
        window.alert("Cette cle existe deja dans ce registre. Merci d'utiliser un identifiant unique.");
        return false;
      }
    }
    return true;
  }

  function validateRecordBeforeSave(record) {
    if (state.page === "users") return validateUserRecord(record);
    if (state.page === "projectActivities") return validateProjectActivityDates(record);
    if (state.page === "monthlyPlans") return validateMonthlyGrantContributions(record) && validateMonthlyLocation(record);
    if (state.page === "hgsfPurchaseOrders") return validateHgsfPurchaseOrder(record);
    if (state.page === "stakeholders") return validateStakeholderLocation(record);
    if (state.page === "processIndicators") return validateProcessIndicatorSelection(record);
    if (state.page === "partnerInvoices") return validatePartnerInvoiceAmounts(record);
    if (state.page === "partnerInvoicePayments") return validatePartnerInvoicePayment(record);
    return true;
  }

  function validateUserRecord(record) {
    var email = normalizeEmail(record.email);
    if (!email) {
      window.alert("L'adresse email est requise pour creer le compte.");
      return false;
    }
    for (var i = 0; i < store.users.length; i += 1) {
      if (normalizeEmail(store.users[i].email) === email && recordKey(store.users[i]) !== state.editingId) {
        window.alert("Cette adresse email est deja utilisee par un autre compte.");
        return false;
      }
    }
    var current = currentUser();
    var previous = state.editingId ? findByRecordId(store.users, state.editingId) : null;
    if (previous && previous.email === adminEmail && (!current || current.email !== adminEmail)) {
      window.alert("Seul l'administrateur principal peut modifier son propre compte.");
      return false;
    }
    return true;
  }

  function validatePartnerInvoicePayment(record) {
    var outstanding = partnerInvoicePaymentOutstanding(record.invoiceId, state.editingId);
    var paid = Number(record.amountPaidXaf || 0);
    var invoice = findByRecordId(store.partnerInvoices, record.invoiceId) || {};
    var currency = projectCurrency(invoice.projectId);
    if (paid > outstanding) {
      window.alert("Le montant paye ne peut pas depasser le solde disponible de cette facture (" + moneyText(outstanding, currency) + ").");
      return false;
    }
    return true;
  }

  function validatePartnerInvoiceAmounts(record) {
    var lines = record.activityGrantAmounts || [];
    for (var i = 0; i < lines.length; i += 1) {
      var amount = Number(lines[i].amountXaf || 0);
      var expected = Number(lines[i].expectedAmountXaf || 0);
      if (amount > expected) {
        window.alert("Le montant pour " + (lines[i].label || "cette ligne") + " ne peut pas depasser le montant attendu restant (" + moneyText(expected, projectCurrency(record.projectId)) + ").");
        return false;
      }
    }
    return true;
  }

  function validateProcessIndicatorSelection(record) {
    if (!record.processKpiDetails || !record.processKpiDetails.length) {
      window.alert("Veuillez selectionner au moins un KPI du projet.");
      return false;
    }
    for (var i = 0; i < record.processKpiDetails.length; i += 1) {
      if (!record.processKpiDetails[i].label) {
        window.alert("Veuillez renseigner le libelle de chaque indicateur process.");
        return false;
      }
    }
    return true;
  }

  function validateStakeholderLocation(record) {
    if (record.localizedStakeholder !== "Oui") return true;
    return validateLocationHierarchy(record, "partie prenante");
  }

  function validateMonthlyLocation(record) {
    if (record.localizedActivity !== "Oui") return true;
    return validateLocationHierarchy(record, "activite");
  }

  function validateLocationHierarchy(record, subjectLabel) {
    if (!record.localizationLevel) {
      window.alert("Veuillez preciser le niveau de localisation.");
      return false;
    }
    if (!record.localizationCountry) {
      window.alert("Veuillez selectionner le pays concerne.");
      return false;
    }
    if (["Region", "Departement", "Arrondissement", "FDP"].indexOf(record.localizationLevel) > -1 && !(record.localizationRegions || []).length) {
      window.alert("Veuillez selectionner la ou les regions concernees.");
      return false;
    }
    if (["Departement", "Arrondissement", "FDP"].indexOf(record.localizationLevel) > -1 && !(record.localizationDepartments || []).length) {
      window.alert("Veuillez selectionner le ou les departements concernes.");
      return false;
    }
    if (["Arrondissement", "FDP"].indexOf(record.localizationLevel) > -1 && !(record.localizationArrondissements || []).length) {
      window.alert("Veuillez selectionner le ou les arrondissements concernes.");
      return false;
    }
    if (record.localizationLevel === "FDP" && !(record.fdpIds || []).length) {
      window.alert("Veuillez selectionner le ou les FDP concernes.");
      return false;
    }
    return true;
  }

  function validateMonthlyGrantContributions(record) {
    var items = record.grantContributions || [];
    if (!items.length) {
      window.alert("Veuillez selectionner au moins un grant rattache.");
      return false;
    }
    if (record.grantTargets && record.grantTargets.length) {
      var target = Number(record.target || 0);
      var grantTargetTotal = budgetGrantTargetsTotal(record.grantTargets);
      if (target <= 0) {
        window.alert("Veuillez renseigner une cible globale superieure a 0 lorsque la planification par grant est active.");
        return false;
      }
      if (Math.abs(grantTargetTotal - target) > 0.001) {
        window.alert("La somme des cibles par grant (" + formatDecimal(grantTargetTotal, 3) + ") doit etre egale a la cible globale (" + formatDecimal(target, 3) + ").");
        return false;
      }
    }
    var total = 0;
    for (var i = 0; i < items.length; i += 1) {
      var percent = Number(items[i].contributionPercent || 0);
      if (percent <= 0) {
        window.alert("Veuillez renseigner un pourcentage de contribution superieur a 0 pour chaque grant selectionne.");
        return false;
      }
      total += percent;
    }
    return true;
  }

  function validateProjectActivityDates(record) {
    var project = findByRecordId(store.projects, record.projectId);
    if (!project) return true;
    if (record.startDate && project.startDate && record.startDate < project.startDate) {
      window.alert("La date de debut de l'activite doit etre posterieure ou egale a la date de debut du projet (" + project.startDate + ").");
      return false;
    }
    if (record.endDate && project.endDate && record.endDate > project.endDate) {
      window.alert("La date de fin de l'activite doit etre avant ou egale a la date de fin du projet (" + project.endDate + ").");
      return false;
    }
    if (record.startDate && record.endDate && record.endDate < record.startDate) {
      window.alert("La date de fin de l'activite ne peut pas etre anterieure a sa date de debut.");
      return false;
    }
    return true;
  }

  function validateHgsfPurchaseOrder(record) {
    var lines = record.orderLines || [];
    for (var i = 0; i < lines.length; i += 1) {
      var remaining = hgsfRemainingStockForOrderLine(record, lines[i].ingredient);
      if (Number(lines[i].quantity || 0) > remaining) {
        window.alert("Commande superieure au stock restant pour " + lines[i].ingredient + ". Stock restant: " + formatDecimal(remaining, 3) + " Kg.");
        return false;
      }
    }
    return true;
  }

  function stampRecordOwnership(record, previousRecord) {
    var email = currentUserEmail();
    if (previousRecord) {
      record.createdByEmail = previousRecord.createdByEmail || email;
      record.createdByUserId = previousRecord.createdByUserId || "";
      record.createdAt = previousRecord.createdAt || record.createdAt;
    } else {
      record.createdByEmail = email;
      var user = currentUser();
      record.createdByUserId = user ? user.id : "";
    }
    record.updatedByEmail = email;
    record.updatedAt = new Date().toISOString();
  }

  function normalizeUserRecord(record, previousRecord) {
    record.email = normalizeEmail(record.email);
    record.id = generatedUserId(todayIsoDate(), state.editingId || record.id);
    if (record.email === adminEmail) record.role = "Admin";
    var current = currentUser();
    if (!isAdminUser(current) && previousRecord && previousRecord.role === "Admin") return previousRecord;
    if (!isAdminUser(current) && record.role === "Admin") record.role = previousRecord ? previousRecord.role : "Visitor";
    if (!record.role) record.role = "Visitor";
    if (!record.status) record.status = "Active";
    if (!record.managerEmail && current && current.role === "Validator") record.managerEmail = current.email;
    if (current && !isAdminUser(current)) record = limitAssignedAccessToManagerScope(record, current);
    return record;
  }

  function limitAssignedAccessToManagerScope(record, manager) {
    var scope = userAccessScope(manager);
    if (scope.projects.length) record.accessProjects = filterValidValues(record.accessProjects || [], scope.projects);
    if (scope.regions.length) record.accessRegions = filterValidValues(record.accessRegions || [], scope.regions);
    if (scope.departments.length) record.accessDepartments = filterValidValues(record.accessDepartments || [], scope.departments);
    if (scope.arrondissements.length) record.accessArrondissements = filterValidValues(record.accessArrondissements || [], scope.arrondissements);
    if (scope.fdps.length) record.accessFdps = filterValidValues(record.accessFdps || [], scope.fdps);
    if (manager.accessPages && manager.accessPages.length) record.accessPages = filterValidValues(record.accessPages || [], manager.accessPages);
    return record;
  }

  function prepareRecordBeforeSave(record) {
    var previousRecord = state.editingId ? findByRecordId(store[state.page] || [], state.editingId) : null;
    if (previousRecord && previousRecord.returnHistory) {
      record.returnHistory = previousRecord.returnHistory;
      record.returnReason = previousRecord.returnReason || "";
      record.returnedAt = previousRecord.returnedAt || "";
    }
    if (workflowPage(state.page)) record.status = "Draft";
    stampRecordOwnership(record, previousRecord);
    if (state.page === "users") record = normalizeUserRecord(record, previousRecord);
    if (state.page === "hgsfIngredients") {
      record = normalizeHgsfIngredientDraft(record);
      record.id = generatedHgsfIngredientId(record, state.editingId);
      record.priceHistory = hgsfPriceHistory(record, state.editingId);
    }
    if (state.page === "hgsfMenus") record.id = generatedSimpleSequentialId("MENU", store.hgsfMenus, state.editingId);
    if (state.page === "hgsfSchoolMenus") {
      record = normalizeHgsfSchoolMenuDraft(record);
      record.id = generatedSimpleSequentialId("SCHMENU", store.hgsfSchoolMenus, state.editingId);
    }
    if (state.page === "hgsfEstimations") {
      record = normalizeHgsfEstimationDraft(record);
      record.id = generatedHgsfEstimationId(record, state.editingId);
    }
    if (state.page === "hgsfPurchaseOrders") {
      record = normalizeHgsfPurchaseOrderDraft(record);
      record.id = generatedSimpleSequentialId("BCHGSF", store.hgsfPurchaseOrders, state.editingId);
    }
    if (state.page === "hgsfDeliveries") record.id = generatedSimpleSequentialId("DELHGSF", store.hgsfDeliveries, state.editingId);
    if (state.page === "hgsfDeliveryInvoices") record.id = generatedSimpleSequentialId("FACHGSF", store.hgsfDeliveryInvoices, state.editingId);
    if (state.page === "hgsfInvoicePayments") {
      var inv = findByRecordId(store.hgsfDeliveryInvoices, record.invoiceId) || {};
      if (!record.amountTransferredToSchool) record.amountTransferredToSchool = Number(inv.invoiceAmount || 0);
      record.id = generatedSimpleSequentialId("PAYHGSF", store.hgsfInvoicePayments, state.editingId);
    }
    if (state.page === "hgsfSchoolCoopPayments") {
      var invoice = findByRecordId(store.hgsfDeliveryInvoices, record.invoiceId) || {};
      var payment = findById(store.hgsfInvoicePayments, "transactionNumber", record.schoolTransactionNumber) || {};
      if (!record.amountDue) record.amountDue = Number(invoice.invoiceAmount || payment.amountTransferredToSchool || 0);
      record.balanceToPay = Number(record.amountDue || 0) - Number(record.amountPaidToCoop || 0);
      record.id = generatedSimpleSequentialId("SCHPAY", store.hgsfSchoolCoopPayments, state.editingId);
    }
    if (state.page === "assistanceRations") record.id = generatedSimpleSequentialId("RAT", store.assistanceRations, state.editingId);
    if (state.page === "gfdNeeds" || state.page === "cbtNeeds" || state.page === "nutritionNeeds") {
      record = normalizeNeedEstimateDraft(record);
      var needPrefix = state.page === "cbtNeeds" ? "CBT" : state.page === "nutritionNeeds" ? "NUT" : "GFD";
      record.id = generatedSimpleSequentialId(needPrefix, store[state.page], state.editingId);
    }
    if (state.page === "fieldOffices") record.id = generatedFieldOfficeId(record, state.editingId);
    if (state.page === "sites") record.id = generatedSiteId(record, state.editingId);
    if (state.page === "fdps") record.id = generatedFdpId(record, state.editingId);
    if (state.page === "cooperativePartners") {
      record = normalizeCooperativePartnerDraft(record);
      record.id = generatedCooperativePartnerId(record, state.editingId);
    }
    if (state.page === "strategicDocuments") record.id = generatedMonthYearId("DOC", store.strategicDocuments, todayIsoDate(), state.editingId);
    if (state.page === "stakeholders") {
      record = normalizeStakeholderLocationDraft(record);
      record.id = generatedStakeholderId(record, state.editingId);
    }
    if (state.page === "partnerStaffs") {
      record = normalizePartnerStaffRecord(record);
      record.id = generatedPartnerStaffId(record, state.editingId);
    }
    if (state.page === "projectActivities") record.id = generatedActivityId(record, state.editingId);
    if (state.page === "projectActivities") applyActivityFocalContact(record);
    if (state.page === "projectSubActivities") {
      applySubActivityProjectFromActivity(record);
      record.id = generatedSubActivityId(record, state.editingId);
    }
    if (state.page === "kpis") applyKpiProjectFromActivity(record);
    if (state.page === "kpis") record.id = generatedKpiId(record, state.editingId);
    if (state.page === "processIndicators") {
      record = normalizeProcessIndicatorRecord(record);
      record.id = generatedProcessIndicatorId(record, state.editingId);
    }
    if (state.page === "budgets") {
      record = normalizeBudgetDraft(record);
      record.amountXaf = budgetGrantAmountsTotal(record.grantAmounts) || Number(record.amountXaf || 0);
      record.grantCodes = (record.grantAmounts || []).map(function (item) { return item.grantCode; });
      record.grantCode = record.grantCodes[0] || "";
      record.id = generatedBudgetId(record, state.editingId);
    }
    if (state.page === "grantInKinds") {
      record = normalizeGrantInKindDraft(record);
      record.id = generatedGrantInKindId(record, state.editingId);
    }
    if (state.page === "monthlyPlans") {
      record = normalizeMonthlyPlanDraft(record);
      record.grantCodes = monthlyGrantCodes(record);
      record.grantCode = record.grantCodes[0] || "";
      record.id = generatedMonthlyPlanId(record, state.editingId);
    }
    if (state.page === "recommendations") {
      var previousRecommendation = state.editingId ? findByRecordId(store.recommendations, state.editingId) : null;
      record.id = generatedRecommendationId(record, state.editingId);
      record.recommendationStatus = record.recommendationStatus || "Not started";
      record.actionHistory = previousRecommendation ? previousRecommendation.actionHistory || [] : [];
      if (record.recommendationStatus !== "Completed") record.completionDate = "";
    }
    if (state.page === "distributionReports") {
      record.id = generatedMonthYearId("DISTREP", store.distributionReports, record.month || currentMonthValue(), state.editingId);
      var plan = findByRecordId(store.monthlyPlans, record.planId) || {};
      record.projectId = record.projectId || plan.projectId || "";
    }
    if (state.page === "nfis") record.id = generatedMonthYearId("NFI", store.nfis, record.purchaseDate || todayIsoDate(), state.editingId);
    if (state.page === "nfiDistributions") record.id = generatedMonthYearId("NFIDIST", store.nfiDistributions, record.distributionDate || todayIsoDate(), state.editingId);
    if (state.page === "nfiInventories") record.id = generatedMonthYearId("NFIINV", store.nfiInventories, todayIsoDate(), state.editingId);
    if (state.page === "partnerInvoices") {
      record.activityGrantAmounts = record.activityGrantAmounts || [];
      record.invoiceTotalXaf = partnerInvoiceAmountsTotal(record.activityGrantAmounts) || Number(record.invoiceTotalXaf || 0);
      var savedInvoice = findByRecordId(store.savedInvoices, record.invoiceSystemId) || {};
      record.partnerVendor = record.partnerVendor || savedInvoice.partnerVendor || "";
      record.projectId = record.projectId || savedInvoice.projectId || "";
    }
    if (state.page === "partnerInvoicePayments") {
      var partnerInvoice = findByRecordId(store.partnerInvoices, record.invoiceId) || {};
      var outstanding = partnerInvoicePaymentOutstanding(record.invoiceId, state.editingId);
      record.invoiceAmountXaf = Number(partnerInvoice.invoiceTotalXaf || 0);
      if (!record.amountPaidXaf) record.amountPaidXaf = outstanding;
      record.balanceXaf = outstanding - Number(record.amountPaidXaf || 0);
      record.id = generatedMonthYearId("PAYINV", store.partnerInvoicePayments, record.paymentDate || todayIsoDate(), state.editingId);
    }
    if (state.page === "monthlyExpenses") record = normalizeMonthlyExpenseDraft(record);
    if (state.page === "grants") {
      preserveGrantAutoStatus(record);
      applyGrantStatusRule(record);
    }
    if (state.page === "staffs" || state.page === "partnerStaffs") applyStaffStatusRule(record);
  }

  function refreshStaffStatuses() {
    for (var i = 0; i < store.staffs.length; i += 1) applyStaffStatusRule(store.staffs[i]);
    for (var j = 0; j < store.partnerStaffs.length; j += 1) applyStaffStatusRule(store.partnerStaffs[j]);
  }

  function applyStaffStatusRule(staff) {
    if (!staff.staffStatus) staff.staffStatus = "Actif";
    if (staff.endDate && staff.endDate < todayIsoDate()) staff.staffStatus = "Inactif";
  }

  function refreshGrantStatuses() {
    for (var i = 0; i < store.grants.length; i += 1) applyGrantStatusRule(store.grants[i]);
  }

  function applyGrantStatusRule(grant) {
    if (!grant.grantStatus) grant.grantStatus = "Actif";
    var expired = false;
    if (grant.grantModality === "Vivre") {
      var items = grant.foodItems || [];
      expired = !!items.length;
      for (var i = 0; i < items.length; i += 1) if (items[i].tdd && items[i].tdd >= todayIsoDate()) expired = false;
    } else {
      expired = !!grant.tdd && grant.tdd < todayIsoDate();
    }
    if (expired) {
      grant.grantStatus = "Inactif";
      grant._grantAutoInactive = true;
    } else if (grant._grantAutoInactive) {
      grant.grantStatus = "Actif";
      grant._grantAutoInactive = false;
    }
  }

  function preserveGrantAutoStatus(record) {
    var previous = state.editingId ? findByRecordId(store.grants, state.editingId) : null;
    record._grantAutoInactive = !!(previous && previous._grantAutoInactive && previous.grantStatus === "Inactif" && record.grantStatus === "Inactif");
  }

  function todayIsoDate() {
    var now = new Date();
    var month = String(now.getMonth() + 1);
    var day = String(now.getDate());
    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;
    return now.getFullYear() + "-" + month + "-" + day;
  }


  function generatedPartnerStaffId(draft, editingId) {
    if (editingId) return editingId;
    var now = new Date();
    var month = String(now.getMonth() + 1);
    if (month.length < 2) month = "0" + month;
    var year = String(now.getFullYear());
    var cpCode = partnerInitials(draft.partnerVendor);
    var suffix = "/" + month + "/" + year + "/" + cpCode;
    var next = 1;
    for (var i = 0; i < store.partnerStaffs.length; i += 1) {
      if (String(store.partnerStaffs[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function firstPartnerVendor() {
    return (store.partners && store.partners.length > 0) ? store.partners[0].vendor : "";
  }

  function partnerInitials(partnerVendor) {
    var partner = findById(store.partners, "vendor", partnerVendor);
    return initialsFrom(partner ? partner.name : partnerVendor || "CP", "CP").slice(0, 4);
  }

  function defaultDraft(pageId) {
    var activeProject = state.contextProjectId || firstProjectId();
    if (pageId === "hgsfIngredients") return normalizeHgsfIngredientDraft({ country: "Cameroon" });
    if (pageId === "hgsfMenus") return { id: generatedSimpleSequentialId("MENU", store.hgsfMenus, "") };
    if (pageId === "hgsfSchoolMenus") return normalizeHgsfSchoolMenuDraft({ id: generatedSimpleSequentialId("SCHMENU", store.hgsfSchoolMenus, "") });
    if (pageId === "hgsfEstimations") return normalizeHgsfEstimationDraft({ id: generatedHgsfEstimationId({ periodValue: currentMonthValue() }, ""), periodType: "Mensuelle", periodValue: currentMonthValue(), periodStartDate: monthDateRange(currentMonthValue()).start, coveredDays: hgsfDefaultCoveredDays("Mensuelle"), workdaysOnly: "Oui", informationVaries: "Non" });
    if (pageId === "hgsfPurchaseOrders") return normalizeHgsfPurchaseOrderDraft({ id: generatedSimpleSequentialId("BCHGSF", store.hgsfPurchaseOrders, "") });
    if (pageId === "hgsfDeliveries") return { id: generatedSimpleSequentialId("DELHGSF", store.hgsfDeliveries, ""), deliveryDate: todayIsoDate() };
    if (pageId === "hgsfDeliveryInvoices") return { id: generatedSimpleSequentialId("FACHGSF", store.hgsfDeliveryInvoices, ""), invoiceDate: todayIsoDate() };
    if (pageId === "hgsfInvoicePayments") return { id: generatedSimpleSequentialId("PAYHGSF", store.hgsfInvoicePayments, ""), transactionDate: todayIsoDate() };
    if (pageId === "hgsfSchoolCoopPayments") return { id: generatedSimpleSequentialId("SCHPAY", store.hgsfSchoolCoopPayments, "") };
    if (pageId === "assistanceRations") return { id: generatedSimpleSequentialId("RAT", store.assistanceRations, ""), subActivityType: "GFA", modality: "In kind", rationItems: defaultRationItems({ subActivityType: "GFA", modality: "In kind" }) };
    if (pageId === "gfdNeeds" || pageId === "cbtNeeds" || pageId === "nutritionNeeds") return normalizeNeedEstimateDraft({ needType: pageId === "cbtNeeds" ? "CBT" : pageId === "nutritionNeeds" ? "Nutrition" : "GFD", modality: pageId === "cbtNeeds" ? "CBT" : "In kind" });
    if (pageId === "fieldOffices") return { country: "Cameroon", id: generatedFieldOfficeId({ country: "Cameroon" }, "") };
    if (pageId === "sites") return normalizeSiteDraft({ country: "Cameroon" });
    if (pageId === "fdps") return { arrondissement: firstArrondissement(), id: generatedFdpId({ arrondissement: firstArrondissement() }, "") };
    if (pageId === "cooperativePartners") return normalizeCooperativePartnerDraft({ country: "Cameroon", organizationType: "Cooperative" });
    if (pageId === "workspaceProfiles") return { id: generatedSimpleSequentialId("ORG", store.workspaceProfiles, ""), country: "Cameroon", organizationType: "ONG" };
    if (pageId === "strategicDocuments") return { id: generatedMonthYearId("DOC", store.strategicDocuments, todayIsoDate(), ""), name: "CSP2", validFrom: currentMonthValue(), validTo: String(new Date().getFullYear() + 4) + "-12", soIds: ["SO1"], cspActivityIds: ["A1"] };
    if (pageId === "portfolios") return { id: generatedSimpleSequentialId("PORT", store.portfolios, ""), strategicDocumentId: firstStrategicDocumentId(), ownerId: firstStaffId(), priority: "High", governanceCadence: "Monthly portfolio review" };
    if (pageId === "programmes") return { id: generatedSimpleSequentialId("PRG", store.programmes, ""), portfolioId: firstPortfolioId(), strategicDocumentId: firstStrategicDocumentId(), managerId: firstStaffId(), startDate: todayIsoDate() };
    if (pageId === "projects") return { currency: "XAF", portfolioId: firstPortfolioId(), programmeId: firstProgrammeId(firstPortfolioId()) };
    if (pageId === "stakeholders") return { projectId: activeProject, localizedStakeholder: "Non", localizationLevel: "FDP", localizationCountry: "Cameroon", isPartnerStaff: "Non", id: generatedStakeholderId({ projectId: activeProject }, "") };
    if (pageId === "partnerStaffs") {
      var partnerStaffProject = findByRecordId(store.projects, firstProjectId()) || {};
      return { projectId: partnerStaffProject.id || "", partnerVendor: partnerStaffProject.partnerVendor || firstPartnerVendor(), startDate: partnerStaffProject.startDate || "", endDate: partnerStaffProject.endDate || "", staffStatus: "Actif", id: generatedPartnerStaffId({ partnerVendor: partnerStaffProject.partnerVendor || firstPartnerVendor() }, "") };
    }
    if (pageId === "projectActivities") return { projectId: activeProject, modality: "Cash", id: generatedActivityId({ projectId: activeProject }, "") };
    if (pageId === "projectSubActivities") return { projectId: activeProject, activityId: firstActivityId(activeProject), id: generatedSubActivityId({ projectId: activeProject, activityId: firstActivityId(activeProject) }, "") };
    if (pageId === "kpis") return { projectId: activeProject, activityId: firstActivityId(activeProject), id: generatedKpiId({ projectId: activeProject, activityId: firstActivityId(activeProject) }, "") };
    if (pageId === "processIndicators") return { projectId: activeProject, kpiIds: [], processKpiDetails: [], id: generatedProcessIndicatorId({ projectId: activeProject }, "") };
    if (pageId === "implementationPlans") return { id: generatedSimpleSequentialId("IMP", store.implementationPlans, "/" + activeProject), projectId: activeProject, planType: "Integrated implementation plan", ownerId: firstStaffId(), startDate: todayIsoDate() };
    if (pageId === "communicationPlans") return { id: generatedSimpleSequentialId("COM", store.communicationPlans, "/" + activeProject), projectId: activeProject, messageType: "Progress update", channel: "Reunion", frequency: "Mensuelle", ownerId: firstStaffId() };
    if (pageId === "procurementPlans") return { id: generatedSimpleSequentialId("PROC", store.procurementPlans, "/" + activeProject), projectId: activeProject, procurementMethod: "Request for quotation", currency: projectCurrency(activeProject), ownerId: firstStaffId() };
    if (pageId === "riskRegisters") return { id: generatedSimpleSequentialId("RISK", store.riskRegisters, "/" + activeProject), projectId: activeProject, riskCategory: "Operational", probability: "Medium", impact: "High", responseStrategy: "Mitigate", ownerId: firstStaffId(), riskStatus: "Open" };
    if (pageId === "qualityPlans") return { id: generatedSimpleSequentialId("QLT", store.qualityPlans, "/" + activeProject), projectId: activeProject, controlMethod: "Checklist", ownerId: firstStaffId(), reviewFrequency: "Mensuelle" };
    if (pageId === "resourcePlans") return { id: generatedSimpleSequentialId("RES", store.resourcePlans, "/" + activeProject), projectId: activeProject, resourceType: "Human resource", quantity: 1, ownerId: firstStaffId() };
    if (pageId === "budgets") return { projectId: activeProject, grantCode: firstGrantCodeForProject(activeProject), costCategory: firstCostCategory(), subCategory: firstSubCategory(firstCostCategory()), id: generatedBudgetId({ projectId: activeProject, costCategory: firstCostCategory(), subCategory: firstSubCategory(firstCostCategory()) }, "") };
    if (pageId === "grantInKinds") return normalizeGrantInKindDraft({ projectId: activeProject, grantCode: firstGrantCodeForProject(activeProject), hasInKind: "Non" });
    if (pageId === "monthlyPlans") {
      var monthlyProjectId = activeProject;
      var monthlyActivityId = firstActivityId(monthlyProjectId);
      var monthlyGrantCode = firstMonthlyGrantCode({ projectId: monthlyProjectId, activityId: monthlyActivityId });
      return {
        month: currentMonthValue(),
        projectId: monthlyProjectId,
        activityId: monthlyActivityId,
        grantCode: monthlyGrantCode,
        grantContributions: monthlyGrantCode ? [{ grantCode: monthlyGrantCode, contributionPercent: 100 }] : [],
        localizedActivity: "Non",
        localizationLevel: "FDP",
        localizationCountry: "Cameroon",
        plannedStartDate: monthDateRange(currentMonthValue()).start,
        plannedEndDate: monthDateRange(currentMonthValue()).end,
        id: generatedMonthlyPlanId({ month: currentMonthValue() }, "")
      };
    }
    if (pageId === "monthlyExpenses") return normalizeMonthlyExpenseDraft({ projectId: activeProject, month: currentMonthValue() });
    if (pageId === "recommendations") return { id: generatedRecommendationId({ date: todayIsoDate() }, ""), date: todayIsoDate(), projectId: activeProject, subActivityType: "GFA", modality: "CBT", whatWhere: "All staff meeting", unit: "Organisation", recommendationStatus: "Not started", actionHistory: [] };
    if (pageId === "distributionReports") return { id: generatedMonthYearId("DISTREP", store.distributionReports, currentMonthValue(), ""), month: currentMonthValue(), projectId: activeProject, modality: "In Kind", distributionLines: [] };
    if (pageId === "nfis") return { id: generatedMonthYearId("NFI", store.nfis, todayIsoDate(), ""), projectId: activeProject, purchaseDate: todayIsoDate() };
    if (pageId === "nfiDistributions") return { id: generatedMonthYearId("NFIDIST", store.nfiDistributions, todayIsoDate(), ""), distributionDate: todayIsoDate(), projectId: activeProject };
    if (pageId === "nfiInventories") return { id: generatedMonthYearId("NFIINV", store.nfiInventories, todayIsoDate(), ""), projectId: activeProject, inventoryItems: [] };
    if (pageId === "partnerInvoices") return { projectId: activeProject, partnerVendor: (findByRecordId(store.projects, activeProject) || {}).partnerVendor || "", activityGrantAmounts: [] };
    if (pageId === "partnerInvoicePayments") return { id: generatedMonthYearId("PAYINV", store.partnerInvoicePayments, todayIsoDate(), ""), paymentDate: todayIsoDate() };
    if (pageId === "users") return { id: generatedUserId(todayIsoDate(), ""), role: "Visitor", status: "Active", managerEmail: currentUserEmail() };
    return {};
  }

  function normalizeSiteDraft(draft) {
    draft = draft || {};
    draft.country = draft.country || "Cameroon";
    var countryData = countryTree[draft.country] || {};
    var regions = Object.keys(countryData);
    if (!draft.region || regions.indexOf(draft.region) < 0) draft.region = regions[0] || "";
    var departments = Object.keys(countryData[draft.region] || {});
    if (!draft.department || departments.indexOf(draft.department) < 0) draft.department = departments[0] || "";
    var arrondissements = (countryData[draft.region] || {})[draft.department] || [];
    if (!draft.arrondissement || arrondissements.indexOf(draft.arrondissement) < 0) draft.arrondissement = arrondissements[0] || "";
    draft.id = generatedSiteId(draft, state.editingId);
    return draft;
  }

  function syncAdministrativeSitesFromFdps() {
    if (!store.fdps || !store.fdps.length) return;
    var existing = {};
    for (var s = 0; s < store.sites.length; s += 1) existing[String(store.sites[s].arrondissement || "").toLowerCase()] = true;
    var created = false;
    for (var i = 0; i < store.fdps.length; i += 1) {
      var fdp = store.fdps[i];
      var arrondissement = fdp.arrondissement || "";
      if (!arrondissement || existing[arrondissement.toLowerCase()]) continue;
      var meta = adminMetaForArrondissement(arrondissement, "Cameroon") || { country: "Cameroon", region: "", department: "", arrondissement: arrondissement };
      var site = {
        country: meta.country,
        region: meta.region,
        department: meta.department,
        arrondissement: arrondissement,
        arrondissementFocalPointName: fdp.siteFocalPointName || "",
        arrondissementFocalPointPhone: fdp.phone || "",
        accessLevel: "",
        securityPhase: "",
        status: "Draft"
      };
      site.id = generatedSiteId(site, "");
      store.sites.push(site);
      existing[arrondissement.toLowerCase()] = true;
      created = true;
    }
    if (created) saveStoredData();
  }

  function normalizeCooperativePartnerDraft(draft) {
    draft = draft || {};
    draft.country = draft.country || "Cameroon";
    draft.organizationType = draft.organizationType || "Cooperative";
    var countryData = countryTree[draft.country] || {};
    var regions = Object.keys(countryData);
    if (!draft.region || regions.indexOf(draft.region) < 0) draft.region = regions[0] || "";
    var departments = Object.keys(countryData[draft.region] || {});
    if (!draft.department || departments.indexOf(draft.department) < 0) draft.department = departments[0] || "";
    var arrondissements = (countryData[draft.region] || {})[draft.department] || [];
    if (!draft.arrondissement || arrondissements.indexOf(draft.arrondissement) < 0) draft.arrondissement = arrondissements[0] || "";
    draft.localizationRegions = arrayValue(draft.localizationRegions);
    if (draft.region && draft.localizationRegions.indexOf(draft.region) < 0) draft.localizationRegions.push(draft.region);
    draft.localizationDepartments = filterValuesByOptions(arrayValue(draft.localizationDepartments || draft.department), hgsfDepartmentOptions(draft));
    draft.localizationArrondissements = filterValuesByOptions(arrayValue(draft.localizationArrondissements || draft.arrondissement), hgsfArrondissementOptions(draft));
    draft.schoolFdpIds = filterValuesByOptions(arrayValue(draft.schoolFdpIds), hgsfSchoolHierarchyOptions(draft));
    draft.id = generatedCooperativePartnerId(draft, state.editingId);
    return draft;
  }

  function updateGeneratedFieldOfficeId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.fieldOffices, true);
    control.value = generatedFieldOfficeId(draft, state.editingId);
  }

  function updateGeneratedSiteId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.sites, true);
    control.value = generatedSiteId(draft, state.editingId);
  }

  function updateGeneratedFdpId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.fdps, true);
    control.value = generatedFdpId(draft, state.editingId);
  }

  function updateGeneratedCooperativePartnerId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = normalizeCooperativePartnerDraft(readForm(configs.cooperativePartners, true));
    control.value = generatedCooperativePartnerId(draft, state.editingId);
  }

  function updateGeneratedHgsfIngredientId() {
    var control = elements.form.elements.id;
    if (!control) return;
    control.value = generatedHgsfIngredientId(readForm(configs.hgsfIngredients, true), state.editingId);
  }

  function updateGeneratedStakeholderId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.stakeholders, true);
    control.value = generatedStakeholderId(draft, state.editingId);
  }

  function updateGeneratedPartnerStaffId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = normalizePartnerStaffRecord(readForm(configs.partnerStaffs, true));
    control.value = generatedPartnerStaffId(draft, state.editingId);
  }

  function updatePartnerStaffProjectDefaults() {
    var project = findByRecordId(store.projects, elements.form.elements.projectId ? elements.form.elements.projectId.value : "");
    if (!project) return;
    if (elements.form.elements.partnerVendor) elements.form.elements.partnerVendor.value = project.partnerVendor || "";
    if (elements.form.elements.startDate) elements.form.elements.startDate.value = project.startDate || "";
    if (elements.form.elements.endDate) elements.form.elements.endDate.value = project.endDate || "";
    updateGeneratedPartnerStaffId();
  }

  function normalizePartnerStaffRecord(record) {
    var project = findByRecordId(store.projects, record.projectId);
    if (project) {
      if (!record.partnerVendor) record.partnerVendor = project.partnerVendor || "";
      if (!record.startDate) record.startDate = project.startDate || "";
      if (!record.endDate) record.endDate = project.endDate || "";
    }
    if (!record.staffStatus) record.staffStatus = "Actif";
    return record;
  }

  function updateGeneratedActivityId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.projectActivities, true);
    control.value = generatedActivityId(draft, state.editingId);
  }

  function updateGeneratedSubActivityId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.projectSubActivities, true);
    if (!draft.activityId) draft.activityId = firstActivityId(draft.projectId);
    control.value = generatedSubActivityId(draft, state.editingId);
  }

  function updateGeneratedKpiId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.kpis, true);
    if (!draft.activityId) draft.activityId = firstActivityId(draft.projectId);
    control.value = generatedKpiId(draft, state.editingId);
  }

  function updateGeneratedProcessIndicatorId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.processIndicators, true);
    control.value = generatedProcessIndicatorId(draft, state.editingId);
  }

  function updateGeneratedBudgetId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.budgets, true);
    if (!draft.costCategory) draft.costCategory = firstCostCategory();
    if (!draft.subCategory) draft.subCategory = firstSubCategory(draft.costCategory);
    control.value = generatedBudgetId(draft, state.editingId);
  }

  function updateBudgetPartnerFromProject() {
    var projectId = elements.form.elements.projectId ? elements.form.elements.projectId.value : "";
    var project = findByRecordId(store.projects, projectId) || {};
    if (elements.form.elements.partnerVendor) elements.form.elements.partnerVendor.value = project.partnerVendor || "";
  }

  function updateGeneratedGrantInKindId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = normalizeGrantInKindDraft(readForm(configs.grantInKinds, true));
    control.value = generatedGrantInKindId(draft, state.editingId);
  }

  function updateGeneratedMonthlyPlanId() {
    var control = elements.form.elements.id;
    if (!control) return;
    var draft = readForm(configs.monthlyPlans, true);
    control.value = generatedMonthlyPlanId(draft, state.editingId);
  }

  function updateMonthlyPlanDatesFromMonth() {
    if (!elements.form || !elements.form.elements.month) return;
    var range = monthDateRange(elements.form.elements.month.value || currentMonthValue());
    if (elements.form.elements.plannedStartDate) elements.form.elements.plannedStartDate.value = range.start;
    if (elements.form.elements.plannedEndDate) elements.form.elements.plannedEndDate.value = range.end;
  }

  function updateActivityFocalContact() {
    var focalControl = elements.form.elements.partnerFocalPoint;
    if (!focalControl) return;
    var stakeholder = findByRecordId(store.stakeholders, focalControl.value);
    var phoneControl = elements.form.elements.phone;
    var emailControl = elements.form.elements.email;
    if (phoneControl) phoneControl.value = stakeholder ? stakeholder.phone || "" : "";
    if (emailControl) emailControl.value = stakeholder ? stakeholder.email || "" : "";
  }

  function applyActivityFocalContact(record) {
    var stakeholder = findByRecordId(store.stakeholders, record.partnerFocalPoint);
    if (!stakeholder) return;
    record.phone = stakeholder.phone || "";
    record.email = stakeholder.email || "";
  }

  function applyKpiProjectFromActivity(record) {
    var activity = findByRecordId(store.projectActivities, record.activityId);
    if (activity) record.projectId = activity.projectId || record.projectId;
  }

  function applySubActivityProjectFromActivity(record) {
    var activity = findByRecordId(store.projectActivities, record.activityId);
    if (activity) record.projectId = activity.projectId || record.projectId;
  }

  function normalizeProcessIndicatorRecord(record) {
    if (record.processKpiDetails && record.processKpiDetails.length) {
      var detail = record.processKpiDetails[0];
      record.kpiId = detail.kpiId || record.kpiId || "";
      record.activityId = detail.activityId || record.activityId || "";
      record.label = detail.label || record.label || "";
      record.frequency = detail.frequency || record.frequency || "";
      record.dataSource = detail.dataSource || record.dataSource || "";
      record.target = detail.target || record.target || "";
      record.responsiblePam = detail.responsiblePam || record.responsiblePam || "";
      record.partnerFocalPoint = detail.partnerFocalPoint || record.partnerFocalPoint || "";
      record.comment = detail.comment || record.comment || "";
    }
    return record;
  }

  function saveProcessIndicatorsFromSelection(record) {
    if (!validateProcessIndicatorSelection(record)) return;
    var created = 0;
    var skipped = 0;
    for (var i = 0; i < record.processKpiDetails.length; i += 1) {
      var detail = record.processKpiDetails[i];
      var nextRecord = {
        projectId: record.projectId,
        kpiIds: [detail.kpiId],
        processKpiDetails: [detail],
        kpiId: detail.kpiId,
        activityId: detail.activityId,
        label: detail.label,
        frequency: detail.frequency,
        dataSource: detail.dataSource,
        target: detail.target,
        responsiblePam: detail.responsiblePam,
        partnerFocalPoint: detail.partnerFocalPoint,
        comment: detail.comment,
        status: "Draft",
        createdAt: new Date().toISOString()
      };
      nextRecord.id = generatedProcessIndicatorId(nextRecord, "");
      if (processIndicatorForKpiExists(nextRecord.projectId, nextRecord.kpiId)) {
        skipped += 1;
        continue;
      }
      store.processIndicators.push(nextRecord);
      created += 1;
    }
    if (!created && skipped) {
      window.alert("Tous les KPIs selectionnes ont deja un indicateur process pour ce projet.");
      return;
    }
    state.formOpen = false;
    elements.form.reset();
    window.alert(created + " indicateur(s) process cree(s)." + (skipped ? " " + skipped + " KPI(s) deja existant(s) ignore(s)." : ""));
    render();
  }

  function processIndicatorForKpiExists(projectId, kpiId) {
    for (var i = 0; i < store.processIndicators.length; i += 1) {
      if (store.processIndicators[i].projectId === projectId && store.processIndicators[i].kpiId === kpiId) return true;
    }
    return false;
  }

  function generatedSiteId(record, existingId) {
    if (existingId) return existingId;
    var year = new Date().getFullYear();
    var countryCode = countryInitials(record.country || "Cameroon");
    var regionCode = initialsFrom(record.region || "Region", "RG");
    var suffix = "/" + countryCode + "/" + regionCode + "/" + year;
    var next = 1;
    for (var i = 0; i < store.sites.length; i += 1) {
      if (String(store.sites[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function generatedFdpId(record, existingId) {
    if (existingId) return existingId;
    var arrondissement = record.arrondissement || firstArrondissement() || "Arrondissement";
    var suffix = "/" + slugPart(arrondissement);
    var next = 1;
    for (var i = 0; i < store.fdps.length; i += 1) if (String(store.fdps[i].id || "").indexOf(suffix) > -1) next += 1;
    return pad3(next) + suffix;
  }

  function generatedCooperativePartnerId(record, existingId) {
    if (existingId) return existingId;
    var type = record.organizationType === "GIC" ? "GIC" : record.organizationType === "Cooperative" ? "COOP" : "PART";
    var next = 1;
    for (var i = 0; i < store.cooperativePartners.length; i += 1) {
      if (String(store.cooperativePartners[i].id || "").indexOf(type) === 0) next += 1;
    }
    return type + pad3(next);
  }

  function generatedHgsfIngredientId(record, existingId) {
    if (existingId) return existingId;
    return generatedSimpleSequentialId("ING", store.hgsfIngredients, "");
  }

  function generatedHgsfEstimationId(record, existingId) {
    if (existingId) return existingId;
    var year = String((record.periodValue || currentMonthValue()).substring(0, 4) || new Date().getFullYear());
    var prefix = "HGSF/" + year + "/";
    var next = 1;
    for (var i = 0; i < store.hgsfEstimations.length; i += 1) if (String(store.hgsfEstimations[i].id || "").indexOf(prefix) === 0) next += 1;
    return prefix + pad3(next);
  }

  function generatedSimpleSequentialId(prefix, items, existingId) {
    if (existingId) return existingId;
    var next = 1;
    for (var i = 0; i < items.length; i += 1) if (String(items[i].id || "").indexOf(prefix) === 0) next += 1;
    return prefix + pad3(next);
  }

  function hgsfPriceHistory(record, existingId) {
    var old = existingId ? findByRecordId(store.hgsfIngredients, existingId) : null;
    var history = old && old.priceHistory ? old.priceHistory.slice() : [];
    var oldPrices = old ? JSON.stringify(old.priceEntries || [{ arrondissement: old.arrondissement || "", priceXaf: Number(old.priceXaf || 0) }]) : "";
    var newPrices = JSON.stringify(record.priceEntries || []);
    if (!old || oldPrices !== newPrices) {
      history.push({
        priceXaf: Number(record.priceXaf || 0),
        priceEntries: record.priceEntries || [],
        effectiveDate: record.effectiveDate || todayIsoDate(),
        modifiedBy: currentUserLabel(),
        modifiedAt: new Date().toISOString(),
        submittedBy: "",
        submittedAt: "",
        verifiedBy: "",
        verifiedAt: "",
        validatedBy: "",
        validatedAt: ""
      });
    }
    return history;
  }

  function stampHgsfPriceHistory(record, role) {
    var history = record.priceHistory || [];
    if (!history.length) {
      history.push({ priceXaf: Number(record.priceXaf || 0), priceEntries: record.priceEntries || [], effectiveDate: record.effectiveDate || todayIsoDate(), modifiedBy: currentUserLabel(), modifiedAt: new Date().toISOString(), submittedBy: "", submittedAt: "", verifiedBy: "", verifiedAt: "", validatedBy: "", validatedAt: "" });
    }
    var last = history[history.length - 1];
    if (role === "submitter") {
      last.submittedBy = currentUserLabel();
      last.submittedAt = new Date().toISOString();
    }
    if (role === "verifier") {
      last.verifiedBy = currentUserLabel();
      last.verifiedAt = new Date().toISOString();
    }
    if (role === "validator") {
      last.validatedBy = currentUserLabel();
      last.validatedAt = new Date().toISOString();
    }
    record.priceHistory = history;
  }

  function generatedRecommendationId(record, existingId) {
    if (existingId) return existingId;
    var date = record.date || todayIsoDate();
    var parts = String(date).split("-");
    var year = parts[0] || String(new Date().getFullYear());
    var month = parts[1] || currentMonthValue().split("-")[1] || "01";
    var suffix = "/" + month + "/" + year;
    var next = 1;
    for (var i = 0; i < store.recommendations.length; i += 1) {
      if (String(store.recommendations[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return "REC" + pad3(next) + suffix;
  }

  function generatedUserId(dateValue, existingId) {
    if (existingId) return existingId;
    var parts = String(dateValue || todayIsoDate()).split("-");
    var year = parts[0] || String(new Date().getFullYear());
    var month = parts[1] || currentMonthValue().split("-")[1] || "01";
    var suffix = "/" + month + "/" + year;
    var next = 1;
    for (var i = 0; i < store.users.length; i += 1) if (String(store.users[i].id || "").indexOf(suffix) > -1) next += 1;
    return "USR" + pad3(next) + suffix;
  }

  function userManagerOptions() {
    var out = [];
    var me = currentUser();
    for (var i = 0; i < store.users.length; i += 1) {
      var user = store.users[i];
      if (user.status === "Inactive") continue;
      if (me && me.role !== "Admin" && user.role === "Admin") continue;
      out.push({ value: user.email, label: (user.firstName || "") + " " + (user.lastName || "") + " - " + user.role });
    }
    return out;
  }

  function accessPageOptions() {
    var hidden = { home: true, users: true };
    var out = [];
    for (var i = 0; i < pages.length; i += 1) {
      if (hidden[pages[i][0]]) continue;
      out.push({ value: pages[i][0], label: pages[i][1] });
    }
    return out;
  }

  function assignableAccessPageOptions() {
    var user = currentUser();
    var all = accessPageOptions();
    if (!user || isAdminUser(user) || !user.accessPages || !user.accessPages.length) return all;
    return filterOptionsByValues(all, user.accessPages);
  }

  function assignableProjectOptions() {
    var all = optionPairs(store.projects, "id", "title");
    var user = currentUser();
    if (!user || isAdminUser(user) || !user.accessProjects || !user.accessProjects.length) return all;
    return filterOptionsByValues(all, user.accessProjects);
  }

  function assignableRegionOptions() {
    var all = regionOptions({ country: "Cameroon" });
    var user = currentUser();
    if (!user || isAdminUser(user) || !user.accessRegions || !user.accessRegions.length) return all;
    return filterOptionsByValues(all, user.accessRegions);
  }

  function assignableDepartmentOptions() {
    var all = departmentOptions({ country: "Cameroon" });
    var user = currentUser();
    if (!user || isAdminUser(user) || !user.accessDepartments || !user.accessDepartments.length) return all;
    return filterOptionsByValues(all, user.accessDepartments);
  }

  function assignableArrondissementOptions() {
    var all = arrondissementOptions();
    var user = currentUser();
    if (!user || isAdminUser(user) || !user.accessArrondissements || !user.accessArrondissements.length) return all;
    return filterOptionsByValues(all, user.accessArrondissements);
  }

  function assignableFdpOptions() {
    var all = optionPairs(store.fdps, "id", fdpLabel);
    var user = currentUser();
    if (!user || isAdminUser(user) || !user.accessFdps || !user.accessFdps.length) return all;
    return filterOptionsByValues(all, user.accessFdps);
  }

  function filterOptionsByValues(options, values) {
    values = values || [];
    var normalized = normalizeOptions(options || []);
    var out = [];
    for (var i = 0; i < normalized.length; i += 1) if (values.indexOf(normalized[i].value) > -1) out.push(normalized[i]);
    return out;
  }

  function generatedMonthYearId(prefix, items, dateOrMonth, existingId) {
    if (existingId) return existingId;
    var value = String(dateOrMonth || todayIsoDate());
    var parts = value.split("-");
    var year = parts[0] || String(new Date().getFullYear());
    var month = parts[1] || currentMonthValue().split("-")[1] || "01";
    var suffix = "/" + month + "/" + year;
    var next = 1;
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (String(items[i].id || "").indexOf(prefix + pad3(0)) !== 0 && String(items[i].id || "").indexOf(suffix) > -1) next += 1;
    return prefix + pad3(next) + suffix;
  }

  function partnerInvoiceAmountsTotal(items) {
    var total = 0;
    items = items || [];
    for (var i = 0; i < items.length; i += 1) total += Number(items[i].amountXaf || 0);
    return total;
  }

  function syncPartnerInvoiceTotal() {
    if (state.page !== "partnerInvoices" || !elements.form || !elements.form.elements.invoiceTotalXaf) return;
    elements.form.elements.invoiceTotalXaf.value = partnerInvoiceAmountsTotal(readPartnerInvoiceAmounts("activityGrantAmounts"));
  }

  function syncPartnerInvoicePaymentFields() {
    if (state.page !== "partnerInvoicePayments" || !elements.form) return;
    var invoice = findByRecordId(store.partnerInvoices, elements.form.elements.invoiceId ? elements.form.elements.invoiceId.value : "") || {};
    var invoiceAmount = elements.form.elements.invoiceAmountXaf;
    var paid = elements.form.elements.amountPaidXaf;
    var balance = elements.form.elements.balanceXaf;
    var outstanding = partnerInvoicePaymentOutstanding(invoice.id || "", state.editingId);
    if (invoiceAmount && invoice.id) invoiceAmount.value = Number(invoice.invoiceTotalXaf || 0);
    if (paid) {
      var previousInvoice = paid.getAttribute("data-source-invoice") || "";
      paid.max = String(outstanding);
      if (invoice.id && previousInvoice !== invoice.id) {
        paid.value = outstanding;
        paid.setAttribute("data-source-invoice", invoice.id);
      } else if (!paid.value) paid.value = outstanding;
    }
    if (balance && paid) balance.value = outstanding - Number(paid.value || 0);
  }

  function partnerInvoicePaymentOutstanding(invoiceId, excludePaymentId) {
    var invoice = findByRecordId(store.partnerInvoices, invoiceId) || {};
    var total = Number(invoice.invoiceTotalXaf || 0);
    var paid = 0;
    for (var i = 0; i < store.partnerInvoicePayments.length; i += 1) {
      var payment = store.partnerInvoicePayments[i];
      if (excludePaymentId && recordKey(payment) === excludePaymentId) continue;
      if (payment.invoiceId === invoiceId) paid += Number(payment.amountPaidXaf || 0);
    }
    return Math.max(0, total - paid);
  }

  function updateGeneratedRecommendationId() {
    if (!elements.form || !elements.form.elements.id || state.editingId) return;
    elements.form.elements.id.value = generatedRecommendationId({ date: elements.form.elements.date ? elements.form.elements.date.value : todayIsoDate() }, "");
  }

  function generatedStakeholderId(record, existingId) {
    if (existingId) return existingId;
    var projectId = record.projectId || firstProjectId() || "PROJECT";
    var suffix = "/" + projectId;
    var next = 1;
    for (var i = 0; i < store.stakeholders.length; i += 1) {
      if (String(store.stakeholders[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function generatedActivityId(record, existingId) {
    if (existingId) return existingId;
    var projectId = record.projectId || firstProjectId() || "PROJECT";
    var suffix = "/" + projectId;
    var next = 1;
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      if (String(store.projectActivities[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return "Act" + pad3(next) + suffix;
  }

  function generatedSubActivityId(record, existingId) {
    if (existingId) return existingId;
    var activity = findByRecordId(store.projectActivities, record.activityId) || findByRecordId(store.projectActivities, firstActivityId(record.projectId)) || store.projectActivities[0] || {};
    var activityId = record.activityId || activity.id || "ACT";
    var suffix = "/" + activityId;
    var next = 1;
    for (var i = 0; i < store.projectSubActivities.length; i += 1) {
      if (String(store.projectSubActivities[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return "SAct" + pad3(next) + suffix;
  }

  function generatedKpiId(record, existingId) {
    if (existingId) return existingId;
    var activity = findByRecordId(store.projectActivities, record.activityId) || findByRecordId(store.projectActivities, firstActivityId(record.projectId)) || store.projectActivities[0] || {};
    var activityId = record.activityId || activity.id || "ACT";
    var projectId = activity.projectId || record.projectId || "PROJECT";
    var suffix = "/" + activityId + "/" + projectId;
    var next = 1;
    for (var i = 0; i < store.kpis.length; i += 1) {
      if (String(store.kpis[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return "Ind" + pad3(next) + suffix;
  }

  function generatedProcessIndicatorId(record, existingId) {
    if (existingId) return existingId;
    var projectId = record.projectId || firstProjectId() || "PROJECT";
    var suffix = "/" + projectId;
    var next = 1;
    for (var i = 0; i < store.processIndicators.length; i += 1) {
      if (String(store.processIndicators[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return "PMI" + pad3(next) + suffix;
  }

  function generatedBudgetId(record, existingId) {
    if (existingId) return existingId;
    var projectId = record.projectId || firstProjectId() || "PROJECT";
    var category = record.costCategory || firstCostCategory() || "Categorie";
    var subCategory = record.subCategory || firstSubCategory(category) || "Sous categorie";
    var suffix = "/" + initialsFrom(subCategory, "SC") + "/" + initialsFrom(category, "CC") + "/" + projectId;
    var next = 1;
    for (var i = 0; i < store.budgets.length; i += 1) {
      if (String(store.budgets[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function generatedGrantInKindId(record, existingId) {
    if (existingId) return existingId;
    return "IK/" + slugPart(record.projectId || firstProjectId() || "PROJECT") + "/" + slugPart(record.grantCode || firstGrantCodeForProject(record.projectId) || "GRANT");
  }

  function normalizeGrantInKindDraft(draft) {
    draft = draft || {};
    draft.projectId = draft.projectId || firstProjectId();
    var options = invoiceGrantOptionsForProject(draft.projectId);
    if (!optionValueExists(options, draft.grantCode)) draft.grantCode = options.length ? options[0].value : "";
    draft.hasInKind = draft.hasInKind || "Non";
    draft.kpiIds = filterValidValues(draft.kpiIds || [], kpisForProject(draft.projectId));
    draft.rateScope = draft.rateScope || "Oui";
    draft.id = generatedGrantInKindId(draft, state.editingId);
    return draft;
  }

  function generatedMonthlyPlanId(record, existingId) {
    var parts = monthIdParts(record.month || currentMonthValue());
    var suffix = "/" + parts.month + "/" + parts.year;
    if (existingId && String(existingId).indexOf(suffix) > -1) return existingId;
    var next = 1;
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      if (existingId && recordKey(store.monthlyPlans[i]) === existingId) continue;
      if (String(store.monthlyPlans[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function monthIdParts(value) {
    var monthValue = value || currentMonthValue();
    var year = String(monthValue).substring(0, 4) || String(new Date().getFullYear());
    var month = String(monthValue).substring(5, 7) || String(new Date().getMonth() + 1);
    if (month.length < 2) month = "0" + month;
    return { month: month, year: year };
  }

  function currentMonthValue() {
    var now = new Date();
    var month = String(now.getMonth() + 1);
    if (month.length < 2) month = "0" + month;
    return now.getFullYear() + "-" + month;
  }

  function monthDateRange(monthValue) {
    var parts = monthIdParts(monthValue || currentMonthValue());
    var start = parts.year + "-" + parts.month + "-01";
    var endDate = new Date(Number(parts.year), Number(parts.month), 0);
    var day = String(endDate.getDate());
    if (day.length < 2) day = "0" + day;
    return { start: start, end: parts.year + "-" + parts.month + "-" + day };
  }

  function firstCostCategory() {
    return Object.keys(costSubCategories)[0] || "";
  }

  function firstSubCategory(category) {
    var options = costSubCategories[category] || [];
    return options[0] || "";
  }

  function allBudgetSubCategories() {
    var seen = {};
    var out = [];
    var categories = Object.keys(costSubCategories);
    for (var i = 0; i < categories.length; i += 1) {
      var items = costSubCategories[categories[i]] || [];
      for (var j = 0; j < items.length; j += 1) {
        if (!seen[items[j]]) {
          seen[items[j]] = true;
          out.push(items[j]);
        }
      }
    }
    return out.sort();
  }

  function budgetGrantOptionsForFilter(projectId) {
    return projectId ? grantOptionsForProject(projectId) : allGrantOptions();
  }

  function budgetPartnerOptionsForFilter(projectId) {
    if (!projectId) return optionPairs(store.partners, "vendor", "name");
    var project = findByRecordId(store.projects, projectId);
    if (!project || !project.partnerVendor) return [];
    var partner = findById(store.partners, "vendor", project.partnerVendor);
    return partner ? [{ value: partner.vendor, label: partner.vendor + " - " + partner.name }] : [{ value: project.partnerVendor, label: project.partnerVendor }];
  }

  function budgetCategoryOptionsForFilter(projectId) {
    if (!projectId) return Object.keys(costSubCategories);
    var seen = {};
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      if (store.budgets[i].projectId === projectId && store.budgets[i].costCategory && !seen[store.budgets[i].costCategory]) {
        seen[store.budgets[i].costCategory] = true;
        out.push(store.budgets[i].costCategory);
      }
    }
    return out.length ? out.sort() : Object.keys(costSubCategories);
  }

  function budgetSubCategoriesForFilter(categories, projectId) {
    categories = Object.prototype.toString.call(categories) === "[object Array]" ? categories : (categories ? [categories] : []);
    var base = [];
    if (categories.length) {
      var seenBase = {};
      for (var c = 0; c < categories.length; c += 1) {
        var items = costSubCategories[categories[c]] || [];
        for (var k = 0; k < items.length; k += 1) {
          if (!seenBase[items[k]]) {
            seenBase[items[k]] = true;
            base.push(items[k]);
          }
        }
      }
    } else {
      base = allBudgetSubCategories();
    }
    if (!projectId) return base;
    var used = {};
    for (var i = 0; i < store.budgets.length; i += 1) {
      if (store.budgets[i].projectId !== projectId) continue;
      if (categories.length && categories.indexOf(store.budgets[i].costCategory) < 0) continue;
      if (store.budgets[i].subCategory) used[store.budgets[i].subCategory] = true;
    }
    var out = [];
    for (var j = 0; j < base.length; j += 1) if (used[base[j]]) out.push(base[j]);
    return out.length ? out : base;
  }

  function firstActivityId(projectId) {
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      if (!projectId || store.projectActivities[i].projectId === projectId) return store.projectActivities[i].id;
    }
    return "";
  }

  function firstProjectId() {
    return store.projects.length ? store.projects[0].id : "";
  }

  function firstStrategicDocumentId() {
    return store.strategicDocuments.length ? store.strategicDocuments[0].id : "";
  }

  function firstPortfolioId() {
    return store.portfolios.length ? store.portfolios[0].id : "";
  }

  function firstProgrammeId(portfolioId) {
    for (var i = 0; i < store.programmes.length; i += 1) {
      if (!portfolioId || store.programmes[i].portfolioId === portfolioId) return store.programmes[i].id;
    }
    return "";
  }

  function firstStaffId() {
    return store.staffs.length ? store.staffs[0].id : "";
  }

  function programmeOptionsForPortfolio(portfolioId) {
    var out = [];
    for (var i = 0; i < store.programmes.length; i += 1) {
      if (!portfolioId || store.programmes[i].portfolioId === portfolioId) out.push({ value: store.programmes[i].id, label: store.programmes[i].id + " - " + store.programmes[i].title });
    }
    return out;
  }

  function firstArrondissement() {
    var options = arrondissementOptions();
    return options.length ? options[0].value : "";
  }

  function regionOptions(draft) {
    var country = draft && draft.country ? draft.country : "Cameroon";
    return Object.keys(countryTree[country] || {}).map(function (region) { return { value: region, label: region }; });
  }

  function departmentOptions(draft) {
    var country = draft && draft.country ? draft.country : "Cameroon";
    var selectedRegion = draft && draft.region ? draft.region : "";
    var countryData = countryTree[country] || {};
    var out = [];
    for (var region in countryData) if (Object.prototype.hasOwnProperty.call(countryData, region)) {
      if (selectedRegion && selectedRegion !== region) continue;
      var departments = Object.keys(countryData[region] || {});
      for (var i = 0; i < departments.length; i += 1) out.push({ value: departments[i], label: departments[i] + " / " + region });
    }
    return out;
  }

  function arrondissementOptions() {
    var seen = {};
    var out = [];
    for (var s = 0; s < store.sites.length; s += 1) {
      if (store.sites[s].arrondissement && !seen[store.sites[s].arrondissement]) {
        seen[store.sites[s].arrondissement] = true;
        out.push({ value: store.sites[s].arrondissement, label: store.sites[s].arrondissement + " - " + store.sites[s].region });
      }
    }
    var cameroon = countryTree.Cameroon || {};
    for (var region in cameroon) if (Object.prototype.hasOwnProperty.call(cameroon, region)) {
      var departments = cameroon[region];
      for (var department in departments) if (Object.prototype.hasOwnProperty.call(departments, department)) {
        for (var i = 0; i < departments[department].length; i += 1) {
          var name = departments[department][i];
          if (!seen[name]) {
            seen[name] = true;
            out.push({ value: name, label: name + " - " + department + " / " + region });
          }
        }
      }
    }
    out.sort(function (a, b) { return a.label > b.label ? 1 : -1; });
    return out;
  }

  function adminMetaForArrondissement(arrondissement, country) {
    var countryData = countryTree[country || "Cameroon"] || {};
    for (var region in countryData) if (Object.prototype.hasOwnProperty.call(countryData, region)) {
      var departments = countryData[region] || {};
      for (var department in departments) if (Object.prototype.hasOwnProperty.call(departments, department)) {
        if ((departments[department] || []).indexOf(arrondissement) > -1) return { country: country || "Cameroon", region: region, department: department, arrondissement: arrondissement };
      }
    }
    return null;
  }

  function slugPart(value) {
    return String(value || "").replace(/\s+/g, "-").replace(/[^A-Za-z0-9-]/g, "");
  }

  function generatedFieldOfficeId(record, existingId) {
    if (existingId) return existingId;
    var year = new Date().getFullYear();
    var countryCode = countryInitials(record.country || "Cameroon");
    var suffix = "/" + countryCode + "/" + year;
    var next = 1;
    for (var i = 0; i < store.fieldOffices.length; i += 1) {
      if (String(store.fieldOffices[i].id || "").indexOf(suffix) > -1) next += 1;
    }
    return pad3(next) + suffix;
  }

  function countryInitials(value) {
    countryOptions();
    var map = { Cameroon: "CMR", Cameroun: "CMR" };
    return countryCodeByName[value] || map[value] || initialsFrom(value, "CT").slice(0, 3);
  }

  function countryOptions() {
    if (countryListCache) return countryListCache;
    countryCodeByName = {};
    var regions = "AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW".split(" ");
    var list = [];
    if (window.Intl && Intl.DisplayNames) {
      var names = new Intl.DisplayNames(["fr"], { type: "region" });
      for (var i = 0; i < regions.length; i += 1) {
        var label = names.of(regions[i]);
        if (!label || label === regions[i]) continue;
        list.push(label);
        countryCodeByName[label] = alpha2ToAlpha3(regions[i]);
      }
    }
    if (!list.length) {
      list = ["Cameroon", "France", "Nigeria", "Chad", "Central African Republic", "Gabon", "Congo", "Democratic Republic of the Congo", "Equatorial Guinea", "United States", "United Kingdom", "Canada", "Germany", "Italy", "Spain"];
      for (var j = 0; j < list.length; j += 1) countryCodeByName[list[j]] = initialsFrom(list[j], "CT").slice(0, 3);
    }
    list.sort(function (a, b) { return a.localeCompare(b, "fr"); });
    countryListCache = list;
    return countryListCache;
  }

  function alpha2ToAlpha3(code) {
    var map = { CM: "CMR", FR: "FRA", NG: "NGA", TD: "TCD", CF: "CAF", GA: "GAB", CG: "COG", CD: "COD", GQ: "GNQ", US: "USA", GB: "GBR", CA: "CAN", DE: "DEU", IT: "ITA", ES: "ESP" };
    return map[code] || code;
  }

  function initialsFrom(value, fallback) {
    var words = String(value || "").replace(/[^A-Za-z ]/g, " ").split(/\s+/);
    var out = "";
    for (var i = 0; i < words.length; i += 1) if (words[i]) out += words[i].charAt(0).toUpperCase();
    return out || fallback || "RG";
  }

  function pad3(value) {
    value = String(value);
    while (value.length < 3) value = "0" + value;
    return value;
  }

  function regionTree(draft) {
    return (countryTree[draft.country || "Cameroon"] || {})[draft.region] || {};
  }

  function workflowPage(pageId) {
    if (pageId === "users") return false;
    return !!configs[pageId];
  }

  function validWorkflowMove(status, action) {
    status = normalizeWorkflowStatus(status);
    if (action === "submit") return status === "Draft" || status === "Returned";
    if (action === "verify") return status === "Submitted";
    if (action === "approve") return status === "Verified";
    if (action === "return") return status === "Submitted" || status === "Verified";
    return true;
  }

  function normalizeWorkflowStatus(status) {
    if (status === "Approved") return "Validated";
    if (status === "Validated" || status === "Verified" || status === "Submitted" || status === "Returned" || status === "Draft") return status;
    return "Draft";
  }

  function migrateWorkflowStatuses() {
    var keys = ["workspaceProfiles", "fieldOffices", "sites", "fdps", "partners", "cooperativePartners", "strategicDocuments", "grants", "staffs", "partnerStaffs", "portfolios", "programmes", "projects", "stakeholders", "implementationPlans", "communicationPlans", "procurementPlans", "riskRegisters", "qualityPlans", "resourcePlans", "projectActivities", "projectSubActivities", "monthlyPlans", "monthlyReports", "monthlyExpenses", "recommendations", "distributionReports", "nfis", "nfiDistributions", "nfiInventories", "partnerInvoices", "partnerInvoicePayments", "processIndicators", "processReports", "amendments", "distributionCycles", "kpis", "budgets", "grantInKinds", "baselines", "hgsfIngredients", "hgsfMenus", "hgsfSchoolMenus", "hgsfEstimations", "hgsfPurchaseOrders", "hgsfDeliveries", "hgsfDeliveryInvoices", "hgsfInvoicePayments", "hgsfSchoolCoopPayments", "assistanceRations", "gfdNeeds", "cbtNeeds", "nutritionNeeds"];
    for (var i = 0; i < keys.length; i += 1) {
      var items = store[keys[i]] || [];
      for (var j = 0; j < items.length; j += 1) items[j].status = normalizeWorkflowStatus(items[j].status);
    }
    migrateProjectGrantCodes();
    migrateActivityGrantCodes();
    migrateProjectSiteDetails();
    migrateStakeholderFdps();
  }

  function migrateProjectGrantCodes() {
    for (var i = 0; i < store.projects.length; i += 1) {
      if (!store.projects[i].grantCodes) store.projects[i].grantCodes = store.projects[i].grantCode ? [store.projects[i].grantCode] : [];
      if (!store.projects[i].currency) store.projects[i].currency = "XAF";
      if (!store.projects[i].portfolioId) store.projects[i].portfolioId = firstPortfolioId();
      if (!store.projects[i].programmeId) store.projects[i].programmeId = firstProgrammeId(store.projects[i].portfolioId);
    }
  }

  function migrateActivityGrantCodes() {
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      if (!store.projectActivities[i].grantCodes) store.projectActivities[i].grantCodes = store.projectActivities[i].grantCode ? [store.projectActivities[i].grantCode] : [];
    }
  }

  function migrateProjectSiteDetails() {
    for (var i = 0; i < store.projects.length; i += 1) {
      if (store.projects[i].projectFdps && store.projects[i].projectFdps.length) {
        store.projects[i].fdpIds = projectFdpIds(store.projects[i]);
        continue;
      }
      if (store.projects[i].fdpIds && store.projects[i].fdpIds.length) {
        store.projects[i].projectFdps = [];
        for (var f = 0; f < store.projects[i].fdpIds.length; f += 1) {
          store.projects[i].projectFdps.push({ fdpId: store.projects[i].fdpIds[f], fdpType: fdpTypeById(store.projects[i].fdpIds[f]), beneficiaries: 0 });
        }
        continue;
      }
      var siteIds = store.projects[i].siteIds || [];
      store.projects[i].projectFdps = [];
      for (var j = 0; j < siteIds.length; j += 1) {
        var site = findByRecordId(store.sites, siteIds[j]);
        var fdp = fdpForSite(site);
        if (fdp) store.projects[i].projectFdps.push({ fdpId: fdp.id, fdpType: fdp.fdpType || "", beneficiaries: 0 });
      }
      store.projects[i].fdpIds = projectFdpIds(store.projects[i]);
    }
  }

  function fdpForSite(site) {
    if (!site) return null;
    for (var i = 0; i < store.fdps.length; i += 1) if (store.fdps[i].arrondissement === site.arrondissement) return store.fdps[i];
    return null;
  }

  function migrateStakeholderFdps() {
    for (var i = 0; i < store.stakeholders.length; i += 1) {
      if (store.stakeholders[i].fdpIds && store.stakeholders[i].fdpIds.length) continue;
      var siteIds = store.stakeholders[i].siteIds || [];
      store.stakeholders[i].fdpIds = [];
      for (var j = 0; j < siteIds.length; j += 1) {
        var site = findByRecordId(store.sites, siteIds[j]);
        var fdp = fdpForSite(site);
        if (fdp && store.stakeholders[i].fdpIds.indexOf(fdp.id) < 0) store.stakeholders[i].fdpIds.push(fdp.id);
      }
    }
  }

  function recordKey(record) {
    return String(record.id || record.vendor || record.code || "");
  }

  function currentUser() {
    return findUserByEmail(state.currentUserEmail);
  }

  function currentUserEmail() {
    var user = currentUser();
    return user ? user.email : "utilisateur@local";
  }

  function currentUserLabel() {
    var user = currentUser();
    if (!user) return "Utilisateur courant";
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  }

  function findUserByEmail(email) {
    email = normalizeEmail(email);
    for (var i = 0; i < (store.users || []).length; i += 1) if (normalizeEmail(store.users[i].email) === email) return store.users[i];
    return null;
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function isAdminUser(user) {
    return user && (user.role === "Admin" || user.role === "Deputy Admin");
  }

  function userCanAccessPage(pageId) {
    if (pageId === "home") return true;
    var user = currentUser();
    if (!user) return false;
    if (isAdminUser(user)) return true;
    if (pageId === "operationsDashboard") return true;
    if (pageId === "users") return ["Validator", "Editor"].indexOf(user.role) > -1;
    if (user.role === "Visitor") return false;
    if (user.accessPages && user.accessPages.length && user.accessPages.indexOf(pageId) < 0) return false;
    return true;
  }

  function userCanCreatePage(pageId) {
    var user = currentUser();
    if (!user) return false;
    if (isAdminUser(user)) return true;
    if (pageId === "users") return ["Validator", "Editor"].indexOf(user.role) > -1;
    return ["Validator", "Editor", "Creator"].indexOf(user.role) > -1 && userCanAccessPage(pageId);
  }

  function userCanWorkflowAction(record, action) {
    var user = currentUser();
    if (!user) return false;
    if (state.page === "users" && record && record.email === adminEmail && user.email !== adminEmail && action !== "print" && action !== "preview" && action !== "view") return false;
    if (action === "print" || action === "preview" || action === "view") return userCanAccessRecord(record, state.page);
    if (isAdminUser(user)) return true;
    if (!userCanAccessRecord(record, state.page)) return false;
    if (action === "delete" || action === "return") return user.role === "Validator";
    if (action === "edit") {
      var status = normalizeWorkflowStatus(record.status);
      if (status === "Validated") return user.role === "Validator";
      return ["Validator", "Editor", "Creator"].indexOf(user.role) > -1 && ["Draft", "Returned"].indexOf(status) > -1;
    }
    if (action === "submit") return ["Validator", "Editor", "Creator"].indexOf(user.role) > -1;
    if (action === "verify") return ["Validator", "Editor"].indexOf(user.role) > -1;
    if (action === "approve") return user.role === "Validator";
    return false;
  }

  function userCanAccessRecord(record, pageId) {
    var user = currentUser();
    if (!user) return false;
    if (isAdminUser(user)) return true;
    if (pageId === "users") {
      if (record.email === user.email || record.createdByEmail === user.email || record.managerEmail === user.email) return true;
      return false;
    }
    if (recordTouchedByUser(record, user.email)) return true;
    var scope = userAccessScope(user);
    if (scope.projects.length) {
      var projectId = scopedRecordProjectId(record, pageId);
      if (projectId && scope.projects.indexOf(projectId) > -1) return true;
    }
    if (scope.fdps.length && recordHasAnyFdp(record, scope.fdps, pageId)) return true;
    var meta = recordAdminMeta(record, pageId);
    if (meta) {
      if (scope.arrondissements.length && scope.arrondissements.indexOf(meta.arrondissement) > -1) return true;
      if (scope.departments.length && scope.departments.indexOf(meta.department) > -1) return true;
      if (scope.regions.length && scope.regions.indexOf(meta.region) > -1) return true;
    }
    return false;
  }

  function recordTouchedByUser(record, email) {
    email = normalizeEmail(email);
    return [record.createdByEmail, record.submittedByEmail, record.verifiedByEmail, record.validatedByEmail, record.updatedByEmail].map(normalizeEmail).indexOf(email) > -1;
  }

  function userAccessScope(user) {
    return {
      projects: user.accessProjects || [],
      regions: user.accessRegions || [],
      departments: user.accessDepartments || [],
      arrondissements: user.accessArrondissements || [],
      fdps: user.accessFdps || []
    };
  }

  function recordHasAnyFdp(record, fdpIds, pageId) {
    var ids = [];
    if (record.fdpId) ids.push(record.fdpId);
    if (record.fdpIds) ids = ids.concat(record.fdpIds);
    if (record.schoolFdpIds) ids = ids.concat(record.schoolFdpIds);
    if (record.projectFdps) for (var i = 0; i < record.projectFdps.length; i += 1) ids.push(record.projectFdps[i].fdpId);
    if (record.distributionLines) for (var d = 0; d < record.distributionLines.length; d += 1) ids.push(record.distributionLines[d].fdpId);
    var projectId = scopedRecordProjectId(record, pageId);
    if (projectId) ids = ids.concat(projectFdpsForRecord(findByRecordId(store.projects, projectId) || {}).map(function (item) { return item.fdpId; }));
    return arraysOverlap(ids, fdpIds);
  }

  function recordAdminMeta(record, pageId) {
    if (record.arrondissement) return adminMetaForArrondissement(record.arrondissement, record.country || "Cameroon");
    if (record.fdpId) {
      var fdp = findByRecordId(store.fdps, record.fdpId) || {};
      return adminMetaForArrondissement(fdp.arrondissement, "Cameroon");
    }
    var fdpIds = record.fdpIds || record.schoolFdpIds || [];
    if (fdpIds.length) {
      var firstFdp = findByRecordId(store.fdps, fdpIds[0]) || {};
      return adminMetaForArrondissement(firstFdp.arrondissement, "Cameroon");
    }
    var projectId = scopedRecordProjectId(record, pageId);
    var project = projectId ? findByRecordId(store.projects, projectId) : null;
    var items = project ? projectFdpsForRecord(project) : [];
    if (items.length) {
      var projectFdp = findByRecordId(store.fdps, items[0].fdpId) || {};
      return adminMetaForArrondissement(projectFdp.arrondissement, "Cameroon");
    }
    return null;
  }

  function findByRecordId(items, id) {
    for (var i = 0; i < items.length; i += 1) if (recordKey(items[i]) === id) return items[i];
    return null;
  }

  function hasField(config, name) {
    for (var i = 0; i < config.fields.length; i += 1) if (config.fields[i].name === name) return true;
    return config.columns.indexOf(name) > -1;
  }

  function filteredRecords(pageId) {
    var records = store[pageId] || [];
    var monthFilter = document.getElementById("filter-month");
    var statusFilter = document.getElementById("filter-status");
    var executionProjectFilter = document.getElementById("filter-execution-project");
    var recommendationProjectFilter = document.getElementById("filter-recommendation-project");
    var recommendationStatusFilter = document.getElementById("filter-recommendation-status");
    var grantStatusFilter = document.getElementById("filter-grant-status");
    var grantModalityFilter = document.getElementById("filter-grant-modality");
    var grantTddFilter = document.getElementById("filter-grant-tdd");
    var staffSexFilter = document.getElementById("filter-staff-sex");
    var staffFoFilter = document.getElementById("filter-staff-fo");
    var staffStatusFilter = document.getElementById("filter-staff-status");
    var staffReportsFilter = document.getElementById("filter-staff-reports");
    var fdpTypeFilter = document.getElementById("filter-fdp-type");
    var fdpArrondissementFilter = document.getElementById("filter-fdp-arrondissement");
    var fdpSexFilter = document.getElementById("filter-fdp-sex");
    var activityProjectFilter = document.getElementById("filter-activity-project");
    var activityModalityFilter = document.getElementById("filter-activity-modality");
    var activityGrantFilter = document.getElementById("filter-activity-grant");
    var activityStartFilter = document.getElementById("filter-activity-start");
    var activityEndFilter = document.getElementById("filter-activity-end");
    var monthlyProjectFilter = document.getElementById("filter-monthly-project");
    var monthlyActivityFilter = document.getElementById("filter-monthly-activity");
    var processProjectFilter = document.getElementById("filter-process-project");
    var kpiProjectFilter = document.getElementById("filter-kpi-project");
    var kpiActivityFilter = document.getElementById("filter-kpi-activity");
    var kpiOwnerFilter = document.getElementById("filter-kpi-owner");
    var kpiFrequencyFilter = document.getElementById("filter-kpi-frequency");
    var subActivityProjectFilter = document.getElementById("filter-subactivity-project");
    var subActivityActivityFilter = document.getElementById("filter-subactivity-activity");
    var stakeholderProjectFilter = document.getElementById("filter-stakeholder-project");
    var stakeholderTypeFilter = document.getElementById("filter-stakeholder-type");
    var stakeholderFdpFilter = document.getElementById("filter-stakeholder-fdp");
    var budgetProjectFilter = document.getElementById("filter-budget-project");
    var budgetGrantFilter = document.getElementById("filter-budget-grant");
    var budgetPartnerFilter = document.getElementById("filter-budget-partner");
    var budgetCategoryFilter = document.getElementById("filter-budget-category");
    var budgetSubCategoryFilter = document.getElementById("filter-budget-subcategory");
    var genericFilters = document.querySelectorAll(".generic-register-filter");
    var filtered = [];
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i];
      var matchSearch = !state.query || JSON.stringify(record).toLowerCase().indexOf(state.query) > -1;
      var matchAccess = userCanAccessRecord(record, pageId);
      var matchContextProject = !state.contextProjectId || !projectScopedPage(pageId) || scopedRecordProjectId(record, pageId) === state.contextProjectId;
      var matchMonth = !monthFilter || !monthFilter.value || record.month === monthFilter.value;
      var matchExecutionProject = !executionProjectFilter || !executionProjectFilter.value || executionRecordProjectIdForPage(record, pageId) === executionProjectFilter.value;
      var matchRecommendationProject = !recommendationProjectFilter || !recommendationProjectFilter.value || record.projectId === recommendationProjectFilter.value;
      var matchRecommendationStatus = !recommendationStatusFilter || !recommendationStatusFilter.value || record.recommendationStatus === recommendationStatusFilter.value;
      var recordStatus = workflowPage(pageId) ? normalizeWorkflowStatus(record.status) : record.status;
      var matchStatus = !statusFilter || !statusFilter.value || recordStatus === statusFilter.value;
      var matchGrantStatus = !grantStatusFilter || !grantStatusFilter.value || record.grantStatus === grantStatusFilter.value;
      var matchGrantModality = !grantModalityFilter || !grantModalityFilter.value || record.grantModality === grantModalityFilter.value;
      var matchGrantTdd = !grantTddFilter || !grantTddFilter.value || grantMatchesTdd(record, grantTddFilter.value);
      var matchStaffSex = !staffSexFilter || !staffSexFilter.value || record.sex === staffSexFilter.value;
      var matchStaffFo = !staffFoFilter || !staffFoFilter.value || record.fieldOfficeId === staffFoFilter.value;
      var matchStaffStatus = !staffStatusFilter || !staffStatusFilter.value || record.staffStatus === staffStatusFilter.value;
      var matchStaffReports = !staffReportsFilter || !staffReportsFilter.value || record.reportsTo === staffReportsFilter.value;
      var matchFdpType = !fdpTypeFilter || !fdpTypeFilter.value || record.fdpType === fdpTypeFilter.value;
      var matchFdpArrondissement = !fdpArrondissementFilter || !fdpArrondissementFilter.value || record.arrondissement === fdpArrondissementFilter.value;
      var matchFdpSex = !fdpSexFilter || !fdpSexFilter.value || record.siteFocalPointSex === fdpSexFilter.value;
      var matchActivityProject = !activityProjectFilter || !activityProjectFilter.value || record.projectId === activityProjectFilter.value;
      var matchActivityModality = !activityModalityFilter || !activityModalityFilter.value || record.modality === activityModalityFilter.value;
      var matchActivityGrant = !activityGrantFilter || !activityGrantFilter.value || activityHasGrant(record, activityGrantFilter.value);
      var matchActivityStart = !activityStartFilter || !activityStartFilter.value || record.startDate === activityStartFilter.value;
      var matchActivityEnd = !activityEndFilter || !activityEndFilter.value || record.endDate === activityEndFilter.value;
      var matchMonthlyProject = !monthlyProjectFilter || !monthlyProjectFilter.value || record.projectId === monthlyProjectFilter.value;
      var matchMonthlyActivity = !monthlyActivityFilter || !monthlyActivityFilter.value || record.activityId === monthlyActivityFilter.value;
      var matchProcessProject = !processProjectFilter || !processProjectFilter.value || record.projectId === processProjectFilter.value;
      var kpiProjectId = kpiProjectForRecord(record);
      var matchKpiProject = !kpiProjectFilter || !kpiProjectFilter.value || kpiProjectId === kpiProjectFilter.value;
      var matchKpiActivity = !kpiActivityFilter || !kpiActivityFilter.value || record.activityId === kpiActivityFilter.value;
      var matchKpiOwner = !kpiOwnerFilter || !kpiOwnerFilter.value || record.pamOwner === kpiOwnerFilter.value;
      var matchKpiFrequency = !kpiFrequencyFilter || !kpiFrequencyFilter.value || record.frequency === kpiFrequencyFilter.value;
      var matchSubActivityProject = !subActivityProjectFilter || !subActivityProjectFilter.value || record.projectId === subActivityProjectFilter.value;
      var matchSubActivityActivity = !subActivityActivityFilter || !subActivityActivityFilter.value || record.activityId === subActivityActivityFilter.value;
      var matchStakeholderProject = !stakeholderProjectFilter || !stakeholderProjectFilter.value || record.projectId === stakeholderProjectFilter.value;
      var matchStakeholderType = !stakeholderTypeFilter || !stakeholderTypeFilter.value || record.type === stakeholderTypeFilter.value;
      var matchStakeholderFdp = !stakeholderFdpFilter || !stakeholderFdpFilter.value || (record.fdpIds || []).indexOf(stakeholderFdpFilter.value) > -1;
      var matchBudgetProject = !budgetProjectFilter || !budgetProjectFilter.value || record.projectId === budgetProjectFilter.value;
      var matchBudgetGrant = !budgetGrantFilter || !budgetGrantFilter.value || budgetRecordHasGrant(record, budgetGrantFilter.value);
      var matchBudgetPartner = !budgetPartnerFilter || !budgetPartnerFilter.value || record.partnerVendor === budgetPartnerFilter.value;
      var matchBudgetCategory = !budgetCategoryFilter || !budgetCategoryFilter.value || record.costCategory === budgetCategoryFilter.value;
      var matchBudgetSubCategory = !budgetSubCategoryFilter || !budgetSubCategoryFilter.value || record.subCategory === budgetSubCategoryFilter.value;
      var matchGeneric = genericRecordMatchesFilters(record, genericFilters);
      if (matchAccess && matchContextProject && matchSearch && matchMonth && matchExecutionProject && matchRecommendationProject && matchRecommendationStatus && matchStatus && matchGrantStatus && matchGrantModality && matchGrantTdd && matchStaffSex && matchStaffFo && matchStaffStatus && matchStaffReports && matchFdpType && matchFdpArrondissement && matchFdpSex && matchActivityProject && matchActivityModality && matchActivityGrant && matchActivityStart && matchActivityEnd && matchMonthlyProject && matchMonthlyActivity && matchProcessProject && matchKpiProject && matchKpiActivity && matchKpiOwner && matchKpiFrequency && matchSubActivityProject && matchSubActivityActivity && matchStakeholderProject && matchStakeholderType && matchStakeholderFdp && matchBudgetProject && matchBudgetGrant && matchBudgetPartner && matchBudgetCategory && matchBudgetSubCategory && matchGeneric) filtered.push(record);
    }
    return filtered;
  }

  function genericRecordMatchesFilters(record, filters) {
    for (var i = 0; i < filters.length; i += 1) {
      var filter = filters[i];
      if (!filter.value) continue;
      var field = filter.getAttribute("data-generic-field");
      var value = record[field];
      if (Object.prototype.toString.call(value) === "[object Array]") {
        if (value.indexOf(filter.value) < 0) return false;
      } else if (String(value || "") !== filter.value) return false;
    }
    return true;
  }

  function scopedRecordProjectId(record, pageId) {
    if (record.projectId) return record.projectId;
    if (pageId === "kpis") return kpiProjectForRecord(record);
    if (pageId === "monthlyReports" || pageId === "monthlyExpenses" || pageId === "processReports") return executionRecordProjectIdForPage(record, pageId);
    if (pageId === "partnerInvoicePayments") {
      var invoice = findByRecordId(store.partnerInvoices, record.invoiceId);
      return invoice ? invoice.projectId : "";
    }
    return "";
  }

  function kpiProjectForRecord(record) {
    if (record.projectId) return record.projectId;
    var activity = findByRecordId(store.projectActivities, record.activityId);
    return activity ? activity.projectId : "";
  }

  function grantMatchesTdd(record, value) {
    if (record.tdd === value) return true;
    var items = record.foodItems || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].tdd === value) return true;
    return false;
  }

  function renderMetrics() {
    var totalsByCurrency = {};
    for (var i = 0; i < store.projects.length; i += 1) {
      var currency = store.projects[i].currency || "XAF";
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + Number(store.projects[i].budgetXaf || 0);
    }
    var budgetParts = [];
    var currencies = Object.keys(totalsByCurrency);
    for (var c = 0; c < currencies.length; c += 1) budgetParts.push(moneyText(totalsByCurrency[currencies[c]], currencies[c]));
    elements.metricFo.textContent = store.fieldOffices.length;
    elements.metricPartners.textContent = store.partners.length;
    elements.metricProjects.textContent = store.projects.length;
    elements.metricBudget.textContent = (budgetParts.join(" + ") || "0") + " budgetise";
    elements.metricKpis.textContent = store.kpis.length;
    elements.portfolioCount.textContent = store.portfolios.length + " portefeuille(s) - " + store.programmes.length + " programme(s) - " + store.projects.length + " projet(s)";
  }

  function syncContextDefaults() {
    var countries = contextCountryOptions();
    if (!state.contextCountry || countries.indexOf(state.contextCountry) < 0) state.contextCountry = countries[0] || "";
    var offices = fieldOfficesForCountry(state.contextCountry);
    if (!state.contextFieldOffice || !findByRecordId(offices, state.contextFieldOffice)) state.contextFieldOffice = offices.length ? offices[0].id : "";
  }

  function renderContextControls() {
    if (!elements.contextCountry || !elements.contextFieldOffice) return;
    var countryOptionsHtml = "";
    var countries = contextCountryOptions();
    for (var i = 0; i < countries.length; i += 1) countryOptionsHtml += optionTag({ value: countries[i], label: countries[i] }, state.contextCountry);
    elements.contextCountry.innerHTML = countryOptionsHtml;
    var officeOptions = fieldOfficesForCountry(state.contextCountry);
    var officeHtml = "";
    for (var j = 0; j < officeOptions.length; j += 1) officeHtml += optionTag({ value: officeOptions[j].id, label: officeOptions[j].name || officeOptions[j].id }, state.contextFieldOffice);
    if (!officeHtml) officeHtml = '<option value="">Aucun sous bureau</option>';
    elements.contextFieldOffice.innerHTML = officeHtml;
  }

  function contextCountryOptions() {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.fieldOffices.length; i += 1) {
      var country = store.fieldOffices[i].country || "";
      if (country && !seen[country]) {
        seen[country] = true;
        out.push(country);
      }
    }
    if (!out.length) out.push("Cameroon");
    out.sort();
    return out;
  }

  function fieldOfficesForCountry(country) {
    var out = [];
    for (var i = 0; i < store.fieldOffices.length; i += 1) {
      if (!country || store.fieldOffices[i].country === country) out.push(store.fieldOffices[i]);
    }
    return out;
  }

  function optionPairs(items, valueKey, labelKey) {
    var out = [];
    items = items || [];
    for (var i = 0; i < items.length; i += 1) {
      out.push({ value: items[i][valueKey], label: typeof labelKey === "function" ? labelKey(items[i]) : items[i][valueKey] + " - " + items[i][labelKey] });
    }
    return out;
  }

  function activeGrantOptions(modality) {
    var out = [cpContributionOption()];
    for (var i = 0; i < store.grants.length; i += 1) {
      if (store.grants[i].grantStatus === "Actif" && (!modality || store.grants[i].grantModality === modality)) out.push({ value: store.grants[i].code, label: store.grants[i].code + " - " + store.grants[i].donor });
    }
    return out;
  }

  function allGrantOptions() {
    return [cpContributionOption()].concat(optionPairs(store.grants, "code", "donor"));
  }

  function cpContributionOption() {
    return { value: cpContributionGrantCode, label: cpContributionGrantLabel };
  }

  function isCpContribution(value) {
    return value === cpContributionGrantCode || value === cpContributionGrantLabel;
  }

  function grantOptionsForProject(projectId) {
    var project = findByRecordId(store.projects, projectId);
    var grants = grantsForProject(project);
    var out = [];
    for (var i = 0; i < grants.length; i += 1) out.push({ value: grants[i].code, label: grants[i].code + " - " + grants[i].donor });
    return out;
  }

  function projectGrantOptionsFromDraft(draft) {
    var codes = draft.grantCodes || [];
    var out = [];
    for (var i = 0; i < codes.length; i += 1) {
      if (isCpContribution(codes[i])) out.push(cpContributionOption());
      else {
        var grant = findByRecordId(store.grants, codes[i]);
        if (grant) out.push({ value: grant.code, label: grant.code + " - " + grant.donor });
      }
    }
    return out;
  }

  function firstGrantCodeForProject(projectId) {
    var options = grantOptionsForProject(projectId);
    return options.length ? options[0].value : "";
  }

  function firstMonthlyGrantCode(draft) {
    var options = monthlyGrantOptions(draft);
    return options.length ? options[0].value : "";
  }

  function projectActivitiesForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      if (!projectId || store.projectActivities[i].projectId === projectId) out.push({ value: store.projectActivities[i].id, label: store.projectActivities[i].id + " - " + store.projectActivities[i].label });
    }
    return out;
  }

  function kpisForActivity(activityId) {
    var out = [];
    for (var i = 0; i < store.kpis.length; i += 1) {
      if (!activityId || store.kpis[i].activityId === activityId) out.push({ value: store.kpis[i].id, label: compactKpiLabel(store.kpis[i]) });
    }
    return out;
  }

  function kpisForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.kpis.length; i += 1) {
      var project = kpiProjectForRecord(store.kpis[i]);
      if (!projectId || project === projectId) out.push({ value: store.kpis[i].id, label: compactKpiLabel(store.kpis[i]) });
    }
    return out;
  }

  function monthlyPlanKpiOptions(draft) {
    if (draft.subActivityId) {
      var sub = findByRecordId(store.projectSubActivities, draft.subActivityId);
      var ids = sub ? sub.kpiIds || [] : [];
      var out = [];
      for (var i = 0; i < ids.length; i += 1) {
        var kpi = findByRecordId(store.kpis, ids[i]);
        if (kpi) out.push({ value: kpi.id, label: compactKpiLabel(kpi) });
      }
      return out;
    }
    return kpisForActivity(draft.activityId);
  }

  function monthlyGrantOptions(draft) {
    draft = draft || {};
    var activity = findByRecordId(store.projectActivities, draft.activityId);
    var activityCodes = activityGrantCodes(activity);
    if (activityCodes.length) {
      var out = [];
      for (var i = 0; i < activityCodes.length; i += 1) {
        var code = activityCodes[i];
        if (isCpContribution(code)) out.push(cpContributionOption());
        else {
          var grant = findByRecordId(store.grants, code);
          if (grant) out.push({ value: grant.code, label: grant.code + " - " + grant.donor });
        }
      }
      return out;
    }
    return grantOptionsForProject(draft.projectId);
  }

  function monthlyRegionOptions(draft) {
    var country = draft.localizationCountry || "Cameroon";
    var regions = Object.keys(countryTree[country] || {});
    var projectRegions = monthlyProjectAdminValues(draft.projectId, "region", country);
    if (projectRegions.length) regions = regions.filter(function (region) { return projectRegions.indexOf(region) > -1; });
    return regions.map(function (region) { return { value: region, label: region }; });
  }

  function monthlyDepartmentOptions(draft) {
    var country = draft.localizationCountry || "Cameroon";
    var selectedRegions = draft.localizationRegions || [];
    var countryData = countryTree[country] || {};
    var projectDepartments = monthlyProjectAdminValues(draft.projectId, "department", country);
    var out = [];
    for (var region in countryData) if (Object.prototype.hasOwnProperty.call(countryData, region)) {
      if (selectedRegions.length && selectedRegions.indexOf(region) < 0) continue;
      var departments = Object.keys(countryData[region] || {});
      for (var i = 0; i < departments.length; i += 1) {
        if (projectDepartments.length && projectDepartments.indexOf(departments[i]) < 0) continue;
        out.push({ value: departments[i], label: departments[i] + " / " + region });
      }
    }
    return out;
  }

  function monthlyArrondissementHierarchyOptions(draft) {
    var country = draft.localizationCountry || "Cameroon";
    var selectedRegions = draft.localizationRegions || [];
    var selectedDepartments = draft.localizationDepartments || [];
    var countryData = countryTree[country] || {};
    var projectArrondissements = monthlyProjectAdminValues(draft.projectId, "arrondissement", country);
    var out = [];
    for (var region in countryData) if (Object.prototype.hasOwnProperty.call(countryData, region)) {
      if (selectedRegions.length && selectedRegions.indexOf(region) < 0) continue;
      var departments = countryData[region] || {};
      for (var department in departments) if (Object.prototype.hasOwnProperty.call(departments, department)) {
        if (selectedDepartments.length && selectedDepartments.indexOf(department) < 0) continue;
        for (var i = 0; i < departments[department].length; i += 1) {
          var arrondissement = departments[department][i];
          if (projectArrondissements.length && projectArrondissements.indexOf(arrondissement) < 0) continue;
          out.push({ value: arrondissement, label: arrondissement + " - " + department + " / " + region });
        }
      }
    }
    return out;
  }

  function monthlyFdpHierarchyOptions(draft) {
    var project = findByRecordId(store.projects, draft.projectId);
    var linked = projectFdpsForRecord(project || {});
    var allowed = {};
    var selectedGrants = monthlyGrantCodes(draft);
    var hasGrantMapping = projectFdpGrantMappingExists(project);
    for (var i = 0; i < linked.length; i += 1) {
      if (hasGrantMapping && selectedGrants.length && !arraysIntersect(linked[i].grantCodes || [], selectedGrants)) continue;
      allowed[linked[i].fdpId] = true;
    }
    var arrondissements = draft.localizationArrondissements || [];
    if (!arrondissements.length) return [];
    var out = [];
    for (var j = 0; j < store.fdps.length; j += 1) {
      var fdp = store.fdps[j];
      if (project && !allowed[fdp.id]) continue;
      if (arrondissements.length && arrondissements.indexOf(fdp.arrondissement) < 0) continue;
      out.push({ value: fdp.id, label: fdpLabel(fdp) });
    }
    return out;
  }

  function projectFdpGrantMappingExists(project) {
    var items = projectFdpsForRecord(project || {});
    for (var i = 0; i < items.length; i += 1) if ((items[i].grantCodes || []).length) return true;
    return false;
  }

  function monthlyProjectAdminValues(projectId, key, country) {
    var project = findByRecordId(store.projects, projectId);
    if (!project) return [];
    var seen = {};
    var out = [];
    var items = projectFdpsForRecord(project);
    for (var i = 0; i < items.length; i += 1) {
      var fdp = findByRecordId(store.fdps, items[i].fdpId);
      var meta = fdp ? adminMetaForArrondissement(fdp.arrondissement, country) : null;
      var value = meta ? meta[key] : "";
      if (value && !seen[value]) {
        seen[value] = true;
        out.push(value);
      }
    }
    return out;
  }

  function monthlyAdministrativeSiteOptions(draft) {
    var project = findByRecordId(store.projects, draft.projectId);
    var seen = {};
    var out = [];
    var fdps = projectFdpsForRecord(project || {});
    for (var i = 0; i < fdps.length; i += 1) {
      var fdp = findByRecordId(store.fdps, fdps[i].fdpId);
      if (fdp && fdp.arrondissement && !seen[fdp.arrondissement]) {
        seen[fdp.arrondissement] = true;
        out.push({ value: fdp.arrondissement, label: fdp.arrondissement });
      }
    }
    return out.length ? out : arrondissementOptions();
  }

  function monthlyArrondissementOptions(draft) {
    return monthlyAdministrativeSiteOptions(draft);
  }

  function monthlyFdpOptions(draft) {
    var project = findByRecordId(store.projects, draft.projectId);
    var linked = projectFdpsForRecord(project || {});
    var allowed = {};
    for (var i = 0; i < linked.length; i += 1) allowed[linked[i].fdpId] = true;
    var out = [];
    for (var j = 0; j < store.fdps.length; j += 1) {
      var fdp = store.fdps[j];
      if (project && !allowed[fdp.id]) continue;
      if (draft.arrondissement && fdp.arrondissement !== draft.arrondissement) continue;
      out.push({ value: fdp.id, label: fdpLabel(fdp) });
    }
    return out;
  }

  function fdpsForArrondissements(arrondissements) {
    arrondissements = arrondissements || [];
    var out = [];
    for (var i = 0; i < store.fdps.length; i += 1) {
      if (!arrondissements.length || arrondissements.indexOf(store.fdps[i].arrondissement) > -1) out.push({ value: store.fdps[i].id, label: fdpLabel(store.fdps[i]) });
    }
    return out;
  }

  function monthlyPartnerStaffOptions(draft) {
    var project = findByRecordId(store.projects, draft.projectId);
    var vendor = project ? project.partnerVendor : "";
    var selectedArrondissements = monthlySelectedArrondissements(draft);
    var out = [];
    for (var i = 0; i < store.staffs.length; i += 1) {
      var staff = store.staffs[i];
      if (staff.staffAffiliation !== "Partenaire") continue;
      if (vendor && staff.partnerVendor && staff.partnerVendor !== vendor) continue;
      if (selectedArrondissements.length && staff.zoningLevel === "Arrondissement" && !arraysIntersect(staff.zoningArrondissements || [], selectedArrondissements)) continue;
      out.push({ value: staff.id, label: staff.id + " - " + staffFullName(staff) });
    }
    return out;
  }

  function monthlySelectedArrondissements(draft) {
    if (draft.localizationArrondissements && draft.localizationArrondissements.length) return draft.localizationArrondissements;
    if (draft.siteIds && draft.siteIds.length) return draft.siteIds;
    return draft.arrondissement ? [draft.arrondissement] : [];
  }

  function arraysIntersect(first, second) {
    for (var i = 0; i < first.length; i += 1) if (second.indexOf(first[i]) > -1) return true;
    return false;
  }

  function compactKpiLabel(kpi) {
    var shortId = String(kpi.id || "").split("/")[0] || kpi.id || "";
    return shortId + " - " + (kpi.label || "") + (kpi.target ? " / cible: " + kpi.target : "");
  }

  function monthlyPlanLabel(plan) {
    var activity = findById(store.projectActivities, "id", plan.activityId);
    return plan.month + " - " + (activity ? activity.label : plan.activityId);
  }

  function monthlyPlansForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      if (!projectId || store.monthlyPlans[i].projectId === projectId) out.push({ value: store.monthlyPlans[i].id, label: monthlyPlanLabel(store.monthlyPlans[i]) });
    }
    return out;
  }

  function budgetLinesForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      if (!projectId || store.budgets[i].projectId === projectId) out.push({ value: store.budgets[i].id, label: store.budgets[i].id + " - " + store.budgets[i].label });
    }
    return out;
  }

  function budgetCategoriesForProject(projectId) {
    var used = {};
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (projectId && line.projectId !== projectId) continue;
      if (line.costCategory && !used[line.costCategory]) {
        used[line.costCategory] = true;
        out.push(line.costCategory);
      }
    }
    return out.length ? out.sort() : Object.keys(costSubCategories);
  }

  function budgetSubCategoriesForExpense(draft) {
    draft = draft || {};
    var used = {};
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (draft.projectId && line.projectId !== draft.projectId) continue;
      if (draft.costCategory && line.costCategory !== draft.costCategory) continue;
      if (line.subCategory && !used[line.subCategory]) {
        used[line.subCategory] = true;
        out.push(line.subCategory);
      }
    }
    return out.length ? out.sort() : (costSubCategories[draft.costCategory] || []);
  }

  function budgetLinesForExpense(draft) {
    draft = draft || {};
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) {
      var line = store.budgets[i];
      if (draft.projectId && line.projectId !== draft.projectId) continue;
      if (draft.costCategory && line.costCategory !== draft.costCategory) continue;
      if (draft.subCategory && line.subCategory !== draft.subCategory) continue;
      out.push({ value: line.id, label: line.id + " - " + (line.label || "") });
    }
    return out;
  }

  function grantOptionsForBudgetLine(lineId, projectId) {
    var line = findByRecordId(store.budgets, lineId);
    var codes = budgetLineGrantCodes(line, projectId);
    var out = [];
    for (var i = 0; i < codes.length; i += 1) out.push({ value: codes[i], label: grantLabel(codes[i]) });
    return out;
  }

  function budgetLineGrantCodes(line, projectId) {
    var codes = [];
    if (line) {
      if (line.grantCodes && line.grantCodes.length) codes = line.grantCodes.slice();
      else if (line.grantCode) codes = [line.grantCode];
    }
    if (!codes.length) {
      var project = findByRecordId(store.projects, projectId || (line ? line.projectId : ""));
      codes = projectGrantCodes(project);
    }
    var seen = {};
    var out = [];
    for (var i = 0; i < codes.length; i += 1) if (codes[i] && !seen[codes[i]]) {
      seen[codes[i]] = true;
      out.push(codes[i]);
    }
    return out;
  }

  function grantLabel(code) {
    if (code === cpContributionGrantCode) return cpContributionGrantLabel;
    var grant = findByRecordId(store.grants, code);
    return grant ? grant.code + " - " + grant.donor : code;
  }

  function matchPeriodProject(record, params) {
    if (params.projectId && record.projectId !== params.projectId) return false;
    if (params.startMonth && record.month && record.month < params.startMonth) return false;
    if (params.endMonth && record.month && record.month > params.endMonth) return false;
    return true;
  }

  function periodLabel(params) {
    return (params.startMonth || "debut") + " a " + (params.endMonth || "fin");
  }

  function expenseTotalForBudgetLine(lineId, params) {
    var total = 0;
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var expense = store.monthlyExpenses[i];
      if (expense.budgetLineId !== lineId) continue;
      if (params.projectId && expense.projectId !== params.projectId) continue;
      if (params.startMonth && expense.month < params.startMonth) continue;
      if (params.endMonth && expense.month > params.endMonth) continue;
      total += Number(expense.amountXaf || 0);
    }
    return total;
  }

  function filteredByParams(items, params) {
    var out = [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (!recordMatchesDashboard(item, params)) continue;
      out.push(item);
    }
    return out;
  }

  function sumField(items, field) {
    var total = 0;
    for (var i = 0; i < items.length; i += 1) total += Number(items[i][field] || 0);
    return total;
  }

  function countWhere(items, key, value) {
    var count = 0;
    for (var i = 0; i < items.length; i += 1) if (items[i][key] === value) count += 1;
    return count;
  }

  function invoiceLines(projectId) {
    var out = [];
    for (var i = 0; i < store.budgets.length; i += 1) if (!projectId || store.budgets[i].projectId === projectId) out.push(store.budgets[i]);
    return out;
  }

  function cspActivityOptions() {
    var out = [];
    for (var i = 0; i < cspActivities.length; i += 1) out.push({ value: cspActivities[i].id, label: cspActivities[i].id + " - " + cspActivities[i].name });
    return out;
  }

  function donorOptions() {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.grants.length; i += 1) {
      if (!seen[store.grants[i].donor]) {
        seen[store.grants[i].donor] = true;
        out.push({ value: store.grants[i].donor, label: store.grants[i].donor });
      }
    }
    return out;
  }

  function projectGrantCodes(project) {
    if (!project) return [];
    var codes = project.grantCodes || (project.grantCode ? [project.grantCode] : []);
    codes = codes.slice ? codes.slice() : [];
    if (project.partnerVendor && codes.indexOf(cpContributionGrantCode) < 0) codes.push(cpContributionGrantCode);
    return codes;
  }

  function projectHasGrant(project, grantCode) {
    return projectGrantCodes(project).indexOf(grantCode) > -1;
  }

  function activityGrantCodes(activity) {
    if (!activity) return [];
    return activity.grantCodes || (activity.grantCode ? [activity.grantCode] : []);
  }

  function activityHasGrant(activity, grantCode) {
    return activityGrantCodes(activity).indexOf(grantCode) > -1;
  }

  function grantsForProject(project) {
    var codes = projectGrantCodes(project);
    var out = [];
    if (codes.indexOf(cpContributionGrantCode) > -1) out.push({ code: cpContributionGrantCode, donor: cpContributionGrantLabel });
    for (var i = 0; i < store.grants.length; i += 1) if (codes.indexOf(store.grants[i].code) > -1) out.push(store.grants[i]);
    return out;
  }

  function grantInKindSetting(projectId, grantCode) {
    for (var i = 0; i < store.grantInKinds.length; i += 1) {
      var item = store.grantInKinds[i];
      if (item.projectId === projectId && item.grantCode === grantCode) return item;
    }
    return null;
  }

  function invoiceGrantsForProject(project) {
    var all = grantsForProject(project);
    var out = [];
    for (var i = 0; i < all.length; i += 1) if (!isCpContribution(all[i].code)) out.push(all[i]);
    return out;
  }

  function invoiceGrantOptionsForProject(projectId) {
    var project = findByRecordId(store.projects, projectId) || {};
    var grants = invoiceGrantsForProject(project);
    var out = [];
    for (var i = 0; i < grants.length; i += 1) out.push({ value: grants[i].code, label: grantLabel(grants[i].code) });
    return out;
  }

  function invoiceRateForSetting(setting, params) {
    if (!setting) return 0;
    if ((setting.rateScope || "Oui") === "Oui") return Number(setting.ratePerMt || 0);
    var rates = parseMonthlyRates(setting.monthlyRates || "");
    var months = params && params.periodMonths && params.periodMonths.length ? params.periodMonths : [];
    var total = 0;
    var count = 0;
    for (var i = 0; i < months.length; i += 1) {
      if (rates[months[i]] !== undefined) {
        total += Number(rates[months[i]] || 0);
        count += 1;
      }
    }
    return count ? total / count : 0;
  }

  function isInvoiceInKindTonnageGrant(setting) {
    return !!(setting && setting.hasInKind === "Oui" && setting.kpiIds && setting.kpiIds.length);
  }

  function invoiceRateLabel(setting, params) {
    if (!setting || setting.hasInKind !== "Oui") return "Non applicable";
    if ((setting.rateScope || "Oui") === "Oui") return formatNumber(Number(setting.ratePerMt || 0));
    var rate = invoiceRateForSetting(setting, params);
    return formatNumber(rate) + " moyenne periode";
  }

  function invoiceDistributedTonnage(projectId, grantCode, params) {
    var months = params && params.periodMonths && params.periodMonths.length ? params.periodMonths : defaultInvoiceMonths(params ? params.periodType : "monthly", params ? params.periodYear : "");
    var setting = grantInKindSetting(projectId, grantCode);
    if (!isInvoiceInKindTonnageGrant(setting)) return 0;
    var kpiIds = setting ? setting.kpiIds || [] : [];
    var total = 0;
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      if (months.length && months.indexOf(report.month) < 0) continue;
      var plan = findByRecordId(store.monthlyPlans, report.planId);
      if (!plan || plan.projectId !== projectId) continue;
      if (kpiIds.length && kpiIds.indexOf(plan.kpiId) < 0) continue;
      var achievedGrant = reportAchievementForGrant(report, grantCode);
      if (achievedGrant !== null) {
        total += achievedGrant;
        continue;
      }
      var share = planGrantShare(plan, grantCode);
      if (share <= 0) continue;
      total += progressNumericValue(report.achieved) * share;
    }
    return Math.round(total * 1000) / 1000;
  }

  function reportAchievementForGrant(report, grantCode) {
    var items = report.achievementsByGrant || [];
    for (var i = 0; i < items.length; i += 1) if (items[i].grantCode === grantCode) return progressNumericValue(items[i].achieved);
    return null;
  }

  function planGrantShare(plan, grantCode) {
    var items = plan.grantContributions || [];
    if (items.length) {
      for (var i = 0; i < items.length; i += 1) {
        if (items[i].grantCode === grantCode) return Number(items[i].contributionPercent || 0) / 100;
      }
      return 0;
    }
    if (plan.grantCode === grantCode) return 1;
    var codes = plan.grantCodes || [];
    return codes.indexOf(grantCode) > -1 ? 1 / codes.length : 0;
  }

  function parseMonthlyRates(value) {
    var out = {};
    var parts = String(value || "").split(/[;\n,]+/);
    for (var i = 0; i < parts.length; i += 1) {
      var pair = parts[i].split("=");
      if (pair.length === 2) out[pair[0].trim()] = Number(pair[1].trim() || 0);
    }
    return out;
  }

  function selectedProject(params) {
    if (params.projectId) return findById(store.projects, "id", params.projectId);
    if (params.grantCode) {
      for (var i = 0; i < store.projects.length; i += 1) if (projectHasGrant(store.projects[i], params.grantCode)) return store.projects[i];
    }
    return store.projects[0] || null;
  }

  function progressPeriodLabel(params) {
    if (!params.periodValue) return "Toutes periodes";
    if (params.periodType === "monthly") return params.periodValue;
    if (params.periodType === "quarterly") return params.periodValue;
    return "Annee " + params.periodValue;
  }

  function progressPeriodEndDate(params) {
    var range = monthRangeFromProgress(params);
    if (!range.end) return todayIsoDate();
    return monthDateRange(range.end).end;
  }

  function progressPeriodParams(params) {
    var range = monthRangeFromProgress(params);
    return { projectId: params.projectId, startMonth: range.start, endMonth: range.end };
  }

  function monthRangeFromProgress(params) {
    if (params._rangeStart || params._rangeEnd) return { start: params._rangeStart || "", end: params._rangeEnd || "" };
    if (!params.periodValue) return { start: "", end: "" };
    if (params.periodType === "monthly") return { start: params.periodValue, end: params.periodValue };
    if (params.periodType === "annual") return { start: params.periodValue + "-01", end: params.periodValue + "-12" };
    var year = new Date().getFullYear();
    var q = params.periodValue;
    if (q === "Q1") return { start: year + "-01", end: year + "-03" };
    if (q === "Q2") return { start: year + "-04", end: year + "-06" };
    if (q === "Q3") return { start: year + "-07", end: year + "-09" };
    return { start: year + "-10", end: year + "-12" };
  }

  function projectActivitiesForCsp(params, cspActivityId) {
    var out = [];
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      var activity = store.projectActivities[i];
      if (params.projectId && activity.projectId !== params.projectId) continue;
      if (params.grantCode && !activityHasGrant(activity, params.grantCode) && !projectHasGrant(findById(store.projects, "id", activity.projectId), params.grantCode)) continue;
      if (params.donor && !activityMatchesDonor(activity, params.donor)) continue;
      if (activity.cspActivityIds && activity.cspActivityIds.indexOf(cspActivityId) > -1) out.push(activity);
    }
    return out;
  }

  function plannedForActivity(activityId, params) {
    var total = 0;
    var range = monthRangeFromProgress(params);
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (plan.activityId !== activityId) continue;
      if (!activityMatchesProgressFilters(activityId, params)) continue;
      if (!monthInRange(plan.month, range)) continue;
      total += progressNumericValue(plan.target);
    }
    return total;
  }

  function achievedForActivity(activityId, params) {
    var total = 0;
    var range = monthRangeFromProgress(params);
    for (var i = 0; i < store.monthlyReports.length; i += 1) {
      var report = store.monthlyReports[i];
      var plan = findById(store.monthlyPlans, "id", report.planId);
      if (!plan || plan.activityId !== activityId) continue;
      if (!activityMatchesProgressFilters(activityId, params)) continue;
      if (!monthInRange(report.month, range)) continue;
      total += progressNumericValue(report.achieved);
    }
    return total;
  }

  function progressNumericValue(value) {
    if (typeof value === "number") return isFinite(value) ? value : 0;
    var text = String(value || "").replace(/\s/g, "").replace(",", ".");
    var match = text.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function formatProgressMetric(value) {
    if (Math.round(value) === value) return formatNumber(value);
    return formatDecimal(value, 3);
  }

  function matchProgressReport(report, params) {
    var range = monthRangeFromProgress(params);
    var plan = findById(store.monthlyPlans, "id", report.planId);
    if (params.projectId && plan && plan.projectId !== params.projectId) return false;
    if (plan && !activityMatchesProgressFilters(plan.activityId, params)) return false;
    return monthInRange(report.month, range);
  }

  function monthInRange(month, range) {
    if (!range.start && !range.end) return true;
    if (!month) return false;
    if (range.start && month < range.start) return false;
    if (range.end && month > range.end) return false;
    return true;
  }

  function reportCoverage(params) {
    var range = monthRangeFromProgress(params);
    var plans = 0;
    var reports = 0;
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      if (params.projectId && plan.projectId !== params.projectId) continue;
      if (!monthInRange(plan.month, range)) continue;
      plans += 1;
      if (reportForPlan(plan.id)) reports += 1;
    }
    return plans ? Math.round((reports / plans) * 100) : 0;
  }

  function progressGapSummary(params) {
    var summary = progressPortfolioMetricSummary(params);
    return summary.absolute.achieved - summary.absolute.target;
  }

  function progressSpentTotal(params) {
    var rangeParams = progressPeriodParams(params);
    var total = 0;
    for (var i = 0; i < store.monthlyExpenses.length; i += 1) {
      var expense = store.monthlyExpenses[i];
      if (params.projectId && expense.projectId !== params.projectId) continue;
      if (rangeParams.startMonth && expense.month < rangeParams.startMonth) continue;
      if (rangeParams.endMonth && expense.month > rangeParams.endMonth) continue;
      total += Number(expense.amountXaf || 0);
    }
    return total;
  }

  function partnersForProgress(params) {
    var seen = {};
    var out = [];
    for (var i = 0; i < store.projects.length; i += 1) {
      var project = store.projects[i];
      if (params.projectId && project.id !== params.projectId) continue;
      if (params.grantCode && !projectHasGrant(project, params.grantCode)) continue;
      var grants = grantsForProject(project);
      var grant = grants[0] || null;
      if (params.donor && (!grant || grant.donor !== params.donor)) continue;
      if (!projectHasMatchingActivity(project.id, params)) continue;
      var partner = findById(store.partners, "vendor", project.partnerVendor);
      if (partner && !seen[partner.vendor]) {
        seen[partner.vendor] = true;
        out.push(partner);
      }
    }
    return out;
  }

  function countProjectActivities(params) {
    var count = 0;
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      if (params.projectId && store.projectActivities[i].projectId !== params.projectId) continue;
      if (params.grantCode && !activityHasGrant(store.projectActivities[i], params.grantCode) && !projectHasGrant(findById(store.projects, "id", store.projectActivities[i].projectId), params.grantCode)) continue;
      if (params.donor && !activityMatchesDonor(store.projectActivities[i], params.donor)) continue;
      if (params.cspActivityId && (!store.projectActivities[i].cspActivityIds || store.projectActivities[i].cspActivityIds.indexOf(params.cspActivityId) < 0)) continue;
      count += 1;
    }
    return count;
  }

  function activityMatchesProgressFilters(activityId, params) {
    var activity = findById(store.projectActivities, "id", activityId);
    if (!activity) return false;
    if (params.projectId && activity.projectId !== params.projectId) return false;
    if (params.grantCode && !activityHasGrant(activity, params.grantCode) && !projectHasGrant(findById(store.projects, "id", activity.projectId), params.grantCode)) return false;
    if (params.donor && !activityMatchesDonor(activity, params.donor)) return false;
    if (params.cspActivityId && (!activity.cspActivityIds || activity.cspActivityIds.indexOf(params.cspActivityId) < 0)) return false;
    return true;
  }

  function activityMatchesDonor(activity, donor) {
    var codes = activityGrantCodes(activity);
    var grant = codes.length ? findById(store.grants, "code", codes[0]) : null;
    if (!grant) {
      var project = findById(store.projects, "id", activity.projectId);
      var grants = grantsForProject(project);
      for (var i = 0; i < grants.length; i += 1) if (grants[i].donor === donor) return true;
    }
    return !!grant && grant.donor === donor;
  }

  function projectHasMatchingActivity(projectId, params) {
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      var activity = store.projectActivities[i];
      if (activity.projectId !== projectId) continue;
      if (params.grantCode && !activityHasGrant(activity, params.grantCode) && !projectHasGrant(findById(store.projects, "id", projectId), params.grantCode)) continue;
      if (params.donor && !activityMatchesDonor(activity, params.donor)) continue;
      if (params.cspActivityId && (!activity.cspActivityIds || activity.cspActivityIds.indexOf(params.cspActivityId) < 0)) continue;
      return true;
    }
    return false;
  }

  function budgetLineMatchesProgressFilters(line, params) {
    if (!params.grantCode && !params.donor && !params.cspActivityId) return true;
    for (var i = 0; i < store.projectActivities.length; i += 1) {
      var activity = store.projectActivities[i];
      if (activity.projectId !== line.projectId) continue;
      if (params.grantCode && !activityHasGrant(activity, params.grantCode) && !projectHasGrant(findById(store.projects, "id", line.projectId), params.grantCode)) continue;
      if (params.donor && !activityMatchesDonor(activity, params.donor)) continue;
      if (params.cspActivityId && (!activity.cspActivityIds || activity.cspActivityIds.indexOf(params.cspActivityId) < 0)) continue;
      if (!line.cspActivityId || activity.cspActivityIds.indexOf(line.cspActivityId) > -1) return true;
    }
    return false;
  }

  function subActivitiesForActivity(activityId) {
    var out = [];
    for (var i = 0; i < store.projectSubActivities.length; i += 1) {
      if (!activityId || store.projectSubActivities[i].activityId === activityId) out.push({ value: store.projectSubActivities[i].id, label: store.projectSubActivities[i].id + " - " + store.projectSubActivities[i].label });
    }
    return out;
  }

  function processIndicatorsForProject(projectId) {
    var out = [];
    for (var i = 0; i < store.processIndicators.length; i += 1) {
      if (!projectId || store.processIndicators[i].projectId === projectId) out.push({ value: store.processIndicators[i].id, label: store.processIndicators[i].id + " - " + store.processIndicators[i].label + " / cible: " + store.processIndicators[i].target });
    }
    return out;
  }

  function monthlyGapRows() {
    if (!store.monthlyPlans.length) return '<tr><td colspan="7"><p class="muted">Aucune planification mensuelle enregistree.</p></td></tr>';
    var rows = "";
    for (var i = 0; i < store.monthlyPlans.length; i += 1) {
      var plan = store.monthlyPlans[i];
      var report = reportForPlan(plan.id);
      var kpi = findById(store.kpis, "id", plan.kpiId);
      var target = progressNumericValue(plan.target);
      var achieved = report ? progressNumericValue(report.achieved) : 0;
      var gap = target && achieved ? achieved - target : "";
      rows += "<tr><td>" + escapeHtml(plan.id) + "</td><td>" + escapeHtml(plan.month) + "</td><td>" + escapeHtml(kpi ? kpi.label : plan.kpiId) + "</td><td>" + escapeHtml(plan.target || "") + "</td><td>" + escapeHtml(report ? report.achieved : "Non rapporte") + "</td><td>" + escapeHtml(gap) + "</td><td>" + escapeHtml(report ? report.status : "Pending") + "</td></tr>";
    }
    return rows;
  }

  function reportForPlan(planId) {
    for (var i = 0; i < store.monthlyReports.length; i += 1) if (store.monthlyReports[i].planId === planId) return store.monthlyReports[i];
    return null;
  }

  function findById(items, key, value) {
    items = items || [];
    for (var i = 0; i < items.length; i += 1) if (items[i][key] === value) return items[i];
    return null;
  }

  function cspActivitiesForProject(projectId) {
    var ids = [];
    for (var i = 0; i < store.projects.length; i += 1) if (store.projects[i].id === projectId) ids = store.projects[i].cspActivityIds || [];
    var out = [];
    for (var j = 0; j < cspActivities.length; j += 1) if (ids.indexOf(cspActivities[j].id) > -1) out.push(activityOption(cspActivities[j]));
    return out;
  }

  function strategicSoOptions(documentId) {
    var doc = findByRecordId(store.strategicDocuments, documentId);
    var ids = doc && doc.soIds && doc.soIds.length ? doc.soIds : cspOutcomes.map(function (so) { return so.id; });
    var out = [];
    for (var i = 0; i < cspOutcomes.length; i += 1) if (ids.indexOf(cspOutcomes[i].id) > -1) out.push({ value: cspOutcomes[i].id, label: cspOutcomes[i].id + " - " + cspOutcomes[i].name });
    return out;
  }

  function strategicActivityOptions(documentId, soIds) {
    var doc = findByRecordId(store.strategicDocuments, documentId);
    var allowed = doc && doc.cspActivityIds && doc.cspActivityIds.length ? doc.cspActivityIds : cspActivities.map(function (a) { return a.id; });
    soIds = soIds || [];
    var out = [];
    for (var i = 0; i < cspActivities.length; i += 1) {
      if (allowed.indexOf(cspActivities[i].id) < 0) continue;
      if (soIds.length && soIds.indexOf(cspActivities[i].so) < 0) continue;
      out.push(activityOption(cspActivities[i]));
    }
    return out;
  }

  function activityOption(activity) {
    return { value: activity.id, label: activity.id + " - " + activity.name };
  }

  function resolveOptions(field, draft) {
    return typeof field.options === "function" ? field.options(draft) : field.options || [];
  }

  function normalizeOptions(options) {
    var out = [];
    for (var i = 0; i < options.length; i += 1) out.push(typeof options[i] === "string" ? { value: options[i], label: options[i] } : options[i]);
    return out;
  }

  function optionTag(option, selectedValue) {
    return '<option value="' + escapeHtml(option.value) + '" ' + (selectedValue === option.value ? "selected" : "") + ">" + escapeHtml(option.label) + "</option>";
  }

  function optionsHtml(options, selectedValue) {
    var opts = normalizeOptions(options || []);
    var html = '<option value="">-- Selectionner --</option>';
    for (var i = 0; i < opts.length; i += 1) html += optionTag(opts[i], selectedValue);
    return html;
  }

  function formatCell(value) {
    if (Object.prototype.toString.call(value) === "[object Array]") return escapeHtml(value.join(", "));
    if (typeof value === "number") return formatNumber(value);
    return escapeHtml(value || "");
  }

  function formatPreviewCell(key, value) {
    if (key === "grantContributions") return escapeHtml(monthlyGrantContributionsLabel({ grantContributions: value }));
    if (key === "priceHistory") return hgsfPriceHistoryPreview(value);
    if (Object.prototype.toString.call(value) === "[object Array]") {
      if (!value.length) return "";
      var items = [];
      for (var i = 0; i < value.length; i += 1) items.push(resolveReferenceLabel(key, value[i]));
      return escapeHtml(items.join(", "));
    }
    if (typeof value === "number") return formatNumber(value);
    return escapeHtml(resolveReferenceLabel(key, value));
  }

  function hgsfPriceHistoryPreview(value) {
    var items = Object.prototype.toString.call(value) === "[object Array]" ? value : [];
    if (!items.length) return "";
    var rows = "";
    for (var i = 0; i < items.length; i += 1) {
      rows += "<tr><td>" + formatNumber(Number(items[i].priceXaf || 0)) + "</td><td>" + escapeHtml(items[i].effectiveDate || "") + "</td><td>" + escapeHtml(items[i].modifiedBy || items[i].initiator || "") + "</td><td>" + escapeHtml(formatDateTime(items[i].modifiedAt || items[i].date || "")) + "</td><td>" + escapeHtml(items[i].submittedBy || "") + "</td><td>" + escapeHtml(items[i].verifiedBy || items[i].verifier || "") + "</td><td>" + escapeHtml(items[i].validatedBy || items[i].validator || "") + "</td></tr>";
    }
    return '<table><thead><tr><th>Prix XAF</th><th>Date effet</th><th>Modifie par</th><th>Date modification</th><th>Soumis par</th><th>Verifie par</th><th>Valide par</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function formatDateTime(value) {
    if (!value) return "";
    return String(value).replace("T", " ").replace(/\.\d+Z?$/, "");
  }

  function resolveReferenceLabel(key, value) {
    if (value === undefined || value === null || value === "") return "";
    var id = String(value);
    var item = null;
    if (key === "projectId") {
      item = findByRecordId(store.projects, id);
      return item ? id + " - " + item.title : id;
    }
    if (key === "portfolioId") {
      item = findByRecordId(store.portfolios, id);
      return item ? id + " - " + item.title : id;
    }
    if (key === "programmeId") {
      item = findByRecordId(store.programmes, id);
      return item ? id + " - " + item.title : id;
    }
    if (key === "strategicDocumentId") {
      item = findByRecordId(store.strategicDocuments, id);
      return item ? id + " - " + item.name : id;
    }
    if (key === "activityId") {
      item = findByRecordId(store.projectActivities, id);
      return item ? id + " - " + item.label : id;
    }
    if (key === "planId") {
      item = findByRecordId(store.monthlyPlans, id);
      return item ? id + " - " + monthlyPlanLabel(item) : id;
    }
    if (key === "budgetLineId") {
      item = findByRecordId(store.budgets, id);
      return item ? id + " - " + item.label : id;
    }
    if (key === "processIndicatorId") {
      item = findByRecordId(store.processIndicators, id);
      return item ? id + " - " + item.label : id;
    }
    if (key === "subActivityId") {
      item = findByRecordId(store.projectSubActivities, id);
      return item ? id + " - " + item.label : id;
    }
    if (key === "kpiId" || key === "kpiIds") {
      item = findByRecordId(store.kpis, id);
      return item ? id + " - " + item.label : id;
    }
    if (key === "grantCode" || key === "grantCodes") {
      if (isCpContribution(id)) return cpContributionGrantLabel;
      item = findByRecordId(store.grants, id);
      return item ? id + " - " + item.donor : id;
    }
    if (key === "fdpId" || key === "fdpIds" || key === "schoolFdpIds" || key === "siteIds" || key === "siteId") {
      item = findByRecordId(store.fdps, id) || findByRecordId(store.sites, id);
      if (item && item.name) return fdpLabel(item);
      if (item && item.arrondissement) return id + " - " + item.arrondissement + " / " + item.region;
      return id;
    }
    if (key === "fieldOfficeId") {
      item = findByRecordId(store.fieldOffices, id);
      return item ? id + " - " + item.name : id;
    }
    if (key === "partnerVendor") {
      item = findById(store.partners, "vendor", id);
      return item ? id + " - " + item.name : id;
    }
    if (key === "nfiId") {
      item = findByRecordId(store.nfis, id);
      return item ? id + " - " + item.name : id;
    }
    if (isStaffReferenceKey(key)) {
      item = findByRecordId(store.staffs, id) || findByRecordId(store.partnerStaffs, id);
      return item ? id + " - " + staffFullName(item) : id;
    }
    if (key === "partnerFocalPoint") {
      item = findByRecordId(store.stakeholders, id);
      if (item) return id + " - " + stakeholderLabel(item);
      item = findByRecordId(store.partnerStaffs, id) || findByRecordId(store.staffs, id);
      return item ? id + " - " + staffFullName(item) : id;
    }
    if (key === "soIds") {
      item = findById(cspOutcomes, "id", id);
      return item ? id + " - " + item.name : id;
    }
    if (key === "cspActivityId" || key === "cspActivityIds") {
      item = findById(cspActivities, "id", id);
      return item ? id + " - " + item.name : id;
    }
    return id;
  }

  function isStaffReferenceKey(key) {
    return key === "staffId" || key === "ownerId" || key === "managerId" || key === "reportsTo" || key === "pamOwner" || key === "pamFocalPoint" || key === "reportedBy" || key === "validatedBy" || key === "requestedBy" || key === "responsiblePam" || key === "personResponsible";
  }

  function staffFullName(staff) {
    if (!staff) return "";
    return [staff.firstName, staff.lastName].filter(Boolean).join(" ");
  }

  function formatNumber(value) {
    if (window.Intl && Intl.NumberFormat) return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
    return String(value);
  }

  function moneyText(value, currency) {
    return formatNumber(Number(value || 0)) + " " + (currency || "XAF");
  }

  function projectCurrency(projectId) {
    var project = findByRecordId(store.projects, projectId || state.contextProjectId || "");
    return project && project.currency ? project.currency : "XAF";
  }

  function recordCurrency(record, pageId) {
    var projectId = record && (record.projectId || scopedRecordProjectId(record, pageId || state.page));
    return projectCurrency(projectId);
  }

  function formatDecimal(value, digits) {
    if (window.Intl && Intl.NumberFormat) return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value || 0));
    return Number(value || 0).toFixed(digits);
  }

  function labelize(value) {
    var labels = {
      projectId: "ID Projet",
      portfolioId: "Portefeuille",
      programmeId: "Programme",
      organizationName: "Organisation",
      organizationType: "Type de structure",
      governanceModel: "Modele de gouvernance",
      ownerId: "Responsable",
      managerId: "Manager",
      valueStatement: "Valeur attendue",
      expectedBenefits: "Benefices attendus",
      planType: "Type de plan",
      workstream: "Composante",
      milestone: "Jalon",
      deliverable: "Livrable",
      dependencies: "Dependances",
      acceptanceCriteria: "Criteres d'acceptation",
      riskCategory: "Categorie risque",
      riskStatement: "Enonce du risque",
      probability: "Probabilite",
      impact: "Impact",
      responseStrategy: "Strategie de reponse",
      mitigationAction: "Action mitigation",
      riskStatus: "Statut risque",
      messageType: "Type message",
      procurementMethod: "Methode procurement",
      packageName: "Package procurement",
      estimatedAmount: "Montant estime",
      plannedAwardDate: "Attribution prevue",
      qualityStandard: "Standard qualite",
      controlMethod: "Methode controle",
      resourceType: "Type ressource",
      roleOrAsset: "Role / asset",
      availabilityWindow: "Disponibilite",
      strategicDocumentId: "Document strategique",
      agreementNumber: "Numero accord / contrat",
      validFrom: "Valide de",
      validTo: "Valide a",
      distributionLines: "Lignes distribution",
      inventoryItems: "Inventaire NFI",
      activityGrantAmounts: "Montants par activite/grant",
      invoiceSystemId: "Facture systeme",
      invoiceTotalXaf: "Total facture",
      invoiceAmountXaf: "Montant facture",
      amountPaidXaf: "Montant paye",
      balanceXaf: "Solde",
      returnReason: "Derniere raison du renvoi",
      returnedAt: "Date du dernier renvoi",
      returnHistory: "Historique des renvois",
      managerEmail: "Rattache a",
      accessPages: "Modules autorises",
      accessProjects: "Projets autorises",
      accessRegions: "Regions autorisees",
      accessDepartments: "Departements autorises",
      accessArrondissements: "Arrondissements autorises",
      accessFdps: "FDP autorises",
      createdByEmail: "Cree par",
      submittedByEmail: "Soumis par",
      verifiedByEmail: "Verifie par",
      validatedByEmail: "Valide par",
      activityId: "ID activite",
      planId: "Plan mensuel",
      budgetLineId: "Ligne budgetaire",
      processIndicatorId: "Indicateur process",
      subActivityId: "Sous activite",
      subActivityType: "Sous activite",
      kpiId: "KPI",
      kpiIds: "IDs KPI",
      fieldOfficeId: "ID Office in charge",
      staffAffiliation: "Rattachement staff",
      zoningLevel: "Zonage",
      zoningCountry: "Pays de rattachement",
      zoningRegion: "Region de rattachement",
      zoningDepartment: "Departement de rattachement",
      zoningArrondissements: "Arrondissements de rattachement",
      partnerVendor: "Partenaire",
      fdpIds: "FDP rattaches",
      siteIds: "Sites administratifs",
      projectFdps: "FDP rattaches et beneficiaires",
      localizedStakeholder: "Localisee",
      isPartnerStaff: "Staff partenaire",
      staffStatus: "Statut staff",
      localizedActivity: "Activite localisee",
      subActivityLabel: "Libelle sous activite",
      kpiLabel: "Libelle KPI",
      localizationLevel: "Niveau de localisation",
      localizationCountry: "Pays concerne",
      localizationRegions: "Regions concernees",
      localizationDepartments: "Departements concernes",
      localizationArrondissements: "Arrondissements concernes",
      siteReferenceType: "Type de site",
      modality: "Modalite",
      modalities: "Modalites retenues",
      subActivityTypes: "Sous activites retenues",
      whatWhere: "What and Where",
      siteId: "Site / FDP",
      why: "Why",
      unit: "Unit",
      personResponsible: "Person responsible",
      timelineForAction: "Timeline for action",
      recommendationStatus: "Status recommandation",
      actionUpdate: "Action / Update",
      actionHistory: "Historique actions",
      completionDate: "Date of completion",
      otherSubActivity: "Autre sous activite",
      otherWhatWhere: "Autre What and Where",
      otherUnit: "Autre unite",
      grantCode: "Grant rattache",
      grantCodes: "Grants rattaches",
      grantContributions: "Grants rattaches et contribution",
      schoolFdpIds: "Ecoles rattachees",
      createdAt: "Date estimation",
      initiatedAt: "Date initiation",
      initiatorEmail: "Email initiateur",
      initiatorName: "Initiateur",
      periodFrom: "Du",
      periodTo: "A",
      applicableDaysCount: "Jours applicables",
      orderLines: "Ingredients commandes",
      purchaseOrderId: "Bon de commande",
      deliveryId: "Reception",
      invoiceId: "Facture",
      invoiceNumber: "Numero facture",
      invoiceAmount: "Montant facture",
      transactionNumber: "Numero transaction",
      amountTransferredToSchool: "Montant transfere a l'ecole",
      schoolTransactionNumber: "Transaction ecole",
      amountDue: "Montant du",
      amountPaidToCoop: "Montant paye",
      balanceToPay: "Solde a payer",
      rationItems: "Composition ration",
      beneficiaryRows: "FDPs et beneficiaires",
      rationId: "Ration",
      needType: "Type besoin",
      applicableDays: "Jours applicables",
      workdaysOnly: "Jours ouvrables uniquement",
      menuItems: "Ingredients du menu",
      schoolRows: "Ecoles / menus",
      organizationType: "Type organisation",
      priceXaf: "Prix",
      priceEntries: "Prix par arrondissement",
      estimationId: "Estimation rattachee",
      cooperativePartnerId: "Cooperative / GIC",
      effectiveDate: "Date d'effet",
      coveredDays: "Jours couverts",
      periodType: "Periode",
      periodValue: "Mois / periode",
      label: "Libelle",
      dataSource: "Source de donnees",
      responsiblePam: "Responsable organisation",
      partnerFocalPoint: "Point focal partenaire",
      cspActivityId: "Activite CSP rattachee",
      cspActivityIds: "Activites CSP rattachees",
      soIds: "SO associes",
      pamOwner: "Responsable organisation",
      fdpType: "Type FDP",
      organizationType: "Type organisation",
      focalPointName: "Point focal",
      focalPointFunction: "Fonction point focal",
      siteFocalPointName: "PF site",
      siteFocalPointSex: "Sexe PF",
      arrondissement: "Arrondissement",
      phone: "Telephone"
    };
    if (labels[value]) return labels[value];
    return value.replace(/([A-Z])/g, " $1").replace(/^./, function (char) { return char.toUpperCase(); });
  }

  function pageLabel(key) {
    for (var i = 0; i < pages.length; i += 1) if (pages[i][0] === key) return pages[i][1];
    return key;
  }

  function pageById(id) {
    for (var i = 0; i < pages.length; i += 1) if (pages[i][0] === id) return pages[i];
    return null;
  }

  function nextAction(key) {
    var map = {
      fieldOffices: "Verifier staffing et vehicules actifs",
      workspaceProfiles: "Completer la gouvernance et le point focal",
      portfolios: "Relier la valeur attendue au document strategique",
      programmes: "Definir les benefices et la coordination inter-projets",
      strategicDocuments: "Definir SO et activites strategiques utilisables",
      sites: "Completer les arrondissements prioritaires",
      fdps: "Rattacher les points de distribution aux arrondissements",
      partners: "Rattacher aux projets",
      cooperativePartners: "Completer les cooperatives, GICs et partenaires locaux",
      grants: "Verifier TDD et valeur USD",
      staffs: "Completer les lignes de supervision",
      partnerStaffs: "Desormais fusionne dans Parties prenantes",
      hgsfIngredients: "Creer les ingredients et prix par arrondissement",
      hgsfMenus: "Composer les menus HGSF",
      hgsfSchoolMenus: "Rattacher les menus aux ecoles",
      hgsfEstimations: "Estimer quantites et couts HGSF",
      hgsfPurchaseOrders: "Generer les bons de commande HGSF",
      hgsfDeliveries: "Receptionner les livraisons HGSF",
      hgsfDeliveryInvoices: "Enregistrer les factures de livraison",
      hgsfInvoicePayments: "Suivre les transferts vers les ecoles",
      hgsfSchoolCoopPayments: "Suivre les paiements ecole a cooperative",
      assistanceRations: "Definir les rations GFD, CBT et Nutrition",
      gfdNeeds: "Estimer les besoins GFD In kind",
      cbtNeeds: "Estimer les besoins CBT",
      nutritionNeeds: "Estimer les besoins Nutrition",
      projects: "Ajouter activites, KPI et budget",
      stakeholders: "Cartographier interets majeurs",
      implementationPlans: "Consolider livrables, dependances et jalons",
      projectActivities: "Definir les KPI",
      projectSubActivities: "Associer les KPIs aux sous activites",
      monthlyPlans: "Planifier cible, KPI, FDP et grant rattache",
      monthlyReports: "Reporter les realisations et contraintes",
      monthlyExpenses: "Enregistrer les depenses et pieces justificatives",
      recommendations: "Suivre les actions correctives jusqu'a completion",
      distributionReports: "Reporter les distributions IK/CBT par FDP",
      nfis: "Creer les NFI du projet",
      nfiDistributions: "Renseigner les approvisionnements NFI par FDP",
      nfiInventories: "Verifier les quantites vues et l'etat des NFI",
      partnerInvoices: "Enregistrer les factures partenaires soumises",
      partnerInvoicePayments: "Suivre les paiements et soldes des factures",
      operationsDashboard: "Suivre les operations avec filtres",
      partnerInvoice: "Generer les factures partenaire",
      kpis: "Renseigner les cibles",
      budgets: "Comparer budget projet et lignes detaillees",
      communicationPlans: "Clarifier audience, canal et frequence de partage",
      procurementPlans: "Suivre packages, methode et date d'attribution",
      riskRegisters: "Prioriser les risques et actions de mitigation",
      qualityPlans: "Fixer controles, criteres et preuves d'acceptation",
      resourcePlans: "Verifier capacite, assets et contraintes",
      baselines: "Documenter sources et valeurs"
    };
    return map[key] || "";
  }

  function parentByClass(node, className) {
    while (node && node !== document) {
      if ((" " + node.className + " ").indexOf(" " + className + " ") > -1) return node;
      node = node.parentNode;
    }
    return null;
  }

  function parentByAttribute(node, attribute) {
    while (node && node !== document) {
      if (node.hasAttribute && node.hasAttribute(attribute)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function showAppError(error) {
    var box = document.getElementById("app-error");
    if (box) {
      box.hidden = false;
      box.textContent = "Le script app.js a rencontre une erreur: " + error.message;
    }
  }

  function clearAppError() {
    var box = document.getElementById("app-error");
    if (box) {
      box.hidden = true;
      box.textContent = "";
    }
  }
})();
