import { useContext } from 'react';
import UserContext from '../context/user';

const useUserContext = () => useContext(UserContext);

export default useUserContext;
