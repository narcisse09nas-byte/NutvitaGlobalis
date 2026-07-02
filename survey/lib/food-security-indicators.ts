type Answers=Record<string,unknown>;
const n=(data:Answers,key:string)=>Number.isFinite(Number(data[key]))?Number(data[key]):0;
const category3=(score:number,first:number,second:number)=>score<=first?"poor":score<=second?"borderline":"acceptable";

export function calculateFcs(data:Answers,threshold:"low"|"high"="low"){
  const score=n(data,"FCSStap")*2+n(data,"FCSPulse")*3+n(data,"FCSDairy")*4+n(data,"FCSPr")*4+n(data,"FCSVeg")+n(data,"FCSFruit")+n(data,"FCSFat")*.5+n(data,"FCSSugar")*.5;
  const [first,second]=threshold==="high"?[28,42]:[21,35];
  return {score,category:category3(score,first,second),flags:{low:score<14,high:score>100,invalid:score<0||score>112}};
}
export function calculateFcsN(data:Answers){
  const vitaminA=n(data,"FCSDairy")+n(data,"FCSNPrMeatO")+n(data,"FCSNPrEggs")+n(data,"FCSNVegOrg")+n(data,"FCSNVegGre")+n(data,"FCSNFruiOrg");
  const protein=n(data,"FCSPulse")+n(data,"FCSDairy")+n(data,"FCSNPrMeatF")+n(data,"FCSNPrMeatO")+n(data,"FCSNPrFish")+n(data,"FCSNPrEggs");
  const haemIron=n(data,"FCSNPrMeatF")+n(data,"FCSNPrMeatO")+n(data,"FCSNPrFish");
  const classify=(value:number)=>value===0?"never":value<=6?"sometimes":"daily";
  return {vitaminA,protein,haemIron,vitaminACategory:classify(vitaminA),proteinCategory:classify(protein),haemIronCategory:classify(haemIron)};
}
export function calculateHdds(data:Answers){
  const keys=["StapCer","StapRoot","Pulse","Dairy","PrMeat","PrFish","PrEggs","Veg","Fruit","Fat","Sugar","Cond"];
  const score=keys.reduce((sum,key)=>sum+(n(data,`HDDS${key}`)===1?1:0),0);
  return {score,flags:{zero:score===0,low:score<=2,high:score>=10}};
}
export function calculateRcsi(data:Answers){
  const score=n(data,"rCSILessQlty")+n(data,"rCSIBorrow")*2+n(data,"rCSIMealNb")+n(data,"rCSIMealSize")+n(data,"rCSIMealAdult")*3;
  return {score,ipc:score<=3?1:score<=18?2:score<=42?3:4,flags:{low:score<=3,high:score>=42,invalid:score<0||score>56}};
}
export function calculateHhs(data:Answers){
  const score=["NoFood","BedHung","NotEat"].reduce((sum,key)=>{if(n(data,`HHS${key}`)!==1)return sum;const frequency=n(data,`HHS${key}_FR`);return sum+(frequency>=3?2:1)},0);
  return {score,category:score<=1?"little_or_no_hunger":score<=3?"moderate_hunger":"severe_hunger",flagPotentialFamine:score>=5};
}
export function calculateFes(data:Answers){
  const food=n(data,"HHExpF_1M"),nonFood=n(data,"HHExpNF_1M"),total=food+nonFood,share=total>0?food/total:null;
  return {food,nonFood,total,share,category:share===null?"not_available":share<.5?"low":share<.65?"medium":share<.75?"high":"very_high"};
}
export function calculateLcs(data:Answers){
  const used=(keys:string[])=>keys.some(key=>[20,30].includes(n(data,key)));
  const stress=used(["LcsEN_stress_DomAsset","LcsEN_stress_Utilities","LcsEN_stress_Saving"]);
  const crisis=used(["LcsEN_crisis_ProdAssets","LcsEN_crisis_Health","LcsEN_crisis_OutSchool"]);
  const emergency=used(["LcsEN_em_ResAsset","LcsEN_em_Begged","LcsEN_em_IllegalAct"]);
  return {stress,crisis,emergency,maximum:emergency?4:crisis?3:stress?2:1};
}
export function calculateSurveyIndicators(data:Answers){
  return {fcs:calculateFcs(data),fcsHigh:calculateFcs(data,"high"),fcsN:calculateFcsN(data),hdds:calculateHdds(data),hhs:calculateHhs(data),rCSI:calculateRcsi(data),fes:calculateFes(data),lcs:calculateLcs(data)};
}
