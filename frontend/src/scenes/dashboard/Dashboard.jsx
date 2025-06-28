import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import LoadingArea from '../../components/LoadingPage/LoadingArea';
import styles from './Dashboard.module.scss';
import DateDisplay from './HomePageComponents/DateDisplay/DateDisplay';
import UserTitle from './HomePageComponents/UserTitle/UserTitle';



const Dashboard = ({ name }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <UserTitle name={name} />
        <DateDisplay />
      </div>
      <div className={styles.text}>Sign in to your Amazon account securely!</div>
    </div>
  );
};

Dashboard.propTypes = {
  name: PropTypes.string,
};

export default Dashboard;
