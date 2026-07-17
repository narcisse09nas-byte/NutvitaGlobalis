import Container from "./Container";

type Props={

children:React.ReactNode;

className?:string;

}

export default function Section({

children,

className=""

}:Props){

return(

<section className={`py-20 ${className}`}>

<Container>

{children}

</Container>

</section>

)

}