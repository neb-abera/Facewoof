import { useState } from "react";

const AuthForm = ({ action }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form className="w-[350px] flex flex-col justify-center border border-base-300 bg-base-200 h-fit py-10 px-8 rounded-lg">
      <div className="flex flex-col">
        {action === "signup" && (
          <>
            <label htmlFor="name" className="text-base-content">
              Name
            </label>
            <input
              className="rounded-lg py-2 px-3 mb-2 mt-1 focus:outline-none"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        )}
        <label htmlFor="email" className="text-base-content">
          Email
        </label>
        <input
          className="rounded-lg py-2 px-3 mb-2 mt-1 focus:outline-none"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password" className="text-base-content">
          Password
        </label>
        <input
          className="rounded-lg py-2 px-3 mb-2 mt-1 focus:outline-none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col mt-10 space-y-4">
        <button
          type="submit"
          className="btn btn-primary normal-case text-base font-medium"
        >
          {action === "signup" ? "Create Account" : "Sign In"}
        </button>
        <button
          type="submit"
          className="btn btn-secondary normal-case text-base font-medium "
        >
          {action === "signup" ? "Sign Up" : "Sign In"} With Google
        </button>
      </div>
    </form>
  );
};

export default AuthForm;
