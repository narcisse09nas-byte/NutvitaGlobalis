const DEFAULT_XOF_PER_USD = 600;
export function xofPerUsd(){const value=Number(process.env.NEXT_PUBLIC_XOF_PER_USD||DEFAULT_XOF_PER_USD);return Number.isFinite(value)&&value>0?value:DEFAULT_XOF_PER_USD}
export function xofToUsd(amountXof:number){return Math.round(amountXof/xofPerUsd()*100)/100}
export function formatUsd(amount:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(amount)}
export function formatXofAsUsd(amountXof:number){return formatUsd(xofToUsd(amountXof))}
export function displayMoney(amount:number,currency?:string){return currency==='USD'?formatUsd(amount):formatXofAsUsd(amount)}
