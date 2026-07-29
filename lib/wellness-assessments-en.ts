import type {AssessmentKind,AssessmentQuestion} from "@/lib/wellness-assessments";
const days=["0 days","1–2 days","3–4 days","5–6 days","7 days"],reverse=["7 days","5–6 days","3–4 days","1–2 days","No days"];
const titles:Record<string,string>={
 regular_meals:"Days with three main meals",fruit:"Days with at least 2 servings of fruit",vegetables:"Days with at least 3 servings of vegetables",diversity:"Days including all five food groups",hydration:"Days with at least 1.5–2 litres of water",sugary_drinks:"Days with sugary drinks",ultra_processed:"Days with ultra-processed foods",fried_food:"Days with fried foods",portion_size:"Usual portion size",balanced_breakfast:"Days with a balanced breakfast",protein_sources:"Days with a quality protein source at least twice",snacking:"Days with unplanned snacking",
 planned_sessions:"Planned sessions lasting at least 30 minutes",weekly_minutes:"Moderate or vigorous minutes this week",intensity:"Usual intensity",strength_days:"Strength-training days",sitting_time:"Average sitting time per day",daily_walking:"Daily walking outside sport",stairs:"Use of stairs",regularity:"How long this exercise habit has lasted",interruptions:"Weeks without activity in the last 30 days",functional_capacity:"After climbing two floors",
 sleep_duration:"Nights with 7–9 hours of sleep",rested:"Days waking up rested",stress:"Days feeling stressed, anxious or overwhelmed",recreational_screen:"Daily recreational screen time",alcohol:"Days with alcohol consumption",nicotine:"Days with tobacco or nicotine",emotional_wellbeing:"Days with positive mood and satisfaction",social_connections:"Days with pleasant social contact",relaxation:"Days with at least 30 minutes of relaxation",life_balance:"Balance between work/studies, personal life and rest"
};
const special:Record<string,string[]>={
 regular_meals:["0–1 day","2–3 days","4–5 days","6 days","7 days"],hydration:["0–1 day","2–3 days","4–5 days","6 days","7 days"],portion_size:["Very excessive","Somewhat excessive","Appropriate for my hunger","Somewhat insufficient","Very insufficient"],
 planned_sessions:["0","1","2","3–4","5 or more"],weekly_minutes:["Under 30","30–74","75–149","150–299","300 or more"],intensity:["None","Low","Moderate","Vigorous","Mixed moderate/vigorous"],strength_days:["None","1 day","2 days","3 days","4 days or more"],sitting_time:["Over 8 h","6–8 h","4–6 h","2–4 h","Under 4 h"],daily_walking:["Under 10 min","10–29 min","30–59 min","60–89 min","90 min or more"],stairs:["Never","Rarely","Sometimes","Often","Always"],regularity:["No habit","Under 1 month","1–3 months","3–6 months","Over 6 months"],interruptions:["4 weeks","3 weeks","2 weeks","1 week","None"],functional_capacity:["Must stop","Very breathless","Moderately breathless","Slightly breathless","Not breathless"],
 stress:["Every day","5–6 days","3–4 days","1–2 days","No days"],recreational_screen:["Over 6 h","4–6 h","2–4 h","1–2 h","Under 1 h"],life_balance:["Never","Rarely","Sometimes","Often","Always"]
};
const negative=new Set(["sugary_drinks","ultra_processed","fried_food","snacking","alcohol","nicotine"]);
export function englishQuestion(question:AssessmentQuestion):AssessmentQuestion{
 const labels=special[question.id]||(negative.has(question.id)?reverse:days);
 return {...question,title:titles[question.id]||question.title,help:"Answer for the last 7 days. Use the examples and thresholds shown in the options.",options:question.options.map((option,index)=>({...option,label:labels[index]||option.label}))};
}
export const englishAssessmentLabels:Record<AssessmentKind,{title:string;subtitle:string}>={
 nutrition:{title:"NutVita™ Nutrition Score",subtitle:"Eating habits over the last 7 days"},activity:{title:"Physical Activity Score",subtitle:"Exercise, daily mobility and sedentary time"},lifestyle:{title:"NutVita™ Lifestyle Score",subtitle:"Sleep, stress, behaviours and well-being"}
};
export const englishLevels:Record<string,string>={very_low:"Very low",low:"Low",moderate:"Moderate",good:"Good",excellent:"Excellent"};
