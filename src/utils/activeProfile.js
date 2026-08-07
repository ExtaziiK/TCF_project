// The profile currently in use on this device.
//
// Held here, module-scoped, for the same reason as utils/freeMockAttempt.js:
// every progression read and write needs it (exam attempts, quiz results), and
// threading it through every service call would put a parameter on functions
// that have nothing else to do with profiles.
//
// AppProvider is the only writer. It sets this the moment a profile is chosen
// and clears it on sign-out, so a service reading it always sees the profile
// the screen is showing.
let currentId = null;

export const setActiveProfileId = (id) => { currentId = id || null; };
export const getActiveProfileId = () => currentId;
