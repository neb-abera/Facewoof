/* eslint-disable react/jsx-indent-props */
/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from 'react';
import OktaSignIn from '@okta/okta-signin-widget';
import '../oktaWidget/css/okta-sign-in.min.css';
import { oktaConfig } from '../../../oktaConfig';

const OktaSignInWidget = ({ onSuccess, onError }) => {
  const widgetRef = useRef();

  useEffect(() => {
    if (!widgetRef.current) {
      return false;
    }

    const widget = new OktaSignIn(oktaConfig.widget);

    // Search for URL Parameters to see if a user is being routed to the application to recover password
    // eslint-disable-next-line vars-on-top, no-var, prefer-destructuring
    const searchParams = new URL(window.location.href).searchParams;
    widget.otp = searchParams.get('otp');
    widget.state = searchParams.get('state');
    widget
      .showSignInToGetTokens({
        el: widgetRef.current
      })
      .then(onSuccess)
      .catch(onError);

    return () => widget.remove();
  }, [onSuccess, onError]);

  return (
    <div
      className="signin-container w-[300px] bg-[#737373] flex flex-col justify-center items-center py-5 text-white rounded-lg h-auto"
      ref={widgetRef}
    />
  );
};

export default OktaSignInWidget;
