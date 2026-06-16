import AccountAuth from "@/components/client/AccountAuth";
export const metadata={title:"Inscription client"};
export default async function Page({searchParams}:{searchParams:Promise<{redirect?:string}>}){const params=await searchParams;return <main className="grid min-h-screen place-items-center bg-forest p-5"><AccountAuth mode="signup" redirectTo={params.redirect||"/espace-client"}/></main>}
