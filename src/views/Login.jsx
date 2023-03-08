import React from 'react';
import AuthForm from '../components/AuthForm/AuthForm';

const Login = () => {
  return (
    <div className="flex flex-col space-y-5 items-center justify-center h-[80vh]">
      <h3 className="text-2xl text-center text-[#bb7c7c] font-medium my-3">
        Sign in to your account
      </h3>
      <AuthForm action="login" />
    </div>
  );
};

export default Login;
