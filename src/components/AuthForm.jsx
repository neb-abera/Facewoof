import React, { useState } from 'react';

const AuthForm = ({ action }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form className="w-2/5 flex flex-col">
      {action === 'signup' && (
        <>
          <label htmlFor="name">Name</label>
          <input type="text" value={name} className="rounded-lg" />
        </>
      )}
      <label htmlFor="email">Email</label>
      <input type="text" value={email} className="rounded-lg" />
      <label htmlFor="password">Password</label>
      <input type="password" value={password} className="rounded-lg" />
      <div className="flex flex-col">
        <button className="btn btn-primary">{action === 'signup' ? 'Create Account' : 'Sign In'}</button>
        <button className="btn btn-secondary">{action === 'signup' ? 'Sign Up' : 'Sign In'} With Google</button>
      </div>
    </form>
  );
};

export default AuthForm;
