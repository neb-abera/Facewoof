import { useContext } from 'react';
import UserContext from '../context/user';

const useUserContext = () => {
  return useContext(UserContext);
};

export default useUserContext;
