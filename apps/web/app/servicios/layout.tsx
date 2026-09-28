import { RoleGuard } from "../../components/RoleGuard";

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard role="CANDIDATO">{children}</RoleGuard>;
}
