import {RoleGuard} from "../../components/RoleGuard";
import {ProfileSwitch} from "../../components/ProfileSwitch";
export default function Layout({children}:{children:React.ReactNode}){return <RoleGuard role="EMPRESA"><div className="contextBar"><ProfileSwitch current="EMPRESA"/></div>{children}</RoleGuard>}
