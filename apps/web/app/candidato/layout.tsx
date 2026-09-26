import {RoleGuard} from "../../components/RoleGuard";
import {ProfileSwitch} from "../../components/ProfileSwitch";
export default function Layout({children}:{children:React.ReactNode}){return <RoleGuard role="CANDIDATO"><div className="contextBar"><ProfileSwitch current="CANDIDATO"/></div>{children}</RoleGuard>}
