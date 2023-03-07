import React, { useEffect, useRef } from 'react';
import OktaSignIn from '@okta/okta-signin-widget';
import '../components/oktaWidget/css/okta-sign-in.min.css';
import { oktaConfig } from '../../oktaConfig';

const OktaSignInWidget = ({ onSuccess, onError }) => {
  const widgetRef = useRef();
  useEffect(() => {
    if (!widgetRef.current) {
      return false;
    }

    const widget = new OktaSignIn(oktaConfig.widget);

    // Search for URL Parameters to see if a user is being routed to the application to recover password
    // eslint-disable-next-line vars-on-top, no-var, prefer-destructuring
    var searchParams = new URL(window.location.href).searchParams;
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

  return <div ref={widgetRef} />;
};

export default OktaSignInWidget;
