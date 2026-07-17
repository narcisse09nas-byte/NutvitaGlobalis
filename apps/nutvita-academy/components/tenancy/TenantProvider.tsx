"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { roleHasPermission } from "@/config/tenant-permissions";
import { useLocalAuth } from "@/hooks/use-local-auth";
import {
  createInvitation,
  createOrganization,
  emptyTenantStore,
  loadTenantStore,
  saveTenantStore,
} from "@/lib/tenant-storage";
import type {
  Organization,
  OrganizationInvitation,
  OrganizationMember,
  TenantPermission,
  TenantRole,
  TenantStoreData,
} from "@/types/tenant";

type CreateOrganizationInput = {
  name: string;
  description: string;
  country: string;
  city: string;
};

export type TenantContextValue = {
  data: TenantStoreData;
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeMembership: OrganizationMember | null;
  activeMembers: OrganizationMember[];
  activeInvitations: OrganizationInvitation[];
  createNewOrganization: (
    input: CreateOrganizationInput
  ) => Organization | null;
  switchOrganization: (organizationId: string) => void;
  updateOrganization: (patch: Partial<Organization>) => void;
  inviteMember: (email: string, role: TenantRole) => void;
  revokeInvitation: (invitationId: string) => void;
  updateMemberRole: (memberId: string, role: TenantRole) => void;
  toggleMemberActive: (memberId: string) => void;
  can: (permission: TenantPermission) => boolean;
};

export const TenantContext =
  createContext<TenantContextValue | null>(null);

export function TenantProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useLocalAuth();
  const [data, setData] = useState<TenantStoreData>(
    emptyTenantStore()
  );

  useEffect(() => {
    // Le stockage navigateur n'est disponible qu'après l'hydratation.
    setData(loadTenantStore());
  }, []);

  const persist = useCallback(
    (update: (current: TenantStoreData) => TenantStoreData) => {
      setData((current) => {
        const updated = update(current);
        saveTenantStore(updated);
        return updated;
      });
    },
    []
  );

  const organizations = useMemo(() => {
    if (!user) return [];

    const organizationIds = new Set(
      data.members
        .filter((member) => member.userId === user.id && member.active)
        .map((member) => member.organizationId)
    );

    return data.organizations.filter((organization) =>
      organizationIds.has(organization.id)
    );
  }, [data.members, data.organizations, user]);

  const activeId = user
    ? (data.activeOrganizationByUser[user.id] ?? organizations[0]?.id)
    : undefined;

  const activeOrganization =
    data.organizations.find(
      (organization) => organization.id === activeId
    ) ?? null;

  const activeMembership =
    user && activeOrganization
      ? (data.members.find(
          (member) =>
            member.userId === user.id &&
            member.organizationId === activeOrganization.id
        ) ?? null)
      : null;

  const activeMembers = useMemo(
    () =>
      activeOrganization
        ? data.members.filter(
            (member) =>
              member.organizationId === activeOrganization.id
          )
        : [],
    [activeOrganization, data.members]
  );

  const activeInvitations = useMemo(
    () =>
      activeOrganization
        ? data.invitations.filter(
            (invitation) =>
              invitation.organizationId === activeOrganization.id
          )
        : [],
    [activeOrganization, data.invitations]
  );

  const can = useCallback(
    (permission: TenantPermission) =>
      Boolean(
        activeMembership?.active &&
          roleHasPermission(activeMembership.role, permission)
      ),
    [activeMembership]
  );

  const createNewOrganization = useCallback(
    (input: CreateOrganizationInput) => {
      if (!user) return null;

      const created = createOrganization({
        ...input,
        ownerUserId: user.id,
        ownerFullName: user.fullName,
        ownerEmail: user.email,
      });

      persist((current) => ({
        ...current,
        organizations: [
          created.organization,
          ...current.organizations,
        ],
        members: [created.ownerMember, ...current.members],
        activeOrganizationByUser: {
          ...current.activeOrganizationByUser,
          [user.id]: created.organization.id,
        },
      }));

      return created.organization;
    },
    [persist, user]
  );

  const switchOrganization = useCallback(
    (organizationId: string) => {
      if (
        !user ||
        !organizations.some(
          (organization) => organization.id === organizationId
        )
      ) {
        return;
      }

      persist((current) => ({
        ...current,
        activeOrganizationByUser: {
          ...current.activeOrganizationByUser,
          [user.id]: organizationId,
        },
      }));
    },
    [organizations, persist, user]
  );

  const updateOrganization = useCallback(
    (patch: Partial<Organization>) => {
      if (!activeOrganization || !can("organization.update")) return;

      persist((current) => ({
        ...current,
        organizations: current.organizations.map((organization) =>
          organization.id === activeOrganization.id
            ? {
                ...organization,
                ...patch,
                id: organization.id,
                updatedAt: new Date().toISOString(),
              }
            : organization
        ),
      }));
    },
    [activeOrganization, can, persist]
  );

  const inviteMember = useCallback(
    (email: string, role: TenantRole) => {
      if (
        !user ||
        !activeOrganization ||
        !can("members.invite")
      ) {
        return;
      }

      const invitation = createInvitation({
        organizationId: activeOrganization.id,
        email: email.trim().toLowerCase(),
        role,
        invitedByUserId: user.id,
      });

      persist((current) => ({
        ...current,
        invitations: [invitation, ...current.invitations],
      }));
    },
    [activeOrganization, can, persist, user]
  );

  const revokeInvitation = useCallback(
    (invitationId: string) => {
      if (!can("members.invite")) return;

      persist((current) => ({
        ...current,
        invitations: current.invitations.map((invitation) =>
          invitation.id === invitationId
            ? { ...invitation, status: "revoked" }
            : invitation
        ),
      }));
    },
    [can, persist]
  );

  const updateMemberRole = useCallback(
    (memberId: string, role: TenantRole) => {
      if (!can("members.update")) return;

      persist((current) => ({
        ...current,
        members: current.members.map((member) =>
          member.id === memberId && member.role !== "owner"
            ? { ...member, role }
            : member
        ),
      }));
    },
    [can, persist]
  );

  const toggleMemberActive = useCallback(
    (memberId: string) => {
      if (!can("members.remove")) return;

      persist((current) => ({
        ...current,
        members: current.members.map((member) =>
          member.id === memberId && member.role !== "owner"
            ? { ...member, active: !member.active }
            : member
        ),
      }));
    },
    [can, persist]
  );

  const value = useMemo<TenantContextValue>(
    () => ({
      data,
      organizations,
      activeOrganization,
      activeMembership,
      activeMembers,
      activeInvitations,
      createNewOrganization,
      switchOrganization,
      updateOrganization,
      inviteMember,
      revokeInvitation,
      updateMemberRole,
      toggleMemberActive,
      can,
    }),
    [
      data,
      organizations,
      activeOrganization,
      activeMembership,
      activeMembers,
      activeInvitations,
      createNewOrganization,
      switchOrganization,
      updateOrganization,
      inviteMember,
      revokeInvitation,
      updateMemberRole,
      toggleMemberActive,
      can,
    ]
  );

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}
