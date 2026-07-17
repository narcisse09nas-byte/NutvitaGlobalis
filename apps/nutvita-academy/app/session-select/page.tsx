import { LocalAuthProvider } from "@/components/auth/LocalAuthProvider";
import { WorkspaceSelector } from "@/components/auth/WorkspaceSelector";

export default function SessionSelectPage() {
  return (
    <LocalAuthProvider>
      <WorkspaceSelector />
    </LocalAuthProvider>
  );
}
