import {RoleGuard} from "../../components/RoleGuard";
export default function Layout({children}:{children:React.ReactNode}){return <RoleGuard role="EMPRESA">{children}</RoleGuard>}
