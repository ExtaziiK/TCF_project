import { useCallback, useEffect, useState } from "react";
import { listProfiles, readActiveProfileId, writeActiveProfileId } from "@/services/profileService";
import { setActiveProfileId } from "@/utils/activeProfile";
import { deriveRole, ROLES } from "@/auth/rbac";

// How many profiles each plan may hold. Mirrors the device counts already sold
// on the pricing cards, and MUST agree with max_learner_profiles() in
// 20260804_learner_profiles.sql — that function is what actually enforces it;
// this one only decides whether to offer an "Ajouter" tile.
export function maxProfilesFor(user) {
  if (!user) return 1;
  if (user.admin || user.owner) return 4;
  if (deriveRole(user) !== ROLES.PREMIUM_USER) return 1;
  return user.planLabel === "VIP" ? 4 : user.planLabel === "Première classe" ? 2 : 1;
}

// Loads the account's profiles and decides whether the chooser is needed.
//
// The chooser must NOT appear for the vast majority of accounts, which have a
// single unlocked profile — that one is selected silently, so anyone on a plan
// without profiles sees no change whatsoever. It also stays out of the way on
// return visits: the last choice is remembered per device.
//
// `ready` gates rendering: until the profiles are known we cannot tell whether
// to show the app or the chooser, and flashing one then the other is worse than
// waiting a beat.
export function useProfiles(user) {
  const userId = user?.id;
  const [profiles, setProfiles] = useState([]);
  const [active, setActive] = useState(null);
  const [ready, setReady] = useState(false);

  const select = useCallback((profile) => {
    setActive(profile);
    setActiveProfileId(profile?.id || null);
    writeActiveProfileId(userId, profile?.id || null);
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) {
      setProfiles([]);
      setActive(null);
      setActiveProfileId(null);
      setReady(true);
      return;
    }
    const { ok, items } = await listProfiles();
    setProfiles(items);

    // The table is missing or unreadable (migration not applied): carry on
    // without profiles rather than trapping everyone behind an empty chooser.
    if (!ok || items.length === 0) {
      setActive(null);
      setActiveProfileId(null);
      setReady(true);
      return;
    }

    const remembered = items.find((p) => p.id === readActiveProfileId(userId));
    // A remembered profile is entered without asking for its PIN again — the
    // lock is there for someone else picking from the chooser, not to make the
    // owner retype it on every visit.
    if (remembered) select(remembered);
    else if (items.length === 1 && !items[0].locked) select(items[0]);
    else { setActive(null); setActiveProfileId(null); }
    setReady(true);
  }, [userId, select]);

  useEffect(() => { setReady(false); load(); }, [load]);

  // Back to the chooser, keeping the profiles already loaded.
  const switchProfile = useCallback(() => {
    setActive(null);
    setActiveProfileId(null);
    writeActiveProfileId(userId, null);
  }, [userId]);

  const added = useCallback((profile) => {
    setProfiles((prev) => [...prev, profile]);
    if (!profile.locked) select(profile);
  }, [select]);

  return {
    profiles,
    activeProfile: active,
    profilesReady: ready,
    // Only offer the tile when the plan allows another one; the insert policy
    // refuses anyway, but a button that always fails is a bad button.
    canAddProfile: profiles.length < maxProfilesFor(user),
    selectProfile: select,
    switchProfile,
    profileAdded: added,
    reloadProfiles: load,
  };
}
