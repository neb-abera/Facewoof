import React, { useState } from 'react';

const AuthForm = ({ action }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="flex flex-col justify-center border bg-[#737373] h-fit py-10 px-8 rounded-lg">
      <div className="flex flex-col space-y-2">
        {action === 'signup' && (
          <>
            <label htmlFor="name" className="text-gray-200">Name</label>
            <input
              className="rounded-lg py-2 px-3 focus:outline-none"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </>
        )}
        <label htmlFor="email" className="text-gray-200">Email</label>
        <input
          className="rounded-lg py-2 px-3 focus:outline-none"
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="password" className="text-gray-200">Password</label>
        <input
          className="rounded-lg py-2 px-3 focus:outline-none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col mt-10 space-y-4">
        <button className="btn btn-primary normal-case text-base font-medium">
          {action === 'signup' ? 'Create Account' : 'Sign In'}
        </button>
        <button className="btn btn-secondary normal-case text-base font-medium text-gray-500">
          {action === 'signup' ? 'Sign Up' : 'Sign In'} With Google
        </button>
      </div>
    </form>
  );
};

export default AuthForm;
