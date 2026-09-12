import { useContext } from "react";
import UserContext, { type UserContextValue } from "../context/user";

/* The shared user state. Throws outside a UserProvider rather than handing
 * back undefined for every field. */
const useUserContext = (): UserContextValue => {
  const value = useContext(UserContext);
  if (!value) {
    throw new Error("useUserContext must be used inside a UserProvider");
  }
  return value;
};

export default useUserContext;
